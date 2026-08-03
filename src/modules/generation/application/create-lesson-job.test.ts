import { describe, expect, it, vi } from "vitest";

import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InlineGenerationDispatcher } from "@/adapters/fake/inline-generation-dispatcher";
import { CreateLessonJob } from "@/modules/generation/application/create-lesson-job";
import { GenerationPolicy } from "@/modules/generation/application/generation-policy";
import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import type { VideoMetadataProvider } from "@/modules/video/ports/video-metadata-provider";
import type { PlayableVideoMetadata } from "@/shared/contracts/video";

function metadata(videoId: string): PlayableVideoMetadata {
  return {
    videoId,
    title: `Video ${videoId}`,
    channelName: "Vidlish Test Channel",
    metadataVersion: `fixture:${videoId}`,
    availability: "playable",
    durationMs: 120_000,
  };
}

function policy(maxActiveJobs = 2) {
  return new GenerationPolicy({
    maxActiveJobs,
    maxJobsPerDay: 20,
    maxJobsPerMinute: 3,
  });
}

describe("CreateLessonJob", () => {
  it("returns the same active job for duplicate submits without re-calling metadata", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const lookup = vi.fn(async (videoId: string) => metadata(videoId));
    const provider: VideoMetadataProvider = { lookup };
    const useCase = new CreateLessonJob(
      repository,
      provider,
      new InlineGenerationDispatcher(repository),
      policy(),
    );
    const input = {
      videoId: "dQw4w9WgXcQ",
      cefrLevel: "B1" as const,
      metadataVersion: "fixture:dQw4w9WgXcQ",
    };

    const first = await useCase.execute("fake-owner", input);
    const second = await useCase.execute("fake-owner", input);

    expect(first.reused).toBe(false);
    expect(second).toEqual({ jobId: first.jobId, reused: true });
    expect(lookup).toHaveBeenCalledTimes(1);
    const job = await repository.findOwnedById(first.jobId, "fake-owner");
    expect(job?.status).toBe("acquiring_transcript");
    expect(job?.dispatchStatus).toBe("sent");
    expect(await repository.findOwnedById(first.jobId, "other-owner")).toBeNull();
  });

  it("collapses concurrent create calls into one active job", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const useCase = new CreateLessonJob(
      repository,
      { lookup: async (videoId) => metadata(videoId) },
      new InlineGenerationDispatcher(repository),
      policy(),
    );
    const input = {
      videoId: "dQw4w9WgXcQ",
      cefrLevel: "B2" as const,
      metadataVersion: "fixture:v1",
    };

    const results = await Promise.all([
      useCase.execute("fake-owner", input),
      useCase.execute("fake-owner", input),
    ]);

    expect(new Set(results.map((result) => result.jobId)).size).toBe(1);
    expect(results.filter((result) => result.reused)).toHaveLength(1);
    expect(results.filter((result) => !result.reused)).toHaveLength(1);
  });

  it("applies active-job policy only to genuinely new work", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const provider: VideoMetadataProvider = {
      lookup: async (videoId) => metadata(videoId),
    };
    const useCase = new CreateLessonJob(
      repository,
      provider,
      new InlineGenerationDispatcher(repository),
      policy(1),
    );

    await useCase.execute("fake-owner", {
      videoId: "dQw4w9WgXcQ",
      cefrLevel: "B1",
      metadataVersion: "fixture:one",
    });

    await expect(
      useCase.execute("fake-owner", {
        videoId: "abcdefghijk",
        cefrLevel: "B1",
        metadataVersion: "fixture:two",
      }),
    ).rejects.toMatchObject({ code: "JOB_CONCURRENCY_LIMIT" });
  });

  it("keeps a committed queued job retryable when dispatch fails", async () => {
    const repository = new InMemoryGenerationJobRepository();
    const failingDispatcher: GenerationDispatcher = {
      sendRequested: async () => {
        throw new Error("fixture dispatch outage");
      },
    };
    const useCase = new CreateLessonJob(
      repository,
      { lookup: async (videoId) => metadata(videoId) },
      failingDispatcher,
      policy(),
    );

    const result = await useCase.execute("fake-owner", {
      videoId: "dQw4w9WgXcQ",
      cefrLevel: "A2",
      metadataVersion: "fixture:v1",
    });
    const job = await repository.findOwnedById(result.jobId, "fake-owner");
    expect(job?.status).toBe("queued");
    expect(job?.dispatchStatus).toBe("failed");
  });
});
