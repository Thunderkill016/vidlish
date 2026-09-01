import { describe, expect, it } from "vitest";

import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";

const ownerUserId = "11111111-1111-4111-8111-111111111111";

async function activeJob(repository: InMemoryGenerationJobRepository) {
  const created = await repository.createOrReuse({
    ownerUserId,
    cefrLevel: "B1",
    pipelineVersion: "generation-pipeline:v1",
    metadata: {
      videoId: "xbse7sM341o",
      title: "Short video fixture",
      channelName: "Fixture channel",
      durationMs: 41_000,
      metadataVersion: "youtube-oembed:v1",
      availability: "playable",
    },
  });
  await repository.beginTranscriptAcquisition(created.job.id);
  return created.job.id;
}

describe("InMemoryGenerationJobRepository transcript terminalization", () => {
  it("distinguishes a valid but pedagogically insufficient transcript", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const jobId = await activeJob(repository);

    const failed = await repository.markTranscriptExhausted(
      jobId,
      ownerUserId,
      "TRANSCRIPT_EVIDENCE_TOO_WEAK",
    );

    expect(failed).toMatchObject({
      status: "failed",
      currentStage: "transcript_evidence_too_weak",
      safeErrorCode: "TRANSCRIPT_EVIDENCE_TOO_WEAK",
    });
  });

  it("keeps the generic failure for a transcript that could not be obtained", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const jobId = await activeJob(repository);

    const failed = await repository.markTranscriptExhausted(
      jobId,
      ownerUserId,
      "NO_USABLE_TRANSCRIPT",
    );

    expect(failed).toMatchObject({
      status: "failed",
      currentStage: "transcript_unavailable",
      safeErrorCode: "TRANSCRIPT_UNAVAILABLE",
    });
  });
});
