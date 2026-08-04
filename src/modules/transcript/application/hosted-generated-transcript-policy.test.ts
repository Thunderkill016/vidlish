import { describe, expect, it } from "vitest";

import { HostedGeneratedTranscriptPolicy } from "@/modules/transcript/application/hosted-generated-transcript-policy";
import { generationJobSchema } from "@/shared/contracts/generation";

function job(durationMs?: number) {
  return generationJobSchema.parse({
    id: "11111111-1111-4111-8111-111111111111",
    ownerUserId: "owner-one",
    videoId: "dQw4w9WgXcQ",
    videoTitle: "Fixture video",
    channelName: "Fixture channel",
    ...(durationMs !== undefined ? { durationMs } : {}),
    cefrLevel: "B1",
    metadataVersion: "fixture:v1",
    pipelineVersion: "generation-pipeline:v1",
    status: "acquiring_transcript",
    currentStage: "acquiring_transcript",
    dispatchStatus: "sent",
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:01.000Z",
  });
}

describe("HostedGeneratedTranscriptPolicy", () => {
  it("allows known duration under the configured limit", () => {
    const policy = new HostedGeneratedTranscriptPolicy({
      enabled: true,
      maxVideoDurationMs: 3_600_000,
    });
    expect(policy.evaluate(job(900_000))).toEqual({ allowed: true });
  });

  it("blocks disabled, unknown-duration and over-budget work", () => {
    expect(
      new HostedGeneratedTranscriptPolicy({
        enabled: false,
        maxVideoDurationMs: 3_600_000,
      }).evaluate(job(900_000)),
    ).toEqual({ allowed: false, reason: "STRATEGY_DISABLED" });

    const policy = new HostedGeneratedTranscriptPolicy({
      enabled: true,
      maxVideoDurationMs: 3_600_000,
    });
    expect(policy.evaluate(job())).toEqual({
      allowed: false,
      reason: "VIDEO_DURATION_UNKNOWN",
    });
    expect(policy.evaluate(job(3_600_001))).toEqual({
      allowed: false,
      reason: "VIDEO_TOO_LONG",
    });
  });
});
