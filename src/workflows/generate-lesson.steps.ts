import "server-only";

import { FatalError, RetryableError } from "workflow";

import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import {
  LessonGenerationFailure,
  type LessonGenerationFailureKind,
} from "@/modules/lesson/ports/lesson-generation-provider";
import { createLanguageEligibilityRepository } from "@/platform/language/create-language-runtime";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import {
  createAuthorLearningLesson,
  createDiagnoseLearningLesson,
  learningAuthoringEnabled,
} from "@/platform/learning/create-learning-authoring-runtime";
import type { LearnerContextSnapshot } from "@/shared/contracts/lesson-v2";
import { getServerConfig } from "@/platform/config/server";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createOriginalEnglishGate } from "@/platform/language/create-language-runtime";
import { createGenerateLesson } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import {
  generationRequestedEventSchema,
  type GenerationRequestedEvent,
} from "@/shared/contracts/generation";
import { emitGenerationEvent } from "@/shared/observability/generation-event";

export type GenerationWorkflowJobRef = {
  jobId: string;
  ownerUserId: string;
};

function createStepRuntime() {
  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);

  return {
    generationRepository,
    transcriptRuntime,
    acquireNativeCaption: new AcquireNativeCaption(
      generationRepository,
      transcriptRuntime.repository,
      transcriptRuntime.strategy,
      transcriptRuntime.enabled,
    ),
    checkOriginalEnglish: createOriginalEnglishGate(
      generationRepository,
      transcriptRuntime.repository,
    ),
    generateLesson: createGenerateLesson(
      generationRepository,
      transcriptRuntime.repository,
    ),
  };
}

function safeErrorName(error: unknown): string {
  const name = error instanceof Error ? error.name : "UnknownError";
  return /^[A-Za-z0-9._:-]{1,80}$/.test(name) ? name : "Error";
}

export async function advanceToTranscriptAcquisition(
  event: GenerationRequestedEvent,
): Promise<GenerationWorkflowJobRef | null> {
  "use step";

  const parsed = generationRequestedEventSchema.safeParse(event);
  if (!parsed.success) {
    throw new FatalError("Generation workflow payload is invalid.");
  }

  const { generationRepository } = createStepRuntime();
  const job = await generationRepository.beginTranscriptAcquisition(
    parsed.data.jobId,
  );

  return job
    ? {
        jobId: job.id,
        ownerUserId: job.ownerUserId,
      }
    : null;
}

advanceToTranscriptAcquisition.maxRetries = 0;

export async function acquireNativeCaptionStep(
  jobRef: GenerationWorkflowJobRef,
) {
  "use step";

  const { generationRepository, acquireNativeCaption } = createStepRuntime();
  const job = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );
  if (!job) return { kind: "missing" } as const;

  const result = await acquireNativeCaption.execute(job);
  if (result.kind === "retryable_failure") {
    throw new RetryableError(`Native caption retry: ${result.reason}`, {
      retryAfter: "5s",
    });
  }

  return { kind: result.kind } as const;
}

acquireNativeCaptionStep.maxRetries = 5;

export async function checkOriginalEnglishStep(
  jobRef: GenerationWorkflowJobRef,
) {
  "use step";

  const { generationRepository, checkOriginalEnglish } = createStepRuntime();
  const latest = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );

  if (!latest) return { status: "missing" } as const;
  if (latest.status !== "checking_language") {
    return { status: latest.status } as const;
  }

  const decision = await checkOriginalEnglish.execute(latest);
  return { status: decision.status } as const;
}

checkOriginalEnglishStep.maxRetries = 5;

/**
 * Terminal outcome when the language step gives up after its retries.
 *
 * This deliberately exposes no database or provider detail to the learner. The
 * generic failed state releases the active-job slot immediately, while the
 * watchdog remains a final safety net if even this resolver cannot persist.
 */
export async function resolveLanguageFailureStep(
  jobRef: GenerationWorkflowJobRef,
) {
  "use step";

  const { generationRepository } = createStepRuntime();
  const latest = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );
  if (!latest) {
    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "workflow_terminalization",
      action: "skipped",
      provider: "workflow",
      reason: "job_missing",
    });
    return { kind: "already_settled" } as const;
  }

  if (latest.status !== "checking_language") {
    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "workflow_terminalization",
      action: "skipped",
      provider: "workflow",
      outcome: "already_settled",
      reason: "status_mismatch",
    });
    return { kind: "already_settled" } as const;
  }

  await generationRepository.updateStatus(jobRef.jobId, "failed", "failed");
  emitGenerationEvent({
    level: "warning",
    jobId: jobRef.jobId,
    stage: "workflow_terminalization",
    action: "succeeded",
    provider: "workflow",
    outcome: "terminated",
    reason: "language_check_failed",
  });
  return { kind: "terminated" } as const;
}

