import { describe, expect, it } from "vitest";

import catalogue from "@/adapters/vocabulary/cefrj-a1-a2.json";
import {
  compareTeachingOrder,
  selectNextVocabulary,
  type VocabularyEntry,
} from "./select-next-vocabulary";

const entries = catalogue as VocabularyEntry[];

function entry(word: string, pos: string, cefr = "A1"): VocabularyEntry {
  return { word, pos, cefr };
}

describe("selectNextVocabulary", () => {
  it("never offers a later level while an earlier one has words left", () => {
    // Meeting a word the learner cannot yet use in a sentence is a word wasted.
    // The A2 word wins on both later rules — it sorts first alphabetically and
    // its part of speech ranks higher. Only the level rule can put the A1 word
    // in front, so this fails the moment that rule stops applying.
    const next = selectNextVocabulary({
      catalogue: [entry("a", "determiner", "A2"), entry("zebra", "noun", "A1")],
      known: new Set(),
      limit: 1,
    });

    expect(next.map((item) => item.word)).toEqual(["zebra"]);
  });

  it("teaches what holds a sentence together before what fills it", () => {
    // `the` and `to` carry more coverage per word than any noun, and a learner
    // with fifty nouns and no determiners cannot read a sentence.
    const next = selectNextVocabulary({
      catalogue: [
        entry("apple", "noun"),
        entry("the", "determiner"),
        entry("beautiful", "adjective"),
        entry("go", "verb"),
      ],
      known: new Set(),
      limit: 4,
    });

    expect(next.map((item) => item.word)).toEqual([
      "the",
      "go",
      "beautiful",
      "apple",
    ]);
  });

  it("skips what the learner already has evidence for", () => {
    const next = selectNextVocabulary({
      catalogue: [entry("the", "determiner"), entry("a", "determiner")],
      known: new Set(["the"]),
      limit: 5,
    });

    expect(next.map((item) => item.word)).toEqual(["a"]);
  });

  it("gives the same lesson for the same catalogue twice", () => {
    // A learner returning to an unfinished session must not be handed a
    // different set of words because the sort was unstable.
    const twice = () =>
      selectNextVocabulary({ catalogue: entries, known: new Set(), limit: 20 });

    expect(twice()).toEqual(twice());
  });

  it("runs out rather than inventing", () => {
    const next = selectNextVocabulary({
      catalogue: [entry("the", "determiner")],
      known: new Set(["the"]),
      limit: 10,
    });

    expect(next).toEqual([]);
  });
});

describe("the vendored CEFR-J artifact", () => {
  it("carries the A1 backbone a beginner needs", () => {
    // The first thousand words are three quarters of written English. An
    // artifact that lost that many entries would quietly cap the on-ramp.
    const a1 = entries.filter((item) => item.cefr === "A1");

    expect(a1.length).toBeGreaterThan(900);
    expect(entries.length).toBeGreaterThan(2000);
  });

  it("holds each word once, at the earliest level it appears", () => {
    // A word taught at A1 and again at A2 would spend a beginner's session
    // twice on the same thing.
    const seen = new Set(entries.map((item) => item.word));

    expect(seen.size).toBe(entries.length);
  });

  it("carries only single lowercase words", () => {
    const malformed = entries.filter(
      (item) => !/^[a-z][a-z'’.-]{0,30}$/.test(item.word),
    );

    expect(malformed).toEqual([]);
  });

  it("puts function words first in the real catalogue, not just a fixture", () => {
    // The fixture above proves the comparator. This proves the artifact the
    // comparator is actually given.
    const first = [...entries].sort(compareTeachingOrder).slice(0, 30);
    const contentWords = first.filter((item) => item.pos === "noun");

    expect(contentWords).toEqual([]);
  });
});
