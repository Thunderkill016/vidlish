import { describe, expect, it } from "vitest";

import { AuthorLearningLesson } from "./author-learning-lesson";

import { FixtureLearningAuthoringProvider } from "@/adapters/fake/fixture-learning-authoring-provider";
import { InMemoryLessonVersionRepository } from "@/adapters/fake/in-memory-lesson-version-repository";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";
import type { LearnerContextSnapshot } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

const SEG_A = `seg_${"a".repeat(32)}`;
const SEG_B = `seg_${"b".repeat(32)}`;
const HASH = "f".repeat(64);
const OWNER = "11111111-1111-4111-8111-111111111111";
const JOB = "22222222-2222-4222-8222-222222222222";
const LESSON = "66666666-6666-4666-8666-666666666666";

function transcript(): CanonicalTranscript {
  return {
    videoId: "M7lc1UVf-VE",
    strategyId: "supadata-native-caption",
    provider: "supadata",
    sourceType: "native_caption",
    declaredLanguage: "en",
    availableLanguages: ["en"],
    trackKind: "manual",
    translationStatus: "original",
    normalizedHash: HASH,
    normalizationVersion: "transcript-normalization:v1",
    durationMs: 30_000,
    segments: [
      {
        id: SEG_A,
        position: 0,
        startMs: 0,
        endMs: 10_000,
        text: "today we will look at the way people ask for help at work.",
        confidence: 0.99,
        detectedLanguage: "en",
      },
      {
        id: SEG_B,
        position: 1,
        startMs: 10_000,
        endMs: 20_000,
        text: "you can also say it in a softer way when you need more time.",
        confidence: 0.99,
        detectedLanguage: "en",
      },
    ],
  };
}

function eligibility(): LanguageEligibilityReport {
  return {
    transcriptHash: HASH,
    detectorId: "franc-min",
    detectorVersion: "franc-min:6.2.0",
    policyVersion: "original-english:v1",
    status: "eligible",
    reason: "SUFFICIENT_ORIGINAL_ENGLISH",
    englishShare: 1,
    reliableCoverage: 1,
    coherentEnglishDurationMs: 20_000,
    reliableEnglishWordCount: 26,
    reliableAnalyzedWordCount: 26,
    confidenceBand: "high",
    detectedLanguages: ["en"],
    windowEvidence: [
      {
        windowId: `win_${"1".repeat(24)}`,
        segmentIds: [SEG_A, SEG_B],
        startMs: 0,
        endMs: 20_000,
        wordCount: 26,
        characterCount: 120,
        detectorCode: "eng",
        detectedLanguage: "en",
        reliability: "high",
        rawBestScore: 0.99,
        rawSecondScore: 0.2,
      },
    ],
    englishSegmentIds: [SEG_A, SEG_B],
    permittedSegmentIds: [SEG_A, SEG_B],
    excludedSegmentIds: [],
  };
}

function learnerSnapshot(): LearnerContextSnapshot {
  return {
    targetCefr: "B1",
    goals: ["listening"],
    timeBudgetMinutes: 5,
    supportPreference: "balanced",
    knownItemKeys: [],
    weakItemKeys: [],
    recentReviewOutcomes: [],
  };
}

function input() {
  return {
    jobId: JOB,
    lessonId: LESSON,
    ownerUserId: OWNER,
    videoTitle: "Asking for help at work",
    channelName: "Fixture channel",
    transcript: transcript(),
    eligibility: eligibility(),
    learnerSnapshot: learnerSnapshot(),
    blueprintId: "33333333-3333-4333-8333-333333333333",
    now: new Date("2026-08-19T09:00:00.000Z"),
  };
}

function service() {
  const repository = new InMemoryLessonVersionRepository();
  return {
    repository,
    service: new AuthorLearningLesson(
      new FixtureLearningAuthoringProvider(),
      repository,
    ),
  };
}

describe("AuthorLearningLesson", () => {
  it("publishes a lesson version a learner can study", async () => {
    // The whole point of gate 0: before this chain existed, no learner could
    // ever own a v2 lesson, so none of the v2 stack was reachable for them.
    const { service: subject } = service();
    const result = await subject.execute(input());

    expect(result.created).toBe(true);
    expect(result.lessonVersionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.modelId).toBe("fixture-authoring-model");
  });

  it("is idempotent for a lesson that already has a version", async () => {
    // A retried job must not replace a blueprint a learner may already have
    // started a session on.
    const { service: subject } = service();
    const first = await subject.execute(input());
    const second = await subject.execute(input());

    expect(second.created).toBe(false);
    expect(second.lessonVersionId).toBe(first.lessonVersionId);
  });

  it("counts the tokens of both model calls, not just the second", async () => {
    // Diagnosis reads the whole permitted transcript and is usually the larger
    // half; reporting only authoring would understate what a lesson costs.
    const provider = new FixtureLearningAuthoringProvider();
    const diagnose = provider.diagnose.bind(provider);
    const author = provider.author.bind(provider);
    const counted = {
      modelId: provider.modelId,
      diagnose: async (arg: Parameters<typeof diagnose>[0]) => ({
        ...(await diagnose(arg)),
        inputTokens: 700,
        outputTokens: 40,
      }),
      author: async (arg: Parameters<typeof author>[0]) => ({
        ...(await author(arg)),
        inputTokens: 120,
        outputTokens: 300,
      }),
    };

    const repository = new InMemoryLessonVersionRepository();
    const result = await new AuthorLearningLesson(
      counted,
      repository,
    ).execute(input());

    expect(result.inputTokens).toBe(820);
    expect(result.outputTokens).toBe(340);
  });

  it("stops when diagnosis abstains instead of building a lesson from nothing", async () => {
    // A transcript with no teachable run of words must not become a lesson.
    const empty = transcript();
    empty.segments = empty.segments.map((segment) => ({
      ...segment,
      // Không đoạn nào có nổi ba từ liền nhau để thành một cụm dạy được.
      text: "Right!",
    }));

    const { service: subject } = service();
    await expect(
      subject.execute({ ...input(), transcript: empty }),
    ).rejects.toThrow(/abstain/i);
  });

  it("never publishes a blueprint quoting speech outside the permitted set", async () => {
    // The language gate excluded the second segment, so nothing in the
    // published blueprint may cite it.
    const narrowed = eligibility();
    const { service: subject, repository } = service();
    const published: string[] = [];
    const originalPublish = repository.publish.bind(repository);
    repository.publish = async (publishInput) => {
      published.push(
        ...publishInput.blueprint.evidenceCatalog.map((item) => item.segmentId),
      );
      return originalPublish(publishInput);
    };

    await subject.execute({
      ...input(),
      eligibility: {
        ...narrowed,
        permittedSegmentIds: [SEG_A],
        excludedSegmentIds: [SEG_B],
      },
    });

    expect(published).toContain(SEG_A);
    expect(published).not.toContain(SEG_B);
  });
});
