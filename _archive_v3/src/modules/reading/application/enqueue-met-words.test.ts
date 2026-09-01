import { describe, expect, it } from "vitest";

import { readPassage } from "./read-passage";
import { countOccurrences, selectWordsToEnqueue } from "./enqueue-met-words";

const base = {
  occurrences: new Map<string, number>(),
  alreadyScheduled: new Set<string>(),
  newItemsToday: 0,
};

describe("counting how often a word appeared in what was read", () => {
  it("counts a base form once per appearance", () => {
    const counts = countOccurrences(readPassage("A program is a program. Programs run."));
    expect(counts.get("program")).toBe(2);
    expect(counts.get("programs")).toBe(1);
    expect(counts.get("run")).toBe(1);
  });

  it("ignores punctuation entirely", () => {
    expect(countOccurrences(readPassage("... !? ---")).size).toBe(0);
  });
});

describe("choosing which tapped words reach the review queue", () => {
  it("never takes on more new items than the daily ceiling", () => {
    // A long session can easily produce forty taps. Enqueueing all of them is
    // the most generous-looking way to build a review debt the learner will
    // never repay, which is why the scheduler caps intake in the first place.
    const tapped = Array.from({ length: 40 }, (_, index) => `word${index}`);
    expect(selectWordsToEnqueue({ ...base, tapped })).toHaveLength(8);
  });

  it("counts what the learner already took on today against the ceiling", () => {
    const tapped = ["alpha", "beta", "gamma", "delta"];
    expect(
      selectWordsToEnqueue({ ...base, tapped, newItemsToday: 6 }),
    ).toHaveLength(2);
    expect(
      selectWordsToEnqueue({ ...base, tapped, newItemsToday: 8 }),
    ).toEqual([]);
  });

  it("prefers the words that actually recur in the text", () => {
    // Frequency of occurrence predicted incidental learning in the studies this
    // feature rests on: a word met five times is already half-learned.
    const chosen = selectWordsToEnqueue({
      ...base,
      tapped: ["rare", "common", "middling"],
      occurrences: new Map([
        ["rare", 1],
        ["common", 9],
        ["middling", 4],
      ]),
      capacity: 2,
    });
    expect(chosen.map((word) => word.lemma)).toEqual(["common", "middling"]);
  });

  it("leaves a word already on the calendar exactly where it is", () => {
    // A tap means the learner met a word, not that they tried to recall it and
    // failed. Grading a tap would let a cautious reader wreck their own queue.
    const chosen = selectWordsToEnqueue({
      ...base,
      tapped: ["known", "fresh"],
      alreadyScheduled: new Set(["known"]),
    });
    expect(chosen.map((word) => word.lemma)).toEqual(["fresh"]);
  });

  it("takes the same word twice as one item", () => {
    const chosen = selectWordsToEnqueue({ ...base, tapped: ["same", "same", "same"] });
    expect(chosen).toHaveLength(1);
  });

  it("is deterministic when occurrences tie", () => {
    const tapped = ["delta", "alpha", "charlie", "bravo"];
    const once = selectWordsToEnqueue({ ...base, tapped, capacity: 2 });
    const twice = selectWordsToEnqueue({ ...base, tapped, capacity: 2 });
    expect(once).toEqual(twice);
    expect(once.map((word) => word.lemma)).toEqual(["alpha", "bravo"]);
  });
});
