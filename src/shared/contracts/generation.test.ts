import { describe, expect, it } from "vitest";

import {
  GENERATION_PIPELINE_VERSION,
  generationJobStatusSchema,
  generationRequestedEventId,
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