resolveLanguageFailureStep.maxRetries = 5;

export async function resolveTranscriptExhaustionStep(
  jobRef: GenerationWorkflowJobRef,
  languageOutcome?: string,
) {
  "use step";

  const { generationRepository, transcriptRuntime } = createStepRuntime();
  const latest = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );
  if (!latest) return { kind: "missing" } as const;

  if (await transcriptRuntime.orchestrator.hasUntriedStrategy(latest)) {
    return { kind: "strategy_remaining" } as const;
  }

  await generationRepository.markTranscriptExhausted(
    latest.id,
    latest.ownerUserId,
    languageOutcome === "insufficient_evidence"
      ? "TRANSCRIPT_EVIDENCE_TOO_WEAK"
      : "NO_USABLE_TRANSCRIPT",
  );

  return { kind: "terminated" } as const;
}

resolveTranscriptExhaustionStep.maxRetries = 5;

/**
 * Maps a provider failure to the bounded event vocabulary.
 *
 * Kept as a total map rather than a string prefix so a new failure kind cannot
 * silently log as something else — the type checker demands an entry.
 */
const PROVIDER_FAILURE_REASON: Record<
  LessonGenerationFailureKind,
  "provider_failure" | "provider_rate_limited" | "provider_truncated" |
  "provider_declined" | "provider_not_json" | "provider_schema_rejected" |
  "provider_unavailable" | "quality_rejected"
> = {
  request_failed: "provider_failure",
  rate_limited: "provider_rate_limited",
  unavailable: "provider_unavailable",
  truncated: "provider_truncated",
  declined: "provider_declined",
  not_json: "provider_not_json",
  schema_rejected: "provider_schema_rejected",
  quality_rejected: "quality_rejected",
};

export async function generateLessonStep(jobRef: GenerationWorkflowJobRef) {
  "use step";

  const config = getServerConfig();
  const provider = config.LESSON_PROVIDER;
  const providerFields =
    provider === "gemini"
      ? { provider, modelId: config.LESSON_MODEL_ID }
      : { provider };
  const { generationRepository, transcriptRuntime, generateLesson } =
    createStepRuntime();
  const latest = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );

  if (!latest) {
    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "lesson_generation",
      action: "skipped",
      provider: "workflow",
      reason: "job_missing",
    });
    return { kind: "skipped" } as const;
  }

  if (latest.status !== "analyzing_video") {
    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "lesson_generation",
      action: "skipped",
      provider: "workflow",
      reason: "status_mismatch",
    });
    return { kind: "skipped" } as const;
  }

  const transcript = await transcriptRuntime.repository.findCanonicalForJob(
    latest.ownerUserId,
    latest.id,
  );
  if (!transcript) {
    emitGenerationEvent({
      level: "warning",
      jobId: jobRef.jobId,
      stage: "lesson_generation",
      action: "skipped",
      provider: "workflow",
      reason: "transcript_missing",
    });
    return { kind: "skipped" } as const;
  }

  emitGenerationEvent({
    level: "info",
    jobId: jobRef.jobId,
    stage: "lesson_generation",
    action: "started",
    ...providerFields,
  });
  const startedAt = Date.now();

  try {
    const outcome = await generateLesson.execute(
      latest,
      transcript.normalizedHash,
    );

    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "lesson_generation",
      action: "succeeded",
      ...providerFields,
      outcome: outcome.kind,
      elapsedMs: Date.now() - startedAt,
    });

    // Only the outcome kind crosses the durable boundary. Lesson content stays
    // owner-scoped in Supabase rather than being copied into workflow history.
    return { kind: outcome.kind } as const;
  } catch (error) {
    const generationFailure =
      error instanceof LessonGenerationFailure ? error : null;

    emitGenerationEvent({
      level: "error",
      jobId: jobRef.jobId,
      stage: "lesson_generation",
      action: "failed",
      ...providerFields,
      reason: generationFailure
        ? PROVIDER_FAILURE_REASON[generationFailure.kind]
        : "unexpected_error",
      causeName: generationFailure?.causeName,
      providerStatus: generationFailure?.providerStatus,
      qualityIssues: generationFailure?.qualityIssues
        ? [...generationFailure.qualityIssues]
        : undefined,
      elapsedMs: Date.now() - startedAt,
      ...(generationFailure ? { retryable: generationFailure.retryable } : {}),
      errorName: safeErrorName(error),
    });

    throw error;
  }
}

