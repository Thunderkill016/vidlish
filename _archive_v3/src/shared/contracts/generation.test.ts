import { describe, expect, it } from "vitest";

import {
  GENERATION_PIPELINE_VERSION,
  generationJobSchema,
  generationJobStatusSchema,
  generationRequestedEventId,
  publicGenerationJobSchema,
  toLearnerGenerationPhase,
} from "@/shared/contracts/generation";

describe("generation contracts", () => {
  it("keeps checking_language after normalization and before analysis", () => {
    const states = generationJobStatusSchema.options;
    expect(states.indexOf("normalizing_transcript")).toBeLessThan(
      states.indexOf("checking_language"),
    );
    expect(states.indexOf("checking_language")).toBeLessThan(
      states.indexOf("analyzing_video"),
    );
  });

  it("maps persisted states to calm learner-facing phases", () => {
    expect(toLearnerGenerationPhase("queued")).toBe("preparing");
    expect(toLearnerGenerationPhase("acquiring_transcript")).toBe(
      "transcript",
    );
    expect(toLearnerGenerationPhase("checking_language")).toBe(
      "language_check",
    );
    expect(toLearnerGenerationPhase("analyzing_video")).toBe(
      "video_analysis",
    );
  });

  it("exposes only the safe language failure code in public job data", () => {
    const job = generationJobSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      ownerUserId: "owner-one",
      videoId: "dQw4w9WgXcQ",
      videoTitle: "Fixture video",
      channelName: "Fixture channel",
      cefrLevel: "B1",
      metadataVersion: "fixture:v1",
      pipelineVersion: GENERATION_PIPELINE_VERSION,
      status: "failed",
      currentStage: "checking_language",
      dispatchStatus: "sent",
      safeErrorCode: "VIDEO_LANGUAGE_UNSUPPORTED",
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:01.000Z",
    });
    const { ownerUserId, ...publicJob } = job;
    void ownerUserId;

    expect(publicGenerationJobSchema.parse(publicJob)).toMatchObject({
      status: "failed",
      safeErrorCode: "VIDEO_LANGUAGE_UNSUPPORTED",
    });
  });

  it("accepts Supabase timestamptz values with an explicit UTC offset", () => {
    const job = generationJobSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      ownerUserId: "owner-one",
      videoId: "dQw4w9WgXcQ",
      videoTitle: "Fixture video",
      channelName: "Fixture channel",
      cefrLevel: "B1",
      metadataVersion: "fixture:v1",
      pipelineVersion: GENERATION_PIPELINE_VERSION,
      status: "queued",
      currentStage: "queued",
      dispatchStatus: "pending",
      createdAt: "2026-08-05T19:26:51.411403+00:00",
      updatedAt: "2026-08-05T19:26:51.411403+00:00",
    });

    expect(job.createdAt).toBe("2026-08-05T19:26:51.411403+00:00");
    expect(job.updatedAt).toBe("2026-08-05T19:26:51.411403+00:00");
  });

  it("derives a stable opaque event id from job and pipeline version", () => {
    expect(
      generationRequestedEventId({
        jobId: "11111111-1111-4111-8111-111111111111",
        pipelineVersion: GENERATION_PIPELINE_VERSION,
      }),
    ).toBe(
      "lesson-generation:11111111-1111-4111-8111-111111111111:generation-pipeline:v1",
    );
  });
});
