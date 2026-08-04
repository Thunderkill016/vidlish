import { describe, expect, it, vi } from "vitest";

import { FixtureGeneratedTranscriptStrategy } from "@/adapters/fake/fixture-generated-transcript-strategy";
import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InMemoryTranscriptRepository } from "@/adapters/fake/in-memory-transcript-repository";
import { AcquireHostedGeneratedTranscript } from "@/modules/transcript/application/acquire-hosted-generated-transcript";
import { HostedGeneratedTranscriptPolicy } from "@/modules/transcript/application/hosted-generated-transcript-policy";
import type { PollableTranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import { GENERATION_PIPELINE_VERSION } from "@/shared/contracts/generation";

async function setup(videoId = "nocaption01") {
  const generationRepository = new InMemoryGenerationJobRepository();
  const created = await generationRepository.createOrReuse({
    ownerUserId: "owner-one",
    cefrLevel: "B1",
    pipelineVersion: GENERATION_PIPELINE_VERSION,
    metadata: {
      videoId,
      title: "Fixture video",
      channelName: "Fixture channel",
      durationMs: 900_000,
      metadataVersion: "fixture:v1",
      availability: "playable",
    },
  });
  const job = await generationRepository.advanceStory21(created.job.id);
  if (!job) throw new Error("Fixture job missing");
  const transcriptRepository = new InMemoryTranscriptRepository(
    generationRepository,
  );
  return { generationRepository, transcriptRepository, job };
}

function policy(enabled = true) {
  return new HostedGeneratedTranscriptPolicy({
    enabled,
    maxVideoDurationMs: 3_600_000,
  });
}

describe("AcquireHostedGeneratedTranscript", () => {
  it("records one provider job, polls and commits the canonical transcript", async () => {
    const context = await setup();
    const strategy = new FixtureGeneratedTranscriptStrategy();
    const useCase = new AcquireHostedGeneratedTranscript(
      context.generationRepository,
      context.transcriptRepository,
      strategy,
      policy(),
    );

    const started = await useCase.start(context.job);
    expect(started).toMatchObject({
      kind: "pending",
      providerJobId: "fixture_nocaption01",
    });
    expect(
      context.transcriptRepository.getProviderJobStatus({
        ownerUserId: context.job.ownerUserId,
        jobId: context.job.id,
        strategyId: strategy.id,
        providerJobId: "fixture_nocaption01",
      }),
    ).toBe("pending");

    const firstPoll = await useCase.poll(
      context.job,
      "fixture_nocaption01",
    );
    expect(firstPoll.kind).toBe("pending");
    const completed = await useCase.poll(
      context.job,
      "fixture_nocaption01",
    );

    expect(completed).toMatchObject({ kind: "persisted", created: true });
    expect(context.transcriptRepository.getTranscriptCount()).toBe(1);
    expect(
      context.transcriptRepository.getProviderJobStatus({
        ownerUserId: context.job.ownerUserId,
        jobId: context.job.id,
        strategyId: strategy.id,
        providerJobId: "fixture_nocaption01",
      }),
    ).toBe("completed");
    expect(
      await context.generationRepository.findOwnedById(
        context.job.id,
        context.job.ownerUserId,
      ),
    ).toMatchObject({
      status: "checking_language",
      currentStage: "checking_language",
    });
  });

  it("blocks paid work before calling a provider", async () => {
    const context = await setup();
    const acquire = vi.fn(async () => ({
      kind: "pending" as const,
      providerJobId: "should-not-run",
    }));
    const strategy: PollableTranscriptStrategy = {
      id: "supadata-generated-transcript",
      costBand: "metered_medium",
      acquire,
      poll: async () => ({
        kind: "terminal_failure",
        reason: "PROVIDER_JOB_NOT_FOUND",
      }),
    };
    const outcome = await new AcquireHostedGeneratedTranscript(
      context.generationRepository,
      context.transcriptRepository,
      strategy,
      policy(false),
    ).start(context.job);

    expect(outcome).toEqual({
      kind: "not_applicable",
      reason: "GENERATED_TRANSCRIPT_POLICY_BLOCKED",
    });
    expect(acquire).not.toHaveBeenCalled();
    expect(context.transcriptRepository.getTranscriptCount()).toBe(0);
  });

  it("does not create a transcript for no-speech output", async () => {
    const context = await setup("gennospeech");
    const outcome = await new AcquireHostedGeneratedTranscript(
      context.generationRepository,
      context.transcriptRepository,
      new FixtureGeneratedTranscriptStrategy(),
      policy(),
    ).start(context.job);

    expect(outcome).toEqual({
      kind: "not_applicable",
      reason: "NO_SPEECH_DETECTED",
    });
    expect(context.transcriptRepository.getTranscriptCount()).toBe(0);
    expect(
      await context.generationRepository.findOwnedById(
        context.job.id,
        context.job.ownerUserId,
      ),
    ).toMatchObject({
      status: "acquiring_transcript",
      currentStage: "automatic_transcript_unavailable",
    });
  });

  it("marks a bounded pending job as timed out", async () => {
    const context = await setup();
    const strategy = new FixtureGeneratedTranscriptStrategy();
    const useCase = new AcquireHostedGeneratedTranscript(
      context.generationRepository,
      context.transcriptRepository,
      strategy,
      policy(),
    );
    const started = await useCase.start(context.job);
    if (started.kind !== "pending") throw new Error("Expected pending fixture");

    expect(
      await useCase.recordTimeout(context.job, started.providerJobId),
    ).toEqual({
      kind: "retryable_failure",
      reason: "PROVIDER_JOB_TIMEOUT",
    });
    expect(
      context.transcriptRepository.getProviderJobStatus({
        ownerUserId: context.job.ownerUserId,
        jobId: context.job.id,
        strategyId: strategy.id,
        providerJobId: started.providerJobId,
      }),
    ).toBe("timed_out");
  });
});
