/**
 * Compares authoring models on the same material.
 *
 * `AGENTS.md` gate 7 asks for at most three candidate authoring models and one
 * production choice made on cost per accepted lesson. This is the harness for
 * that decision, and it exists because the alternative was picking a model from
 * one sample and calling it a comparison.
 *
 * It spends provider quota on every run. Do not run it without permission for
 * that round.
 *
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   RUN_AUTHORING_BENCHMARK=1 pnpm exec vitest run tests/integration/authoring-model-benchmark.test.ts
 *   RUN_AUTHORING_BENCHMARK=1 BENCHMARK_MODELS=gemini-3.6-flash,gemini-3.5-flash-lite pnpm exec vitest run ...
 */

import { writeFileSync } from "node:fs";

import { describe, it } from "vitest";

import { InMemoryLearningAuthoringBriefRepository } from "@/adapters/fake/in-memory-learning-authoring-brief-repository";
import { InMemoryLessonVersionRepository } from "@/adapters/fake/in-memory-lesson-version-repository";
import { GeminiLearningAuthoringProvider } from "@/adapters/gemini/gemini-learning-authoring-provider";
import {
  AuthorLearningLesson,
  DiagnoseLearningLesson,
} from "@/modules/learning/application/author-learning-lesson";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";
import type { LearnerContextSnapshot } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

const DEFAULT_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
];

const RUNS_PER_PAIR = Number(process.env.BENCHMARK_RUNS ?? 2);

/**
 * Three genres, because a model that suits one kind of speech can fall apart on
 * another and a single transcript would hide that.
 */
const MATERIAL: { name: string; title: string; segments: string[] }[] = [
  {
    name: "workplace-advice",
    title: "How to ask for more time at work",
    segments: [
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
    ],
  },
  {
    name: "cooking-howto",
    title: "The one step people skip when roasting vegetables",
    segments: [
      "Everyone tells you to roast vegetables at a high heat, and that part is true.",
      "But the step people skip is drying them properly before anything else.",
      "If there is water on the surface, the vegetables steam instead of browning.",
      "So pat them down with a towel until they feel dry to the touch.",
      "Then toss them in oil, and I mean actually toss them, not just drizzle it on top.",
      "Every piece needs a thin coat or you end up with some burnt and some pale.",
      "Spread them out so they are not touching each other on the tray.",
      "Crowding the pan is the fastest way to ruin the whole thing.",
      "Give them twenty minutes before you even think about stirring.",
      "You are looking for deep brown edges, not just soft in the middle.",
    ],
  },
  {
    name: "science-explainer",
    title: "Why your phone battery drains faster in winter",
    segments: [
      "You have probably noticed your phone dying faster when it gets cold outside.",
      "That is not your imagination, and it is not the battery wearing out either.",
      "Inside the battery there is a liquid that carries charge back and forth.",
      "When the temperature drops, that liquid gets thicker and moves more slowly.",
      "So the battery cannot deliver current as quickly as the phone is asking for.",
      "The phone reads that as a low battery and shuts itself down to protect the hardware.",
      "The charge is still in there, it just cannot come out fast enough right now.",
      "That is why the phone often comes back to life once it warms up in your pocket.",
      "The damage only happens if you try to charge it while it is still freezing.",
      "So let it reach room temperature first, and then plug it in.",
    ],
  },
];

const LEARNER: LearnerContextSnapshot = {
  targetCefr: "B1",
  goals: ["listening", "conversation", "comprehension", "vocabulary"],
  timeBudgetMinutes: 10,
  supportPreference: "balanced",
  knownItemKeys: [],
  weakItemKeys: [],
  recentReviewOutcomes: [],
};

