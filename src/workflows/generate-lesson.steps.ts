import "server-only";

import { FatalError, RetryableError } from "workflow";

import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import { LessonGenerationFailure } from "@/modules/lesson/ports/lesson-generation-provider";
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

export async function generateLessonStep(jobRef: GenerationWorkflowJobRef) {
  "use step";

  const config = getServerConfig();
  const provider = config.LESSON_PROVIDER;
  const providerFields =
    provider === "gemini" ? { provider, modelId: config.LESSON_MODEL_ID } : { provider };
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
      reason: generationFailure ? "provider_failure" : "unexpected_error",
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
