import { beforeEach, describe, expect, it, vi } from "vitest";

const steps = vi.hoisted(() => ({
  advanceToTranscriptAcquisition: vi.fn(),
  acquireNativeCaptionStep: vi.fn(),
  checkOriginalEnglishStep: vi.fn(),
  generateLessonStep: vi.fn(),
  authorLearningLessonStep: vi.fn(),
  resolveLanguageFailureStep: vi.fn(),
  resolveLessonFailureStep: vi.fn(),
  loadFinalGenerationStateStep: vi.fn(),
  resolveTranscriptExhaustionStep: vi.fn(),
  resolveTranscriptTerminalStateStep: vi.fn(),
}));

vi.mock("./generate-lesson.steps", () => ({
  advanceToTranscriptAcquisition: steps.advanceToTranscriptAcquisition,
  acquireNativeCaptionStep: steps.acquireNativeCaptionStep,
  checkOriginalEnglishStep: steps.checkOriginalEnglishStep,
  generateLessonStep: steps.generateLessonStep,
  authorLearningLessonStep: steps.authorLearningLessonStep,
  resolveLanguageFailureStep: steps.resolveLanguageFailureStep,
  resolveLessonFailureStep: steps.resolveLessonFailureStep,
  loadFinalGenerationStateStep: steps.loadFinalGenerationStateStep,
  resolveTranscriptExhaustionStep: steps.resolveTranscriptExhaustionStep,
}));

vi.mock("./resolve-transcript-terminal-state", () => ({
  resolveTranscriptTerminalStateStep:
    steps.resolveTranscriptTerminalStateStep,
}));

import { generateLessonWorkflow } from "./generate-lesson";

const event = {
  jobId: "11111111-1111-4111-8111-111111111111",
  pipelineVersion: "generation-pipeline:v1" as const,
};

const jobRef = {
  jobId: event.jobId,
  ownerUserId: "22222222-2222-4222-8222-222222222222",
};

