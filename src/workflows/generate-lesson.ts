import type { GenerationRequestedEvent } from "@/shared/contracts/generation";

import {
  acquireNativeCaptionStep,
  advanceToTranscriptAcquisition,
  authorLearningLessonStep,
  diagnoseLearningLessonStep,
  checkOriginalEnglishStep,
  loadFinalGenerationStateStep,
  resolveLanguageFailureStep,
  resolveLessonFailureStep,
  resolveTranscriptExhaustionStep,
} from "./generate-lesson.steps";
import { resolveTranscriptTerminalStateStep } from "./resolve-transcript-terminal-state";

export async function generateLessonWorkflow(
  event: GenerationRequestedEvent,
) {
  "use workflow";

  const jobRef = await advanceToTranscriptAcquisition(event);
  if (!jobRef) return { jobId: event.jobId, status: "missing" } as const;

  const transcriptOutcome = await acquireNativeCaptionStep(jobRef);

  let languageOutcome: string | undefined;
  if (
    transcriptOutcome.kind === "persisted" ||
    transcriptOutcome.kind === "already_advanced"
  ) {
    try {
      languageOutcome = (await checkOriginalEnglishStep(jobRef)).status;
    } catch {
      const resolution = await resolveLanguageFailureStep(jobRef);
      languageOutcome =
        resolution.kind === "terminated" ? "failed" : undefined;
    }
  }

  if (languageOutcome === "insufficient_evidence") {
    // A canonical transcript can be valid yet too short to satisfy the learning
    // evidence policy. Treating its successful strategy as "untried" leaves the
    // job in acquiring_transcript forever because this workflow has no second
    // acquisition step to execute.
    await resolveTranscriptTerminalStateStep(
      jobRef,
      "TRANSCRIPT_EVIDENCE_TOO_WEAK",
    );
  } else if (
    transcriptOutcome.kind === "not_applicable" ||
    transcriptOutcome.kind === "terminal_failure"
  ) {
    await resolveTranscriptExhaustionStep(jobRef, languageOutcome);
  }

  // The guided session is the lesson now. v1 no longer runs: it was fragile —
  // production watched a job fail six times inside its quality gate — and for a
  // long time it also stood in front of v2 as a gate.
  //
  // Two steps, one model call each. Together they overran a single step's
  // budget once and the invocation was killed with no error handler ever
  // running, which is why they stay separate.
  let lessonOutcome: string | undefined;
  if (languageOutcome === "eligible") {
    try {
      const diagnosed = await diagnoseLearningLessonStep(jobRef);
      lessonOutcome =
        diagnosed.kind === "diagnosed"
          ? (await authorLearningLessonStep(jobRef)).kind
          : diagnosed.kind;
    } catch {
      lessonOutcome = "skipped";
    }

    // Nothing else completes a job now, so a job with no blueprint has to say
    // so. It used to fall back to the v1 lesson silently; with v1 gone that
    // silence would leave the learner on a page with nothing on it, and the job
    // holding one of their active slots until a watchdog noticed.
    if (lessonOutcome !== "published" && lessonOutcome !== "already_published") {
      lessonOutcome = (await resolveLessonFailureStep(jobRef)).kind;
    }
  }

  let finalStatus = await loadFinalGenerationStateStep(jobRef);

  // Fail closed at the workflow boundary. A step can return a non-throwing
  // outcome such as `skipped`, or the workflow runtime can resume after a
  // partial execution. Either way, a completed workflow must never leave the
  // learner polling an active stage forever.
  if (finalStatus === "acquiring_transcript") {
    await resolveTranscriptTerminalStateStep(
      jobRef,
      languageOutcome === "insufficient_evidence"
        ? "TRANSCRIPT_EVIDENCE_TOO_WEAK"
        : "NO_USABLE_TRANSCRIPT",
    );
    finalStatus = await loadFinalGenerationStateStep(jobRef);
  }

  if (finalStatus === "checking_language") {
    const resolution = await resolveLanguageFailureStep(jobRef);
    languageOutcome =
      resolution.kind === "terminated" ? "failed" : languageOutcome;
    finalStatus = await loadFinalGenerationStateStep(jobRef);
  }

  if (finalStatus === "analyzing_video") {
    lessonOutcome = (await resolveLessonFailureStep(jobRef)).kind;
    finalStatus = await loadFinalGenerationStateStep(jobRef);
  }

  return {
    jobId: event.jobId,
    status: finalStatus,
    transcriptOutcome: transcriptOutcome.kind,
    ...(languageOutcome ? { languageOutcome } : {}),
    ...(lessonOutcome ? { lessonOutcome } : {}),
  };
}
