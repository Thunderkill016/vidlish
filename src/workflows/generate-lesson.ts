import type { GenerationRequestedEvent } from "@/shared/contracts/generation";

import {
  acquireNativeCaptionStep,
  advanceToTranscriptAcquisition,
  authorLearningLessonStep,
  diagnoseLearningLessonStep,
  checkOriginalEnglishStep,
  generateLessonStep,
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

  let lessonOutcome: string | undefined;
  if (languageOutcome === "eligible") {
    try {
      lessonOutcome = (await generateLessonStep(jobRef)).kind;
    } catch {
      // Retries are exhausted. Leaving the job in `analyzing_video` would hold
      // one of the learner's active-job slots until the watchdog notices, and
      // tell them nothing in the meantime.
      lessonOutcome = (await resolveLessonFailureStep(jobRef)).kind;
    }
  }

  // After the v1 lesson is saved, and outside its try block on purpose. The
  // learner already has a lesson by now; losing the richer v2 one is a degraded
  // result, but letting it turn their finished job into a failure is not. The
  // step swallows its own errors too — this is the second lock on the same door.
  if (lessonOutcome === "published" || lessonOutcome === "already_published") {
    // Two steps, one model call each. Together they overran a single step's
    // budget and the invocation was killed with no error handler ever running.
    try {
      const diagnosed = await diagnoseLearningLessonStep(jobRef);
      if (diagnosed.kind === "diagnosed") {
        await authorLearningLessonStep(jobRef);
      }
    } catch {
      // Deliberately silent here: each step already emitted its own failure.
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
