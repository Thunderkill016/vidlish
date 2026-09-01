import { describe, expect, it } from "vitest";

import {
  coverageOf,
  lemmaCandidatesOf,
  readPassage,
  statusOf,
  type PassageToken,
} from "./read-passage";

const rebuild = (tokens: readonly PassageToken[]) =>
  tokens.map((token) => token.text).join("");

describe("splitting a passage a learner will read", () => {
  it("rebuilds the passage exactly, character for character", () => {
    // The renderer prints these tokens in order. If they do not reassemble into
    // the source, the learner is reading something other than what was written,
    // and nothing else on the page can be trusted either.
    for (const passage of [
      "The cat sat on the mat.",
      "  Leading space, trailing too.  ",
      "Don't — really, don't — skip this.\n\nNew paragraph!",
      "Numbers 42 and symbols @#$ survive.",
      "",
    ]) {
      expect(rebuild(readPassage(passage))).toBe(passage);
    }
  });

  it("keeps a contraction as one word", () => {
    const words = readPassage("I don't know what it's for.")
      .filter((token) => token.kind === "word")
      .map((token) => token.text);
    expect(words).toEqual(["I", "don't", "know", "what", "it's", "for"]);
  });

  it("numbers each word in reading order", () => {
    const words = readPassage("one two three").filter((t) => t.kind === "word");
    expect(words.map((token) => token.kind === "word" && token.index)).toEqual([0, 1, 2]);
  });
});

describe("finding every base form a word could be an inflection of", () => {
  const has = (word: string, base: string) =>
    lemmaCandidatesOf(word).includes(base);

  it("offers the base form for regular inflections", () => {
    expect(has("walks", "walk")).toBe(true);
    expect(has("walked", "walk")).toBe(true);
    expect(has("walking", "walk")).toBe(true);
    expect(has("boxes", "box")).toBe(true);
    expect(has("tries", "try")).toBe(true);
    expect(has("tried", "try")).toBe(true);
    expect(has("John's", "john")).toBe(true);
  });

  it("offers both repairs where English allows either", () => {
    // These three take the same suffix and undo it three different ways.
    // Nothing in the stem says which, so all of them are offered and the
    // learner's own vocabulary decides.
    expect(has("hoping", "hope")).toBe(true);
    expect(has("stopping", "stop")).toBe(true);
    expect(has("walking", "walk")).toBe(true);
  });

  it("always keeps the word as written, so a non-plural survives", () => {
    // "this" ends in s and is not a plural of "thi". Guessing a single lemma
    // stripped that s and lost the word; keeping the surface form cannot.
    for (const word of ["this", "is", "was", "bus", "his"]) {
      expect(lemmaCandidatesOf(word)).toContain(word);
    }
  });

  it("refuses to fold derivations, which is the whole point", () => {
    // A word family would credit someone who knows "nation" with all of these.
    // That unit is validated for learners with a Germanic first language, and
    // Vietnamese is not one — so counting families would inflate the single
    // number this product asks the learner to trust.
    expect(has("national", "nation")).toBe(false);
    expect(has("nationality", "nation")).toBe(false);
    expect(has("teacher", "teach")).toBe(false);
    expect(has("bigger", "big")).toBe(false);
  });
});

describe("showing a learner where they stand in a passage", () => {
  const known = new Set(["the", "cat", "sit"]);
  const learning = new Set(["mat"]);

  it("matches on the lemma, so an inflection counts", () => {
    const tokens = readPassage("The cat sits on the mat.");
    const statuses = tokens
      .filter((token) => token.kind === "word")
      .map((token) => statusOf(token, { known, learning }));
    expect(statuses).toEqual(["known", "known", "known", "new", "known", "learning"]);
  });

  it("counts coverage over words only, never punctuation", () => {
    const coverage = coverageOf(readPassage("The cat sits on the mat."), {
      known,
      learning,
    });
    expect(coverage.words).toBe(6);
    expect(coverage.known).toBe(4);
    expect(coverage.learning).toBe(1);
    expect(coverage.unknown).toBe(1);
    expect(coverage.knownShare).toBeCloseTo(4 / 6, 5);
  });

  it("reports zero rather than dividing by nothing on an empty passage", () => {
    expect(coverageOf(readPassage("...!?"), { known, learning })).toEqual({
      words: 0,
      known: 0,
      learning: 0,
      unknown: 0,
      knownShare: 0,
    });
  });
});
