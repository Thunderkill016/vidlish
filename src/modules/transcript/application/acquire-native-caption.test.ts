import { describe, expect, it } from "vitest";

import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InMemoryTranscriptRepository } from "@/adapters/fake/in-memory-transcript-repository";
import { FixtureNativeCaptionStrategy } from "@/adapters/fake/fixture-native-caption-strategy";
import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import { GENERATION_PIPELINE_VERSION } from "@/shared/contracts/generation";

async function createJob(videoId: string) {
  const generationRepository = new InMemoryGenerationJobRepository();
  const result = await generationRepository.createOrReuse({
    ownerUserId: "owner-one",
    cefrLevel: "B1",
    pipelineVersion: GENERATION_PIPELINE_VERSION,
    metadata: {
      videoId,
      title: "Fixture video",
      channelName: "Fixture channel",
      metadataVersion: "fixture:v1",
      availability: "playable",
    },
  });
  const job = await generationRepository.advanceStory21(result.job.id);
  if (!job) throw new Error("Fixture job missing");
  return { generationRepository, job };
}

describe("AcquireNativeCaption", () => {
  it("persists once and advances only after the canonical transcript exists", async () => {
    const { generationRepository, job } = await createJob("dQw4w9WgXcQ");
    const transcriptRepository = new InMemoryTranscriptRepository(
      generationRepository,
    );
    const useCase = new AcquireNativeCaption(
      generationRepository,
      transcriptRepository,
      new FixtureNativeCaptionStrategy(),
      true,
    );

    const first = await useCase.execute(job);
    expect(first).toMatchObject({ kind: "persisted", created: true });
    expect(transcriptRepository.getTranscriptCount()).toBe(1);
    expect(
      (await generationRepository.findOwnedById(job.id, job.ownerUserId))?.status,
    ).toBe("checking_language");

    const latest = await generationRepository.findOwnedById(
      job.id,
      job.ownerUserId,
    );
    if (!latest) throw new Error("Fixture job missing after persistence");
    expect(await useCase.execute(latest)).toEqual({ kind: "already_advanced" });
    expect(transcriptRepository.getTranscriptCount()).toBe(1);
  });

  it("records no-caption without creating an artifact or language error", async () => {
    const { generationRepository, job } = await createJob("nocaption01");
    const transcriptRepository = new InMemoryTranscriptRepository(
      generationRepository,
    );
    const outcome = await new AcquireNativeCaption(
      generationRepository,
      transcriptRepository,
      new FixtureNativeCaptionStrategy(),
      true,
    ).execute(job);

    expect(outcome).toEqual({
      kind: "not_applicable",
      reason: "NO_USABLE_CAPTIONS",
    });
    expect(transcriptRepository.getTranscriptCount()).toBe(0);
    expect(transcriptRepository.getAttemptCount()).toBe(1);
    expect(
      (await generationRepository.findOwnedById(job.id, job.ownerUserId))?.status,
    ).toBe("acquiring_transcript");
  });

  it("rejects translated evidence before normalization and persistence", async () => {
    const { generationRepository, job } = await createJob("translated1");
    const transcriptRepository = new InMemoryTranscriptRepository(
      generationRepository,
    );
    const outcome = await new AcquireNativeCaption(
      generationRepository,
      transcriptRepository,
      new FixtureNativeCaptionStrategy(),
      true,
    ).execute(job);

    expect(outcome).toEqual({
      kind: "not_applicable",
      reason: "TRANSLATED_CAPTION_REJECTED",
    });
    expect(transcriptRepository.getTranscriptCount()).toBe(0);
    expect(
      (await generationRepository.findOwnedById(job.id, job.ownerUserId))?.status,
    ).toBe("acquiring_transcript");
  });

  it("returns retryable failures for the durable workflow to retry", async () => {
    const { generationRepository, job } = await createJob("dQw4w9WgXcQ");
    const transcriptRepository = new InMemoryTranscriptRepository(
      generationRepository,
    );
    const retryingStrategy: TranscriptStrategy = {
      id: "supadata-native-caption",
      costBand: "none",
      acquire: async () => ({
        kind: "retryable_failure",
        reason: "PROVIDER_UNAVAILABLE",
      }),
    };
    const outcome = await new AcquireNativeCaption(
      generationRepository,
      transcriptRepository,
      retryingStrategy,
      true,
    ).execute(job);

    expect(outcome).toEqual({
      kind: "retryable_failure",
      reason: "PROVIDER_UNAVAILABLE",
    });
    expect(transcriptRepository.getAttemptCount()).toBe(1);
    expect(
      (await generationRepository.findOwnedById(job.id, job.ownerUserId))?.status,
    ).toBe("acquiring_transcript");
  });
});
