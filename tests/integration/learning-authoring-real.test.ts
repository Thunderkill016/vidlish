import { describe, expect, it } from "vitest";

import { InMemoryLessonVersionRepository } from "@/adapters/fake/in-memory-lesson-version-repository";
import { GeminiLearningAuthoringProvider } from "@/adapters/gemini/gemini-learning-authoring-provider";
import { AuthorLearningLesson } from "@/modules/learning/application/author-learning-lesson";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";
import type { LearnerContextSnapshot } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

/**
 * The v2 authoring chain against the real model.
 *
 * Everything up to now has been proved against a fixture provider, which shows
 * the wiring is right and says nothing about whether a real model can work
 * inside these constraints. This is the first run that answers that.
 *
 * It spends Gemini quota and no Supadata credit: the transcript is real English
 * speech held here rather than fetched, because the question is what the model
 * does with real language, not whether transcript fetching works.
 */

const ready = Boolean(process.env.GEMINI_API_KEY);

const SEGMENTS = [
  "So the first thing I want to talk about is how you ask for more time at work.",
  "A lot of people just say, I need more time, and that comes across as a bit blunt.",
  "What you can do instead is give a reason first, and then make the request.",
  "For example, I'm still waiting on the numbers from finance, so could we push this to Friday?",
  "That gives the other person the context before they hear the ask.",
  "And notice I said could we push this, not can I have more time.",
  "Making it a shared problem takes the pressure off you.",
  "The other phrase that works really well here is I want to make sure I get this right.",
  "It signals that the delay is about quality, not about you being slow.",
  "Try it in your next stand-up and see how differently people respond.",
];

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
    normalizedHash: "f".repeat(64),
    normalizationVersion: "transcript-normalization:v1",
    durationMs: SEGMENTS.length * 6_000,
    segments: SEGMENTS.map((text, index) => ({
      id: `seg_${String(index).padStart(32, "0")}`,
      position: index,
      startMs: index * 6_000,
      endMs: index * 6_000 + 6_000,
      text,
      confidence: 0.99,
      detectedLanguage: "en" as const,
    })),
  };
}

function eligibility(source: CanonicalTranscript): LanguageEligibilityReport {
  const ids = source.segments.map((segment) => segment.id);
  const wordCount = SEGMENTS.join(" ").split(/\s+/).length;
  return {
    transcriptHash: source.normalizedHash,
    detectorId: "franc-min",
    detectorVersion: "franc-min:6.2.0",
    policyVersion: "original-english:v1",
    status: "eligible",
    reason: "SUFFICIENT_ORIGINAL_ENGLISH",
    englishShare: 1,
    reliableCoverage: 1,
    coherentEnglishDurationMs: source.durationMs,
    reliableEnglishWordCount: wordCount,
    reliableAnalyzedWordCount: wordCount,
    confidenceBand: "high",
    detectedLanguages: ["en"],
    windowEvidence: [
      {
        windowId: `win_${"1".repeat(24)}`,
        segmentIds: ids,
        startMs: 0,
        endMs: source.durationMs,
        wordCount,
        characterCount: SEGMENTS.join(" ").length,
        detectorCode: "eng",
        detectedLanguage: "en",
        reliability: "high",
        rawBestScore: 0.99,
        rawSecondScore: 0.2,
      },
    ],
    englishSegmentIds: ids,
    permittedSegmentIds: ids,
    excludedSegmentIds: [],
  };
}

const LEARNER: LearnerContextSnapshot = {
  targetCefr: "B1",
  goals: ["listening", "conversation", "comprehension", "vocabulary"],
  timeBudgetMinutes: 10,
  supportPreference: "balanced",
  knownItemKeys: [],
  weakItemKeys: [],
  recentReviewOutcomes: [],
};

describe.skipIf(!ready)("v2 authoring against the real model", () => {
  it(
    "turns real speech into a grounded, publishable lesson",
    { timeout: 300_000 },
    async () => {
      const source = transcript();
      const repository = new InMemoryLessonVersionRepository();
      const service = new AuthorLearningLesson(
        new GeminiLearningAuthoringProvider({
          apiKey: process.env.GEMINI_API_KEY!,
          modelId: process.env.LESSON_MODEL_ID ?? "gemini-3.5-flash-lite",
        }),
        repository,
      );

      const published: unknown[] = [];
      const originalPublish = repository.publish.bind(repository);
      repository.publish = async (input) => {
        published.push(input.blueprint);
        return originalPublish(input);
      };

      const result = await service.execute({
        jobId: "22222222-2222-4222-8222-222222222222",
        lessonId: "66666666-6666-4666-8666-666666666666",
        ownerUserId: "11111111-1111-4111-8111-111111111111",
        videoTitle: "How to ask for more time at work",
        channelName: "Integration fixture channel",
        transcript: source,
        eligibility: eligibility(source),
        learnerSnapshot: LEARNER,
        blueprintId: crypto.randomUUID(),
        now: new Date(),
      });

      const blueprint = published[0] as {
        activities: { activityType: string; phase: string }[];
        targetItems: { surfaceForm: string }[];
        evidenceCatalog: { text: string }[];
      };

      console.log(
        "cost:",
        JSON.stringify({
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          repairs: result.repairs,
          modelId: result.modelId,
        }),
      );
      console.log(
        "lesson:",
        JSON.stringify(
          {
            items: blueprint.targetItems.map((item) => item.surfaceForm),
            activities: blueprint.activities.map(
              (activity) => `${activity.phase}/${activity.activityType}`,
            ),
          },
          null,
          2,
        ),
      );

      expect(result.created).toBe(true);

      // Every taught phrase must be real speech from the transcript. This is
      // the invariant the whole design exists to hold, and the first time a
      // real model has been asked to respect it.
      const spoken = SEGMENTS.join(" ").toLowerCase();
      for (const item of blueprint.targetItems) {
        expect(spoken).toContain(item.surfaceForm.toLowerCase());
      }

      // At least one activity must ask the learner to produce language, or the
      // lesson only teaches recognition.
      expect(
        blueprint.activities.some(
          (activity) =>
            activity.activityType === "chunk_recall" ||
            activity.activityType === "guided_transfer",
        ),
      ).toBe(true);
    },
  );
});
