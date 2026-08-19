import { describe, expect, it } from "vitest";

import {
  estimateLexicalCoverage,
  needsComprehensionSupport,
  tokenizeEnglish,
  MINIMUM_COMPREHENSION_COVERAGE,
} from "./lexical-coverage";

describe("tokenizeEnglish", () => {
  it("keeps contractions whole and drops surrounding punctuation", () => {
    expect(tokenizeEnglish("It's — kind of, you know? Don't!")).toEqual([
      "it's",
      "kind",
      "of",
      "you",
      "know",
      "don't",
    ]);
  });

  it("normalises curly apostrophes so the same word is not counted twice", () => {
    expect(tokenizeEnglish("it’s")).toEqual(tokenizeEnglish("it's"));
  });

  it("drops numerals rather than counting them as unknown vocabulary", () => {
    // A date is not a vocabulary burden. Counting "1995" as unknown would
    // understate coverage on any video that mentions a year.
    expect(tokenizeEnglish("back in 1995 we had 3 rules")).toEqual([
      "back",
      "in",
      "we",
      "had",
      "rules",
    ]);
  });
});

describe("estimateLexicalCoverage", () => {
  it("returns null for empty speech instead of a misleading zero", () => {
    // No words means no evidence, which the caller must tell apart from
    // "nothing in this video was known".
    expect(estimateLexicalCoverage([], "B1")).toBeNull();
  });

  it("counts the most frequent words as known at every level", () => {
    expect(estimateLexicalCoverage(tokenizeEnglish("the of and to a in"), "A1")).toBe(1);
  });

  it("treats a word beyond the assumed vocabulary as unknown", () => {
    // One very frequent word, one rare one.
    const coverage = estimateLexicalCoverage(
      tokenizeEnglish("the perspicacious"),
      "A1",
    );
    expect(coverage).toBe(0.5);
  });

  it("gives a higher level more credit for the same speech", () => {
    const words = tokenizeEnglish(
      "the strategy requires significant investment and consistent evaluation",
    );
    const a1 = estimateLexicalCoverage(words, "A1") ?? 0;
    const c1 = estimateLexicalCoverage(words, "C1") ?? 0;
    expect(c1).toBeGreaterThan(a1);
  });

  it("matches inflected forms back to their base word", () => {
    // Without suffix handling these read as unknown and coverage collapses on
    // ordinary speech, which is mostly inflected.
    for (const surface of ["watching", "watched", "studies", "running", "cars"]) {
      expect(estimateLexicalCoverage([surface], "A2")).toBe(1);
    }
  });

  it("does not strip a suffix down to a stub", () => {
    // "as" must not become "a" by dropping the s and then read as known for a
    // reason that has nothing to do with the learner knowing "as".
    expect(estimateLexicalCoverage(["ss"], "A1")).toBe(0);
  });
});

describe("needsComprehensionSupport", () => {
  it("asks for support below the minimum comprehension threshold", () => {
    expect(needsComprehensionSupport(MINIMUM_COMPREHENSION_COVERAGE - 0.01)).toBe(true);
  });

  it("withholds support only at or above the threshold", () => {
    expect(needsComprehensionSupport(MINIMUM_COMPREHENSION_COVERAGE)).toBe(false);
    expect(needsComprehensionSupport(0.99)).toBe(false);
  });

  it("fails safe when coverage is unknown", () => {
    // Unknown must not be read as "easy enough" — an unmeasured video gets
    // support rather than silence.
    expect(needsComprehensionSupport(null)).toBe(true);
  });
});
