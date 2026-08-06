import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOwnedById: vi.fn(),
  updateStatus: vi.fn(),
  findCanonicalForJob: vi.fn(),
  generateLesson: vi.fn(),
  emitGenerationEvent: vi.fn(),
}));

vi.mock("@/platform/config/server", () => ({
  getServerConfig: () => ({
    LESSON_PROVIDER: "gemini" as const,
    LESSON_MODEL_ID: "gemini-3.5-flash-lite",
  }),
}));

vi.mock("@/platform/generation/create-generation-runtime", () => ({
  createGenerationRepository: () => ({
    findOwnedById: mocks.findOwnedById,
    updateStatus: mocks.updateStatus,
  }),
}));

vi.mock("@/platform/transcript/create-transcript-runtime", () => ({
  createTranscriptRuntime: () => ({
    repository: {
      findCanonicalForJob: mocks.findCanonicalForJob,
    },
    strategy: {},
    enabled: true,
    orchestrator: {
      hasUntriedStrategy: vi.fn(),
    },
  }),
}));

vi.mock("@/platform/lesson/create-lesson-runtime", () => ({
  createGenerateLesson: () => ({
    execute: mocks.generateLesson,
  }),
}));

vi.mock("@/platform/language/create-language-runtime", () => ({
  createOriginalEnglishGate: () => ({ execute: vi.fn() }),
}));

vi.mock("@/modules/transcript/application/acquire-native-caption", () => ({
  AcquireNativeCaption: class AcquireNativeCaption {},
}));

vi.mock("@/shared/observability/generation-event", () => ({
  emitGenerationEvent: mocks.emitGenerationEvent,
}));

import { LessonGenerationFailure } from "@/modules/lesson/ports/lesson-generation-provider";

import {
  generateLessonStep,
  resolveLanguageFailureStep,
} from "./generate-lesson.steps";

const jobRef = {
  jobId: "11111111-1111-4111-8111-111111111111",
  ownerUserId: "22222222-2222-4222-8222-222222222222",
};

const job = {
  id: jobRef.jobId,
  ownerUserId: jobRef.ownerUserId,
  status: "analyzing_video",
};

describe("generateLessonStep observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findOwnedById.mockResolvedValue(job);
    mocks.findCanonicalForJob.mockResolvedValue({
      normalizedHash: "a".repeat(64),
    });
  });

  it("records that an empty allowlist ended before the provider call", async () => {
    mocks.generateLesson.mockResolvedValue({ kind: "no_permitted_segments" });

    await expect(generateLessonStep(jobRef)).resolves.toEqual({
      kind: "no_permitted_segments",
    });

    expect(mocks.emitGenerationEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        level: "info",
        jobId: jobRef.jobId,
        stage: "lesson_generation",
        action: "started",
        provider: "gemini",
        modelId: "gemini-3.5-flash-lite",
      }),
    );
    expect(mocks.emitGenerationEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        level: "info",
        action: "succeeded",
        outcome: "no_permitted_segments",
      }),
    );
  });

  it("logs only the provider error class and retryability", async () => {
    const failure = new LessonGenerationFailure(
      "sensitive provider response must not enter logs",
      true,
    );
    mocks.generateLesson.mockRejectedValue(failure);

    await expect(generateLessonStep(jobRef)).rejects.toBe(failure);

    const failedEvent = mocks.emitGenerationEvent.mock.calls.at(-1)?.[0];
    expect(failedEvent).toEqual(
      expect.objectContaining({
        level: "error",
        jobId: jobRef.jobId,
        stage: "lesson_generation",
        action: "failed",
        provider: "gemini",
        reason: "provider_failure",
        retryable: true,
        errorName: "LessonGenerationFailure",
      }),
    );
    expect(failedEvent).not.toHaveProperty("message");
    expect(JSON.stringify(failedEvent)).not.toContain("sensitive provider response");
  });
});

describe("resolveLanguageFailureStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("releases the active slot after the language step exhausts retries", async () => {
    mocks.findOwnedById.mockResolvedValue({
      ...job,
      status: "checking_language",
    });
    mocks.updateStatus.mockResolvedValue({
      ...job,
      status: "failed",
    });

    await expect(resolveLanguageFailureStep(jobRef)).resolves.toEqual({
      kind: "terminated",
    });

    expect(mocks.updateStatus).toHaveBeenCalledWith(
      jobRef.jobId,
      "failed",
      "failed",
    );
    expect(mocks.emitGenerationEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "warning",
        jobId: jobRef.jobId,
        stage: "workflow_terminalization",
        action: "succeeded",
        outcome: "terminated",
        reason: "language_check_failed",
      }),
    );
  });

  it("does not overwrite a job that another recovery path already settled", async () => {
    mocks.findOwnedById.mockResolvedValue({
      ...job,
      status: "failed",
    });

    await expect(resolveLanguageFailureStep(jobRef)).resolves.toEqual({
      kind: "already_settled",
    });

    expect(mocks.updateStatus).not.toHaveBeenCalled();
  });
});
