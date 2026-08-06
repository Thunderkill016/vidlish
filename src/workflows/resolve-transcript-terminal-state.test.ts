import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOwnedById: vi.fn(),
  markTranscriptExhausted: vi.fn(),
  emitGenerationEvent: vi.fn(),
}));

vi.mock("@/platform/generation/create-generation-runtime", () => ({
  createGenerationRepository: () => ({
    findOwnedById: mocks.findOwnedById,
    markTranscriptExhausted: mocks.markTranscriptExhausted,
  }),
}));

vi.mock("@/shared/observability/generation-event", () => ({
  emitGenerationEvent: mocks.emitGenerationEvent,
}));

import { resolveTranscriptTerminalStateStep } from "./resolve-transcript-terminal-state";

const jobRef = {
  jobId: "11111111-1111-4111-8111-111111111111",
  ownerUserId: "22222222-2222-4222-8222-222222222222",
};

describe("resolveTranscriptTerminalStateStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forces weak transcript evidence into a terminal state", async () => {
    mocks.findOwnedById.mockResolvedValue({
      id: jobRef.jobId,
      ownerUserId: jobRef.ownerUserId,
      status: "acquiring_transcript",
    });
    mocks.markTranscriptExhausted.mockResolvedValue({ status: "failed" });

    await expect(
      resolveTranscriptTerminalStateStep(
        jobRef,
        "TRANSCRIPT_EVIDENCE_TOO_WEAK",
      ),
    ).resolves.toEqual({ kind: "terminated" });

    expect(mocks.markTranscriptExhausted).toHaveBeenCalledWith(
      jobRef.jobId,
      jobRef.ownerUserId,
      "TRANSCRIPT_EVIDENCE_TOO_WEAK",
    );
  });

  it("does not overwrite a job that is already terminal", async () => {
    mocks.findOwnedById.mockResolvedValue({
      id: jobRef.jobId,
      ownerUserId: jobRef.ownerUserId,
      status: "failed",
    });

    await expect(
      resolveTranscriptTerminalStateStep(jobRef, "NO_USABLE_TRANSCRIPT"),
    ).resolves.toEqual({ kind: "already_settled" });

    expect(mocks.markTranscriptExhausted).not.toHaveBeenCalled();
  });
});
