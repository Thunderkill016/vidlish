import { describe, expect, it } from "vitest";

import {
  analyzeEnglishLearningSignals,
  renderEnglishLearningSignals,
} from "@/modules/language/application/analyze-english-learning-signals";

describe("analyzeEnglishLearningSignals", () => {
  it("derives stable transcript-only signals without assigning a CEFR level", () => {
    const result = analyzeEnglishLearningSignals([
      {
        text: "Actually, I don't think that's difficult. However, we should try again.",
        startMs: 1_000,
        endMs: 6_000,
      },
      {
        text: "Why? Because practice matters.",
        startMs: 6_000,
        endMs: 11_000,
      },
    ]);

    expect(result).toMatchObject({
      sentenceCount: 4,
      contractionCount: 2,
      questionCount: 1,
      discourseMarkerHits: 3,
      durationMs: 10_000,
    });
    expect(result.wordCount).toBeGreaterThan(10);
    expect(result.uniqueWordCount).toBeLessThanOrEqual(result.wordCount);
    expect(result.lexicalDiversity).toBeGreaterThan(0);
    expect(result.longWordShare).toBeGreaterThanOrEqual(0);
    expect(result.speechRateWpm).toBeGreaterThan(0);
    expect(Object.keys(result)).not.toContain("cefrLevel");
  });

  it("handles empty content without NaN or Infinity", () => {
    const result = analyzeEnglishLearningSignals([]);
    expect(result.wordCount).toBe(0);
    expect(result.lexicalDiversity).toBe(0);
    expect(result.longWordShare).toBe(0);
    expect(result.speechRateWpm).toBeNull();
    expect(renderEnglishLearningSignals(result)).not.toMatch(/NaN|Infinity/);
  });
});