generateLessonStep.maxRetries = 5;

/**
 * Terminal outcome when the lesson step gives up.
 *
 * Without this, a job whose model step exhausts its retries simply stops:
 * `analyzing_video` is not a terminal status, so the job keeps occupying one of
 * the learner's GENERATION_MAX_ACTIVE_JOBS slots and the progress page sits
 * there saying nothing. Two of those and the learner is locked out entirely —
 * observed on production 2026-08-06. The pg_cron watchdog is only the final
 * safety net and clears jobs idle for more than five minutes.
 */
export async function resolveLessonFailureStep(
  jobRef: GenerationWorkflowJobRef,
) {
  "use step";

  const { generationRepository } = createStepRuntime();
  const latest = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );
  if (!latest) {
    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "workflow_terminalization",
      action: "skipped",
      provider: "workflow",
      reason: "job_missing",
    });
    return { kind: "already_settled" } as const;
  }

  if (latest.status !== "analyzing_video") {
    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "workflow_terminalization",
      action: "skipped",
      provider: "workflow",
      outcome: "already_settled",
      reason: "status_mismatch",
    });
    return { kind: "already_settled" } as const;
  }

  await generationRepository.updateStatus(
    jobRef.jobId,
    "failed",
    "failed",
    "LESSON_GENERATION_FAILED",
  );
  emitGenerationEvent({
    level: "warning",
    jobId: jobRef.jobId,
    stage: "workflow_terminalization",
    action: "succeeded",
    provider: "workflow",
    outcome: "terminated",
  });
  return { kind: "terminated" } as const;
}

export async function loadFinalGenerationStateStep(
  jobRef: GenerationWorkflowJobRef,
) {
  "use step";

  const { generationRepository } = createStepRuntime();
  return (
    await generationRepository.findOwnedById(
      jobRef.jobId,
      jobRef.ownerUserId,
    )
  )?.status ?? "missing";
}

loadFinalGenerationStateStep.maxRetries = 3;

/**
 * Publishes the v2 lesson a learner actually studies.
 *
 * Additive on purpose. The v1 lesson is already saved by the time this runs, so
 * a failure here must leave the learner with the lesson they already have
 * rather than turning a working job into a failed one. Every exit is a skip.
 *
 * Off by default. Turning it on is a deliberate act — it publishes content
 * someone will study.
 */
/**
 * Everything both halves need, loaded once per step.
 *
 * A step is a fresh invocation, so neither half can hand the other anything in
 * memory. Both re-read from the database, and both refuse the same way.
 */
async function loadAuthoringContext(jobRef: GenerationWorkflowJobRef) {
  const { generationRepository, transcriptRuntime } = createStepRuntime();
  const job = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );
  if (!job) return { kind: "skipped", reason: "job_missing" } as const;

  const transcript = await transcriptRuntime.repository.findCanonicalForJob(
    job.ownerUserId,
    job.id,
  );
  if (!transcript) {
    return { kind: "skipped", reason: "transcript_missing" } as const;
  }

  const eligibility = await createLanguageEligibilityRepository(
    generationRepository,
  ).findForJob({ ownerUserId: job.ownerUserId, jobId: job.id });
  if (!eligibility || eligibility.status !== "eligible") {
    return { kind: "skipped", reason: "not_eligible" } as const;
  }

  return {
    kind: "ready",
    job,
    transcript,
    eligibility,
    generationRepository,
    transcriptRuntime,
  } as const;
}

/**
 * First half of the v2 chain: one model call, then the deterministic gate.
 *
 * Split from authoring because two model calls at roughly 25 seconds each
 * overrun a workflow step. Production showed exactly that: the combined step
 * logged that it started and then nothing at all — the invocation was killed
 * about thirty seconds in, before any error handler could run. A failure nobody
 * can see cannot be fixed, so the work had to get smaller rather than the
 * timeouts larger.
 */
