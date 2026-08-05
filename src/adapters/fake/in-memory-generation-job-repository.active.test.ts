import { describe, expect, it } from "vitest";

import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";

const metadata = {
  videoId: "dQw4w9WgXcQ",
  metadataVersion: "fixture:v1",
  title: "V",
  channelName: "C",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  durationMs: 60_000,
  captionAvailable: true,
  declaredAudioLanguage: "en",
  availability: "playable",
} as const;

async function makeJob(
  repository: InMemoryGenerationJobRepository,
  ownerUserId: string,
  cefrLevel: "A2" | "B1" | "B2",
) {
  const { job } = await repository.createOrReuse({
    ownerUserId,
    cefrLevel,
    pipelineVersion: "generation-pipeline:v1",
    metadata,
  } as never);
  return job;
}

describe("listActiveOwned", () => {
  it("returns only jobs that are still running, newest first", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const owner = crypto.randomUUID();

    const first = await makeJob(repository, owner, "A2");
    const second = await makeJob(repository, owner, "B1");
    await repository.updateStatus(first.id, "completed", "completed", null);

    const active = await repository.listActiveOwned(owner);

    expect(active.map((job) => job.id)).toEqual([second.id]);
  });

  it("never leaks another learner's jobs", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const mine = crypto.randomUUID();
    const theirs = crypto.randomUUID();

    await makeJob(repository, theirs, "B1");

    expect(await repository.listActiveOwned(mine)).toEqual([]);
  });
});
