import { describe, expect, it } from "vitest";

import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InMemoryLanguageEligibilityRepository } from "@/adapters/fake/in-memory-language-eligibility-repository";
import { GENERATION_PIPELINE_VERSION } from "@/shared/contracts/generation";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";

const segmentId = `seg_${"1".repeat(32)}`;

function report(
  status: LanguageEligibilityReport["status"],
): LanguageEligibilityReport {
  const english = status === "eligible";
  return {
    transcriptHash: "a".repeat(64),
    detectorId: "franc-min",
    detectorVersion: "franc-min:6.2.0",
    policyVersion: "original-english:v1",
    status,
    reason: english
      ? "SUFFICIENT_ORIGINAL_ENGLISH"
      : "INSUFFICIENT_ORIGINAL_ENGLISH",
    englishShare: english ? 1 : 0,
    reliableCoverage: 1,
    coherentEnglishDurationMs: english ? 90_000 : 0,
    reliableEnglishWordCount: english ? 150 : 0,
    reliableAnalyzedWordCount: 150,
    confidenceBand: "high",
    detectedLanguages: english ? ["en"] : ["vie"],
    windowEvidence: [
      {
        windowId: `win_${"1".repeat(24)}`,
        segmentIds: [segmentId],
        startMs: 0,
        endMs: 90_000,
        wordCount: 150,
        characterCount: 900,
        detectorCode: english ? "eng" : "vie",
        detectedLanguage: english ? "en" : "vie",
        reliability: "high",
        rawBestScore: 1,
        rawSecondScore: 0.5,
      },
    ],
    englishSegmentIds: english ? [segmentId] : [],
    permittedSegmentIds: english ? [segmentId] : [],
    excludedSegmentIds: english ? [] : [segmentId],
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

  it("reads back the decision the authoring chain has to enforce", async () => {
    // Until this existed the allowlist could only be written. Nothing
    // downstream could ask which segments a lesson is allowed to quote, which
    // is the whole basis of grounding.
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
    await repository.persistDecision({
      ownerUserId: "owner-one",
      jobId: created.job.id,
      report: report("eligible"),
    });

    const found = await repository.findForJob({
      ownerUserId: "owner-one",
      jobId: created.job.id,
    });
    expect(found?.permittedSegmentIds).toEqual(
      report("eligible").permittedSegmentIds,
    );
  });

  it("returns nothing for another owner's job", async () => {
    // The report names which speech may be quoted; handing it to the wrong
    // owner leaks one learner's source material into another's lesson.
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
    await repository.persistDecision({
      ownerUserId: "owner-one",
      jobId: created.job.id,
      report: report("eligible"),
    });

    expect(
      await repository.findForJob({
        ownerUserId: "owner-two",
        jobId: created.job.id,
      }),
    ).toBeNull();
  });
});
