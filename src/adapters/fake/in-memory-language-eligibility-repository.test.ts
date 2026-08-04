import { describe, expect, it } from "vitest";

import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InMemoryLanguageEligibilityRepository } from "@/adapters/fake/in-memory-language-eligibility-repository";
import { GENERATION_PIPELINE_VERSION } from "@/shared/contracts/generation";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";

const segmentId = `seg_${"1".repeat(32)}`;

function report(
  status: LanguageEligibilityReport["status"],
): LanguageEligibilityReport {
  return {
    transcriptHash: "a".repeat(64),
    detectorId: "franc-min",
    detectorVersion: "franc-min:6.2.0",
    policyVersion: "original-english:v1",
    status,
    reason:
      status === "eligible"
        ? "SUFFICIENT_ORIGINAL_ENGLISH"
        : "INSUFFICIENT_ORIGINAL_ENGLISH",
    englishShare: status === "eligible" ? 1 : 0,
    reliableCoverage: 1,
    coherentEnglishDurationMs: status === "eligible" ? 90_000 : 0,
    reliableEnglishWordCount: status === "eligible" ? 150 : 0,
    reliableAnalyzedWordCount: 150,
    confidenceBand: "high",
    detectedLanguages: status === "eligible" ? ["en"] : ["vie"],
    englishSegmentIds: status === "eligible" ? [segmentId] : [],
    permittedSegmentIds: status === "eligible" ? [segmentId] : [],
    excludedSegmentIds: status === "eligible" ? [] : [segmentId],
  };
}

describe("InMemoryLanguageEligibilityRepository", () => {
  it("does not reverse a committed decision on a contradictory retry", async () => {
    const generationRepository = new InMemoryGenerationJobRepository();
    const created = await generationRepository.createOrReuse({
      ownerUserId: "owner-one",
      cefrLevel: "B1",
      pipelineVersion: GENERATION_PIPELINE_VERSION,
      metadata: {
        videoId: "dQw4w9WgXcQ",
        title: "Fixture video",
        channelName: "Fixture channel",
        metadataVersion: "fixture:v1",
        availability: "playable",
      },
    });
    await generationRepository.updateStatus(
      created.job.id,
      "checking_language",
      "checking_language",
    );
    const repository = new InMemoryLanguageEligibilityRepository(
      generationRepository,
    );

    const first = await repository.persistDecision({
      ownerUserId: "owner-one",
      jobId: created.job.id,
      report: report("eligible"),
    });
    const retry = await repository.persistDecision({
      ownerUserId: "owner-one",
      jobId: created.job.id,
      report: report("ineligible"),
    });

    expect(first).toMatchObject({ created: true, status: "eligible" });
    expect(retry).toMatchObject({ created: false, status: "eligible" });
    expect(repository.getReportCount()).toBe(1);
    expect(
      await generationRepository.findOwnedById(created.job.id, "owner-one"),
    ).toMatchObject({ status: "analyzing_video" });
  });
});
