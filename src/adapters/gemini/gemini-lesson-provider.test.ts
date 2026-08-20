import { describe, expect, it } from "vitest";

import {
  resolveSegmentLabels,
  segmentLabel,
} from "@/adapters/gemini/gemini-lesson-provider";
import { LessonGenerationFailure } from "@/modules/lesson/ports/lesson-generation-provider";

const permitted = [
  { id: `seg_${"a".repeat(32)}`, startMs: 0, endMs: 1000, text: "one" },
  { id: `seg_${"b".repeat(32)}`, startMs: 1000, endMs: 2000, text: "two" },
  { id: `seg_${"c".repeat(32)}`, startMs: 2000, endMs: 3000, text: "three" },
];

describe("resolveSegmentLabels", () => {
  it("maps the labels the transcript showed back to real segment ids", () => {
    const draft = {
      vocabulary: [{ sourceSegmentIds: ["S1", "S3"] }],
      phrases: [{ sourceSegmentIds: ["S2"] }],
    };

    resolveSegmentLabels(draft, permitted);

    expect(draft.vocabulary[0].sourceSegmentIds).toEqual([
      permitted[0].id,
      permitted[2].id,
    ]);
    expect(draft.phrases[0].sourceSegmentIds).toEqual([permitted[1].id]);
  });

  it("still understands a model that echoes the raw id instead of the label", () => {
    // The prefix is the exact thing gemini-3.5-flash-lite dropped on the first
    // live run, so both spellings have to resolve.
    const draft = {
      vocabulary: [
        { sourceSegmentIds: [permitted[0].id] },
        { sourceSegmentIds: ["b".repeat(32)] },
        { sourceSegmentIds: [2] },
      ],
    };

    resolveSegmentLabels(draft, permitted);

    expect(draft.vocabulary.map((item) => item.sourceSegmentIds)).toEqual([
      [permitted[0].id],
      [permitted[1].id],
      [permitted[1].id],
    ]);
  });

  it("is case and whitespace tolerant", () => {
    const draft = { clozeItems: [{ sourceSegmentIds: [" s2 "] }] };
    resolveSegmentLabels(draft, permitted);
    expect(draft.clozeItems[0].sourceSegmentIds).toEqual([permitted[1].id]);
  });

  it("rejects a label that does not exist rather than guessing", () => {
    const draft = { vocabulary: [{ sourceSegmentIds: ["S9"] }] };

    expect(() => resolveSegmentLabels(draft, permitted)).toThrow(
      LessonGenerationFailure,
    );
    expect(() => resolveSegmentLabels(draft, permitted)).toThrow(/S9/);
  });

  it("reports the failure as retryable, since another sample may cite correctly", () => {
    try {
      resolveSegmentLabels({ vocabulary: [{ sourceSegmentIds: ["nope"] }] }, permitted);
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(LessonGenerationFailure);
      expect((error as LessonGenerationFailure).retryable).toBe(true);
    }
  });

  it("leaves a draft with no citations untouched", () => {
    const draft = { titleVi: "x", vocabulary: [] };
    expect(() => resolveSegmentLabels(draft, permitted)).not.toThrow();
    expect(draft).toEqual({ titleVi: "x", vocabulary: [] });
  });
});

describe("segmentLabel", () => {
  it("is one-based, so the first transcript line reads S1", () => {
    expect(segmentLabel(0)).toBe("S1");
    expect(segmentLabel(11)).toBe("S12");
  });
});

describe("provider failure kinds", () => {
  /**
   * `provider_failure` alone is unreadable in production: a rate limit, a
   * truncated answer and a rejected schema look identical, and they need three
   * different responses. These assertions pin each shape to its own kind.
   */
  it("names a rate limit as one", async () => {
    const error = new LessonGenerationFailure("boom 429 RESOURCE_EXHAUSTED", true, {
      kind: "rate_limited",
    });
    expect(error.kind).toBe("rate_limited");
    expect(error.retryable).toBe(true);
  });

  it("defaults to request_failed rather than guessing", async () => {
    // An unclassified failure must not borrow another kind's meaning.
    expect(new LessonGenerationFailure("x", true).kind).toBe("request_failed");
  });
});