export async function diagnoseLearningLessonStep(
  jobRef: GenerationWorkflowJobRef,
) {
  "use step";

  if (!learningAuthoringEnabled()) {
    return { kind: "skipped", reason: "disabled" } as const;
  }

  const loaded = await loadAuthoringContext(jobRef);
  if (loaded.kind !== "ready") return loaded;

  emitGenerationEvent({
    level: "info",
    jobId: jobRef.jobId,
    stage: "learning_authoring",
    action: "started",
    provider: "workflow",
  });
  const startedAt = Date.now();

  try {
    await createDiagnoseLearningLesson().execute({
      jobId: loaded.job.id,
      ownerUserId: loaded.job.ownerUserId,
      videoTitle: loaded.job.videoTitle,
      channelName: loaded.job.channelName,
      transcript: loaded.transcript,
      eligibility: loaded.eligibility,
      learnerSnapshot: defaultLearnerSnapshot(loaded.job.cefrLevel),
      now: new Date(),
    });

    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "learning_authoring",
      action: "succeeded",
      provider: "workflow",
      outcome: "diagnosed",
      elapsedMs: Date.now() - startedAt,
    });
    return { kind: "diagnosed" } as const;
  } catch {
    emitGenerationEvent({
      level: "warning",
      jobId: jobRef.jobId,
      stage: "learning_authoring",
      action: "failed",
      provider: "workflow",
      reason: "provider_failure",
      elapsedMs: Date.now() - startedAt,
    });
    return { kind: "skipped", reason: "diagnosis_failed" } as const;
  }
}

/**
 * Second half: one model call, then publish.
 *
 * Additive on purpose. The v1 lesson is already saved by the time this runs, so
 * a failure here must leave the learner with the lesson they already have
 * rather than turning a working job into a failed one. Every exit is a skip.
 */
export async function authorLearningLessonStep(
  jobRef: GenerationWorkflowJobRef,
) {
  "use step";

  if (!learningAuthoringEnabled()) {
    return { kind: "skipped", reason: "disabled" } as const;
  }

  const loaded = await loadAuthoringContext(jobRef);
  if (loaded.kind !== "ready") return loaded;

  const lesson = await createLessonRepository(
    loaded.generationRepository,
    loaded.transcriptRuntime.repository,
  ).findOwnedByJobId(loaded.job.id, loaded.job.ownerUserId);
  if (!lesson) return { kind: "skipped", reason: "lesson_missing" } as const;

  emitGenerationEvent({
    level: "info",
    jobId: jobRef.jobId,
    stage: "learning_authoring",
    action: "started",
    provider: "workflow",
    outcome: "authoring",
  });
  const startedAt = Date.now();

  try {
    const result = await createAuthorLearningLesson().execute({
      jobId: loaded.job.id,
      lessonId: lesson.id,
      ownerUserId: loaded.job.ownerUserId,
      videoTitle: loaded.job.videoTitle,
      channelName: loaded.job.channelName,
      transcript: loaded.transcript,
      eligibility: loaded.eligibility,
      learnerSnapshot: defaultLearnerSnapshot(loaded.job.cefrLevel),
      blueprintId: crypto.randomUUID(),
      now: new Date(),
    });

    emitGenerationEvent({
      level: "info",
      jobId: jobRef.jobId,
      stage: "learning_authoring",
      action: "succeeded",
      provider: "workflow",
      outcome: result.created ? "published" : "already_published",
      elapsedMs: Date.now() - startedAt,
    });
    return { kind: "published", created: result.created } as const;
  } catch {
    // Logged, not rethrown. The learner keeps the v1 lesson; losing the v2 one
    // is a degraded result, not a failed job.
    emitGenerationEvent({
      level: "warning",
      jobId: jobRef.jobId,
      stage: "learning_authoring",
      action: "failed",
      provider: "workflow",
      reason: "provider_failure",
      elapsedMs: Date.now() - startedAt,
    });
    return { kind: "skipped", reason: "authoring_failed" } as const;
  }
}

/**
 * The learner profile the chain needs, from the only thing a job carries.
 *
 * A job knows a CEFR level and nothing else. These four values shape how long a
 * session is and how much support it opens with, so they are written here in
 * one place with their reasoning rather than scattered as literals.
 *
 * Replace this with real onboarding when there is any — gate 5.
 */
function defaultLearnerSnapshot(
  cefrLevel: LearnerContextSnapshot["targetCefr"],
): LearnerContextSnapshot {
  return {
    targetCefr: cefrLevel,
    // Communication across skills. Pronunciation is deliberately absent: the
    // product cannot measure it, and claiming it as a goal would shape lessons
    // around something no activity here assesses.
    goals: ["listening", "conversation", "comprehension", "vocabulary"],
    // Ten minutes sits mid-range of the 5–12 the product documents, and buys
    // two source windows with three language items.
    timeBudgetMinutes: 10,
    // Neutral by choice. The lexical coverage estimate already raises support
    // when a stretch of video is beyond the learner, and pinning "more support"
    // here would override that measurement with a guess.
    supportPreference: "balanced",
    knownItemKeys: [],
    weakItemKeys: [],
    recentReviewOutcomes: [],
  };
}
