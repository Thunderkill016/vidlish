import "server-only";

import { FatalError, RetryableError } from "workflow";

import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createOriginalEnglishGate } from "@/platform/language/create-language-runtime";
import { createGenerateLesson } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import {
  generationRequestedEventSchema,
  type GenerationRequestedEvent,
} from "@/shared/contracts/generation";

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

  const { generationRepository, transcriptRuntime, generateLesson } =
    createStepRuntime();
  const latest = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );

  if (!latest || latest.status !== "analyzing_video") {
    return { kind: "skipped" } as const;
  }

  const transcript = await transcriptRuntime.repository.findCanonicalForJob(
    latest.ownerUserId,
    latest.id,
  );
  if (!transcript) return { kind: "skipped" } as const;

  const outcome = await generateLesson.execute(
    latest,
    transcript.normalizedHash,
  );

  // Only the outcome kind crosses the durable boundary. Lesson content stays
  // owner-scoped in Supabase rather than being copied into workflow history.
  return { kind: outcome.kind } as const;
}

generateLessonStep.maxRetries = 5;

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