describe("generateLessonWorkflow", () => {
  beforeEach(() => {
    steps.advanceToTranscriptAcquisition.mockResolvedValue(jobRef);
    steps.acquireNativeCaptionStep.mockResolvedValue({ kind: "persisted" });
    steps.checkOriginalEnglishStep.mockResolvedValue({ status: "eligible" });
    steps.generateLessonStep.mockResolvedValue({ kind: "published" });
    steps.authorLearningLessonStep.mockResolvedValue({ kind: "skipped" });
    steps.resolveLanguageFailureStep.mockResolvedValue({ kind: "terminated" });
    steps.resolveLessonFailureStep.mockResolvedValue({ kind: "terminated" });
    steps.loadFinalGenerationStateStep.mockResolvedValue("completed");
    steps.resolveTranscriptExhaustionStep.mockResolvedValue({ kind: "terminated" });
    steps.resolveTranscriptTerminalStateStep.mockResolvedValue({
      kind: "terminated",
    });
  });

  it("keeps a successfully completed lesson unchanged", async () => {
    const result = await generateLessonWorkflow(event);
    expect(result.status).toBe("completed");
    expect(steps.resolveLanguageFailureStep).not.toHaveBeenCalled();
    expect(steps.resolveLessonFailureStep).not.toHaveBeenCalled();
    expect(steps.resolveTranscriptTerminalStateStep).not.toHaveBeenCalled();
  });

  it("authors the v2 lesson after the v1 lesson is saved", async () => {
    await generateLessonWorkflow(event);
    expect(steps.authorLearningLessonStep).toHaveBeenCalledWith(jobRef);
  });

  it("keeps the job completed when v2 authoring fails", async () => {
    // The learner already has a lesson by this point. Losing the richer one is
    // a degraded result; turning their finished job into a failure is not.
    steps.authorLearningLessonStep.mockRejectedValue(new Error("provider down"));

    const result = await generateLessonWorkflow(event);

    expect(result.status).toBe("completed");
    expect(steps.resolveLessonFailureStep).not.toHaveBeenCalled();
  });

  it("terminalizes a short transcript that has too little learning evidence", async () => {
    steps.checkOriginalEnglishStep.mockResolvedValue({
      status: "insufficient_evidence",
    });
    steps.loadFinalGenerationStateStep.mockResolvedValue("failed");

    const result = await generateLessonWorkflow(event);

    expect(steps.resolveTranscriptTerminalStateStep).toHaveBeenCalledTimes(1);
    expect(steps.resolveTranscriptTerminalStateStep).toHaveBeenCalledWith(
      jobRef,
      "TRANSCRIPT_EVIDENCE_TOO_WEAK",
    );
    expect(steps.resolveTranscriptExhaustionStep).not.toHaveBeenCalled();
    expect(steps.generateLessonStep).not.toHaveBeenCalled();
    expect(result.status).toBe("failed");
    expect("languageOutcome" in result ? result.languageOutcome : undefined).toBe(
      "insufficient_evidence",
    );
  });

  it("fails closed when transcript routing would leave an active job behind", async () => {
    steps.acquireNativeCaptionStep.mockResolvedValue({
      kind: "terminal_failure",
    });
    steps.resolveTranscriptExhaustionStep.mockResolvedValue({
      kind: "strategy_remaining",
    });
    steps.loadFinalGenerationStateStep
      .mockResolvedValueOnce("acquiring_transcript")
      .mockResolvedValueOnce("failed");

    const result = await generateLessonWorkflow(event);

    expect(steps.resolveTranscriptExhaustionStep).toHaveBeenCalledWith(
      jobRef,
      undefined,
    );
    expect(steps.resolveTranscriptTerminalStateStep).toHaveBeenCalledWith(
      jobRef,
      "NO_USABLE_TRANSCRIPT",
    );
    expect(steps.loadFinalGenerationStateStep).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("failed");
  });

  it("terminalizes a language check after its retries are exhausted", async () => {
    steps.checkOriginalEnglishStep.mockRejectedValue(
      new Error("database contract rejected partial coverage"),
    );
    steps.loadFinalGenerationStateStep.mockResolvedValue("failed");

    const result = await generateLessonWorkflow(event);

    expect(steps.resolveLanguageFailureStep).toHaveBeenCalledTimes(1);
    expect(steps.resolveLanguageFailureStep).toHaveBeenCalledWith(jobRef);
    expect(steps.generateLessonStep).not.toHaveBeenCalled();
    expect(result.status).toBe("failed");
    expect("languageOutcome" in result ? result.languageOutcome : undefined).toBe(
      "failed",
    );
  });

  it("fails closed when the workflow would otherwise finish in checking_language", async () => {
    steps.checkOriginalEnglishStep.mockResolvedValue({
      status: "checking_language",
    });
    steps.loadFinalGenerationStateStep
      .mockResolvedValueOnce("checking_language")
      .mockResolvedValueOnce("failed");

    const result = await generateLessonWorkflow(event);

    expect(steps.resolveLanguageFailureStep).toHaveBeenCalledWith(jobRef);
    expect(steps.loadFinalGenerationStateStep).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("failed");
  });

  it("fails closed when the workflow would otherwise finish in analyzing_video", async () => {
    steps.generateLessonStep.mockResolvedValue({ kind: "skipped" });
    steps.loadFinalGenerationStateStep
      .mockResolvedValueOnce("analyzing_video")
      .mockResolvedValueOnce("failed");

    const result = await generateLessonWorkflow(event);

    expect(steps.resolveLessonFailureStep).toHaveBeenCalledWith(jobRef);
    expect(steps.loadFinalGenerationStateStep).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("failed");
    expect("lessonOutcome" in result ? result.lessonOutcome : undefined).toBe(
      "terminated",
    );
  });

  it("resolves a thrown lesson failure once and returns the terminal state", async () => {
    steps.generateLessonStep.mockRejectedValue(new Error("provider failed"));
    steps.loadFinalGenerationStateStep.mockResolvedValue("failed");

    const result = await generateLessonWorkflow(event);

    expect(steps.resolveLessonFailureStep).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("failed");
  });
});
