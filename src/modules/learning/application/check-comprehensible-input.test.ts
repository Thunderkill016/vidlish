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
    // Two unknown words is not i+1, it is i+2 — and at zero that is the
    // difference between learning a word and guessing at a fog.
    const verdict = checkComprehensibleInput({
      sentence: "I have a green pen.",
      known,
    });

    expect(verdict.kind).toBe("too_hard");
    expect(verdict).toMatchObject({ newWords: ["green", "pen"] });
  });

  it("refuses a sentence that teaches nothing", () => {
    // Comprehensible, but the learner ends where they started and there is no
    // evidence to record either way.
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
    // "Book," and "book" are the same word to someone listening.
    expect(
      checkComprehensibleInput({ sentence: "  BOOK, book!  ", known }),
    ).toEqual({ kind: "nothing_new" });
  });

  it("lets the budget widen deliberately, never by accident", () => {
    // A learner further along can take two new words. The default stays one so
    // widening is always a decision someone made.
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
    // "don't" is one word a learner meets, not "don" and "t".
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
