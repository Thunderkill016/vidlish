import { describe, expect, it } from "vitest";

import { InMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InMemoryLanguageEligibilityRepository } from "@/adapters/fake/in-memory-language-eligibility-repository";
import { InMemoryTranscriptRepository } from "@/adapters/fake/in-memory-transcript-repository";
import { CheckOriginalEnglish } from "@/modules/language/application/check-original-english";
import { defaultLanguageEligibilityPolicy } from "@/modules/language/application/default-language-policy";
import type { LanguageAnalysisPort } from "@/modules/language/ports/language-analysis-port";
import { GENERATION_PIPELINE_VERSION } from "@/shared/contracts/generation";
import {
  LANGUAGE_DETECTOR_ID,
  LANGUAGE_DETECTOR_VERSION,
  type LanguageReliabilityBand,
} from "@/shared/contracts/language-eligibility";
import { canonicalTranscriptSchema } from "@/shared/contracts/transcript";

const sourceText =
  "Careful listening helps learners follow complete ideas, notice recurring phrases, compare the speaker's rhythm, and reuse useful language in a new situation without copying the original example.";

function transcript(videoId: string) {
  const segments = Array.from({ length: 6 }, (_, index) => ({
    id: `seg_${(index + 1).toString(16).repeat(32).slice(0, 32)}`,
    position: index,
    startMs: index * 20_000,
    endMs: index * 20_000 + 19_500,
    text: sourceText,
  }));
  return canonicalTranscriptSchema.parse({
    videoId,
    strategyId: "supadata-native-caption",
    provider: "supadata",
    sourceType: "native_caption",
    declaredLanguage: "en",
    availableLanguages: ["en"],
    trackKind: "unknown",
    translationStatus: "unknown",
    normalizedHash: "b".repeat(64),
    normalizationVersion: "transcript-normalization:v1",
    durationMs: 119_500,
    segments,
  });
}

class FixedLanguageAnalyzer implements LanguageAnalysisPort {
  constructor(
    private readonly language: "en" | "vie",
    private readonly reliability: LanguageReliabilityBand,
  ) {}

  async analyze(windows: Parameters<LanguageAnalysisPort["analyze"]>[0]) {
    return {
      detectorId: LANGUAGE_DETECTOR_ID,
      detectorVersion: LANGUAGE_DETECTOR_VERSION,
      windows: windows.map((window) => ({
        windowId: window.id,
        segmentIds: window.segmentIds,
        startMs: window.startMs,
        endMs: window.endMs,
        wordCount: window.wordCount,
        characterCount: window.text.length,
        detectorCode: this.language === "en" ? "eng" : "vie",
        detectedLanguage: this.language,
        reliability: this.reliability,
      })),
    };
  }
}

async function setup() {
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
  await generationRepository.beginTranscriptAcquisition(created.job.id);

  const transcriptRepository = new InMemoryTranscriptRepository(
    generationRepository,
  );
  await transcriptRepository.persistAndAdvance({
    ownerUserId: "owner-one",
    jobId: created.job.id,
    transcript: transcript("dQw4w9WgXcQ"),
    latencyMs: 12,
  });
  const job = await generationRepository.findOwnedById(
    created.job.id,
    "owner-one",
  );
  if (!job) throw new Error("Fixture job missing");

  const eligibilityRepository = new InMemoryLanguageEligibilityRepository(
    generationRepository,
  );
  return {
    generationRepository,
    transcriptRepository,
    eligibilityRepository,
    job,
  };
}

describe("CheckOriginalEnglish", () => {
  it("commits an eligible report before unlocking video analysis", async () => {
    const context = await setup();
    const result = await new CheckOriginalEnglish(
      context.transcriptRepository,
      new FixedLanguageAnalyzer("en", "high"),
      context.eligibilityRepository,
      defaultLanguageEligibilityPolicy,
    ).execute(context.job);

    expect(result).toMatchObject({ status: "eligible", created: true });
    expect(context.eligibilityRepository.getReportCount()).toBe(1);
    expect(
      await context.generationRepository.findOwnedById(
        context.job.id,
        context.job.ownerUserId,
      ),
    ).toMatchObject({
      status: "analyzing_video",
      currentStage: "analyzing_video",
    });
  });

  it("fails closed with the canonical unsupported-language error", async () => {
    const context = await setup();
    const result = await new CheckOriginalEnglish(
      context.transcriptRepository,
      new FixedLanguageAnalyzer("vie", "high"),
      context.eligibilityRepository,
      defaultLanguageEligibilityPolicy,
    ).execute(context.job);

    expect(result.status).toBe("ineligible");
    expect(
      await context.generationRepository.findOwnedById(
        context.job.id,
        context.job.ownerUserId,
      ),
    ).toMatchObject({
      status: "failed",
      currentStage: "checking_language",
      safeErrorCode: "VIDEO_LANGUAGE_UNSUPPORTED",
    });
  });

  it("returns weak evidence to transcript acquisition without a language error", async () => {
    const context = await setup();
    const result = await new CheckOriginalEnglish(
      context.transcriptRepository,
      new FixedLanguageAnalyzer("en", "low"),
      context.eligibilityRepository,
      defaultLanguageEligibilityPolicy,
    ).execute(context.job);

    expect(result.status).toBe("insufficient_evidence");
    const job = await context.generationRepository.findOwnedById(
      context.job.id,
      context.job.ownerUserId,
    );
    expect(job).toMatchObject({
      status: "acquiring_transcript",
      currentStage: "acquiring_transcript",
    });
    expect(job).not.toHaveProperty("safeErrorCode");
  });
});
