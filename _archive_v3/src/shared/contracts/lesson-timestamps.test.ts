import { describe, expect, it } from "vitest";

import { lessonSchema } from "@/shared/contracts/lesson";

/**
 * A lesson row read back from Supabase. The timestamps carry an explicit UTC
 * offset, which is what `timestamptz` serializes to — a bare `.datetime()`
 * rejects them, and the rejection surfaced only as a 500 on the lesson page
 * while generation itself looked healthy.
 */
const supabaseRow = {
  id: "70d901fe-788a-4ee0-90c8-a87826691587",
  jobId: "70d901fe-788a-4ee0-90c8-a87826691587",
  videoId: "dQw4w9WgXcQ",
  videoTitle: "I Got Denied From Streamer University",
  channelName: "Test Channel",
  cefrLevel: "B1",
  draft: {
    titleVi: "t",
    topicVi: "t",
    summaryVi: "t",
    summaryEn: "t",
    estimatedLevel: "B1",
    difficultyReasonsVi: ["r"],
    vocabulary: Array.from({ length: 6 }, (_, i) => ({
      sourceSegmentIds: [`seg_${String(i).repeat(32).slice(0, 32)}`],
      term: "t", partOfSpeech: "noun", meaningVi: "m",
      definitionEn: "d", exampleEn: "e",
    })),
    phrases: Array.from({ length: 3 }, () => ({
      sourceSegmentIds: [`seg_${"a".repeat(32)}`],
      phrase: "p", kind: "idiom", meaningVi: "m", usageNoteVi: "u",
    })),
    grammarPoints: [{
      sourceSegmentIds: [`seg_${"a".repeat(32)}`],
      titleVi: "t", pattern: "p", explanationVi: "e", exampleEn: "x",
    }],
    comprehensionQuestions: Array.from({ length: 3 }, () => ({
      sourceSegmentIds: [`seg_${"a".repeat(32)}`],
      questionVi: "q", options: ["a", "b", "c", "d"],
      correctIndex: 0, explanationVi: "e",
    })),
    clozeItems: [{
      sourceSegmentIds: [`seg_${"a".repeat(32)}`],
      sentence: "a ___ b", answer: "x", hintVi: "h",
    }],
  },
  citations: [{
    segmentId: `seg_${"a".repeat(32)}`,
    startMs: 0, endMs: 1000, text: "one",
  }],
  provenance: {
    schemaVersion: "lesson:v1",
    pipelineVersion: "lesson-pipeline:v1",
    promptVersion: "lesson-prompt:v1",
    modelId: "gemini-3.5-flash-lite",
    transcriptHash: "a".repeat(64),
    inputTokens: 1,
    outputTokens: 1,
    generatedAt: "2026-08-05T20:15:34.463489+00:00",
  },
  createdAt: "2026-08-05T20:15:34.463489+00:00",
};

describe("lessonSchema against real Supabase output", () => {
  it("accepts timestamptz values with a UTC offset", () => {
    expect(() => lessonSchema.parse(supabaseRow)).not.toThrow();
  });

  it("still accepts the Z form", () => {
    expect(() =>
      lessonSchema.parse({
        ...supabaseRow,
        createdAt: "2026-08-05T20:15:34.463Z",
        provenance: { ...supabaseRow.provenance, generatedAt: "2026-08-05T20:15:34.463Z" },
      }),
    ).not.toThrow();
  });
});