function buildTranscript(segments: string[]): CanonicalTranscript {
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
    durationMs: segments.length * 6_000,
    segments: segments.map((text, index) => ({
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

function buildEligibility(
  transcript: CanonicalTranscript,
  segments: string[],
): LanguageEligibilityReport {
  const ids = transcript.segments.map((segment) => segment.id);
  const joined = segments.join(" ");
  const wordCount = joined.split(/\s+/).length;
  return {
    transcriptHash: transcript.normalizedHash,
    detectorId: "franc-min",
    detectorVersion: "franc-min:6.2.0",
    policyVersion: "original-english:v1",
    status: "eligible",
    reason: "SUFFICIENT_ORIGINAL_ENGLISH",
    englishShare: 1,
    reliableCoverage: 1,
    coherentEnglishDurationMs: transcript.durationMs,
    reliableEnglishWordCount: wordCount,
    reliableAnalyzedWordCount: wordCount,
    confidenceBand: "high",
    detectedLanguages: ["en"],
    windowEvidence: [
      {
        windowId: `win_${"1".repeat(24)}`,
        segmentIds: ids,
        startMs: 0,
        endMs: transcript.durationMs,
        wordCount,
        characterCount: joined.length,
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

type RunResult = {
  model: string;
  material: string;
  run: number;
  ok: boolean;
  failure?: string;
  elapsedMs: number;
  inputTokens?: number;
  outputTokens?: number;
  repairs?: readonly string[];
  items?: string[];
  activities?: string[];
  /** Whether every taught phrase really occurs in the source speech. */
  grounded?: boolean;
  lesson?: unknown;
};

async function runOnce(
  model: string,
  material: (typeof MATERIAL)[number],
  run: number,
): Promise<RunResult> {
  const transcript = buildTranscript(material.segments);
  const repository = new InMemoryLessonVersionRepository();
  const captured: Record<string, unknown>[] = [];
  const originalPublish = repository.publish.bind(repository);
  repository.publish = async (input) => {
    captured.push(input.blueprint as unknown as Record<string, unknown>);
    return originalPublish(input);
  };

  const provider = new GeminiLearningAuthoringProvider({
    apiKey: process.env.GEMINI_API_KEY!,
    modelId: model,
  });
  const briefs = new InMemoryLearningAuthoringBriefRepository();
  const diagnose = new DiagnoseLearningLesson(provider, briefs);
  const service = new AuthorLearningLesson(provider, repository, briefs);

  const startedAt = Date.now();
  try {
    const chainInput = {
      jobId: "22222222-2222-4222-8222-222222222222",
      lessonId: crypto.randomUUID(),
      ownerUserId: "11111111-1111-4111-8111-111111111111",
      videoTitle: material.title,
      channelName: "Benchmark channel",
      transcript,
      eligibility: buildEligibility(transcript, material.segments),
      learnerSnapshot: LEARNER,
      blueprintId: crypto.randomUUID(),
      now: new Date(),
    };
    await diagnose.execute(chainInput);
    const result = await service.execute(chainInput);

    const blueprint = captured[0] as {
      targetItems: { surfaceForm: string }[];
      activities: { phase: string; activityType: string }[];
    };
    const spoken = material.segments.join(" ").toLowerCase();

    return {
      model,
      material: material.name,
      run,
      ok: true,
      elapsedMs: Date.now() - startedAt,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      repairs: result.repairs,
      items: blueprint.targetItems.map((item) => item.surfaceForm),
      activities: blueprint.activities.map(
        (activity) => `${activity.phase}/${activity.activityType}`,
      ),
      grounded: blueprint.targetItems.every((item) =>
        spoken.includes(item.surfaceForm.toLowerCase()),
      ),
      lesson: blueprint,
    };
  } catch (error) {
    return {
      model,
      material: material.name,
      run,
      ok: false,
      failure: error instanceof Error ? error.message : String(error),
      elapsedMs: Date.now() - startedAt,
    };
  }
}

async function main() {
  const models = process.env.BENCHMARK_MODELS
    ? process.env.BENCHMARK_MODELS.split(",").map((value) => value.trim())
    : DEFAULT_MODELS;
  const results: RunResult[] = [];

  for (const model of models) {
    for (const material of MATERIAL) {
      for (let run = 1; run <= RUNS_PER_PAIR; run += 1) {
        process.stdout.write(`${model} / ${material.name} / #${run} ... `);
        const result = await runOnce(model, material, run);
        results.push(result);
        console.log(
          result.ok
            ? `ok ${(result.elapsedMs / 1000).toFixed(1)}s, ${result.outputTokens} out, repairs=${result.repairs?.join("|")}`
            : `FAILED — ${result.failure?.slice(0, 90)}`,
        );
      }
    }
  }

  writeFileSync(
    "benchmark-authoring-results.json",
    JSON.stringify(results, null, 2),
  );

  console.log("\n=== summary ===");
  for (const model of models) {
    const runs = results.filter((result) => result.model === model);
    const ok = runs.filter((result) => result.ok);
    const clean = ok.filter((result) => result.repairs?.includes("NONE"));
    const grounded = ok.filter((result) => result.grounded);
    const avgOut = ok.length
      ? Math.round(
          ok.reduce((sum, result) => sum + (result.outputTokens ?? 0), 0) /
            ok.length,
        )
      : 0;
    const avgSec = ok.length
      ? (
          ok.reduce((sum, result) => sum + result.elapsedMs, 0) /
          ok.length /
          1000
        ).toFixed(1)
      : "—";
    console.log(
      `${model.padEnd(24)} ok ${ok.length}/${runs.length}  grounded ${grounded.length}/${ok.length}  no-repair ${clean.length}/${ok.length}  ${avgOut} out-tok  ${avgSec}s`,
    );
  }
  console.log("\nFull lessons written to benchmark-authoring-results.json");
}

/**
 * Runs through vitest because the imports use the `@/` alias and the project has
 * no standalone TypeScript runner. Opt-in: it spends provider quota, so it must
 * never run as part of the ordinary suite.
 */
describe.skipIf(!process.env.RUN_AUTHORING_BENCHMARK)(
  "authoring model benchmark",
  () => {
    it("compares models on the same material", { timeout: 3_600_000 }, main);
  },
);
