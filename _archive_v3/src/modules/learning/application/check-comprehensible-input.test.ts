import { describe, expect, it } from "vitest";

import {
  checkComprehensibleInput,
  tokenise,
} from "./check-comprehensible-input";

const known = new Set(["i", "have", "a", "book", "the", "is", "red"]);

describe("checkComprehensibleInput", () => {
  it("accepts a sentence with exactly one new word", () => {
    const verdict = checkComprehensibleInput({
      sentence: "I have a red pen.",
      known,
    });

    expect(verdict).toEqual({ kind: "usable", newWords: ["pen"] });
  });

  it("refuses a sentence with more new words than the budget", () => {
    // The current beginner policy defaults to one new lexical item. This test
    // protects that fail-closed default; it does not claim two unknown words
    // are universally incomprehensible in every learning context.
    const verdict = checkComprehensibleInput({
      sentence: "I have a green pen.",
      known,
    });

    expect(verdict.kind).toBe("too_hard");
    expect(verdict).toMatchObject({ newWords: ["green", "pen"] });
  });

  it("refuses a sentence that teaches nothing", () => {
    // This generator is target-teaching infrastructure. A zero-novelty draft
    // may be valid language exposure elsewhere, but it does not introduce the
    // target this batch exists to teach.
    const verdict = checkComprehensibleInput({
      sentence: "The book is red.",
      known,
    });

    expect(verdict).toEqual({ kind: "nothing_new" });
  });

  it("counts a word repeated in one sentence once", () => {
    const verdict = checkComprehensibleInput({
      sentence: "A pen and a pen.",
      known: new Set(["a", "and"]),
    });

    expect(verdict).toEqual({ kind: "usable", newWords: ["pen"] });
  });

  it("ignores case and punctuation the learner never hears", () => {
    // "Book," and "book" are the same lexical item for this gate.
    expect(
      checkComprehensibleInput({ sentence: "  BOOK, book!  ", known }),
    ).toEqual({ kind: "nothing_new" });
  });

  it("lets the budget widen deliberately, never by accident", () => {
    // A later policy may explicitly permit two new lexical items. The default
    // stays one so widening is always a versioned product decision.
    expect(
      checkComprehensibleInput({
        sentence: "I have a green pen.",
        known,
        maxNewWords: 2,
      }),
    ).toMatchObject({ kind: "usable" });
  });
});

describe("tokenise", () => {
  it("keeps contractions whole", () => {
    // "don't" is one lexical token for this gate, not "don" and "t".
    expect(tokenise("I don't know")).toEqual(["i", "don't", "know"]);
  });

  it("drops digits and symbols rather than inventing words from them", () => {
    expect(tokenise("I have 3 books — 2 red!")).toEqual([
      "i",
      "have",
      "books",
      "red",
    ]);
  });
});
