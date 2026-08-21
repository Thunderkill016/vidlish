import { describe, expect, it } from "vitest";
import {
  beginnerInputBatchIsWorthAsking,
  composeBeginnerInput,
} from "./compose-beginner-input";

const known = new Set(["i", "have", "a", "the", "is", "cat"]);

describe("composeBeginnerInput", () => {
  it("keeps a sentence whose only new word is the target", () => {
    const result = composeBeginnerInput({
      target: "water",
      known,
      drafts: ["I have the water."],
      wanted: 1,
    });

    expect(result.kind).toBe("ready");
    expect(result.sentences).toEqual(["I have the water."]);
  });

  it("discards a sentence that teaches a different word than the batch", () => {
    // The gate in check-comprehensible-input passes this: exactly one new
    // word. This module exists because that is not enough.
    const result = composeBeginnerInput({
      target: "water",
      known,
      drafts: ["I have a dog."],
      wanted: 1,
    });

    expect(result.kind).toBe("insufficient");
    expect(result.sentences).toEqual([]);
    expect(result.rejected).toEqual([
      { sentence: "I have a dog.", reason: "wrong_new_word", offendingWords: ["dog"] },
    ]);
  });

  it("discards a sentence with more than one new word", () => {
    const result = composeBeginnerInput({
      target: "water",
      known,
      drafts: ["I drink cold water."],
      wanted: 1,
    });

    expect(result.rejected[0]?.reason).toBe("too_hard");
    expect(result.rejected[0]?.offendingWords).toEqual(["drink", "cold", "water"]);
  });

  it("names a sentence that teaches nothing separately from one that wanders", () => {
    const result = composeBeginnerInput({
      target: "water",
      known,
      drafts: ["I have a cat."],
      wanted: 1,
    });

    expect(result.rejected[0]?.reason).toBe("nothing_new");
  });

  it("treats sentences differing only in case or spacing as one", () => {
    const result = composeBeginnerInput({
      target: "water",
      known,
      drafts: ["I have the water.", "i  have the WATER!"],
      wanted: 2,
    });

    expect(result.kind).toBe("insufficient");
    expect(result.sentences).toHaveLength(1);
    expect(result.rejected[0]?.reason).toBe("duplicate");
  });

  it("stops once enough usable sentences are found", () => {
    const result = composeBeginnerInput({
      target: "water",
      known,
      drafts: ["I have the water.", "The water is a cat.", "A water is the cat."],
      wanted: 2,
    });

    expect(result.kind).toBe("ready");
    expect(result.sentences).toHaveLength(2);
    // The third draft is never examined, so it is neither kept nor rejected.
    expect(result.rejected).toEqual([]);
  });

  it("ignores blank drafts without counting them as rejections", () => {
    const result = composeBeginnerInput({
      target: "water",
      known,
      drafts: ["   ", "I have the water."],
      wanted: 1,
    });

    expect(result.kind).toBe("ready");
    expect(result.rejected).toEqual([]);
  });

  it("matches the target case-insensitively", () => {
    const result = composeBeginnerInput({
      target: "Water",
      known,
      drafts: ["I have the water."],
      wanted: 1,
    });

    expect(result.kind).toBe("ready");
  });
});

describe("beginnerInputBatchIsWorthAsking", () => {
  it("refuses a batch for a word the learner already produces", () => {
    expect(beginnerInputBatchIsWorthAsking({ target: "cat", known })).toBe(false);
  });

  it("allows a batch for a word the learner has never produced", () => {
    expect(beginnerInputBatchIsWorthAsking({ target: "water", known })).toBe(true);
  });
});
