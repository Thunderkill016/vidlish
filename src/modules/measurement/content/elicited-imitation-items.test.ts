import { describe, expect, it } from "vitest";
import { dictionary } from "cmu-pronouncing-dictionary";

import {
  ELICITED_IMITATION_ITEMS,
  EI_MAX_SYLLABLES,
  EI_MIN_SYLLABLES,
} from "./elicited-imitation-items";

/** Syllables are vowel phonemes; CMUdict marks those with a stress digit. */
function syllablesOf(text: string): { count: number; unknown: string[] } {
  let count = 0;
  const unknown: string[] = [];
  for (const word of text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/)) {
    if (!word) continue;
    const phonemes = (dictionary as Record<string, string>)[word];
    if (!phonemes) {
      unknown.push(word);
      continue;
    }
    count += phonemes.split(" ").filter((p) => /\d/.test(p)).length;
  }
  return { count, unknown };
}

describe("the elicited imitation bank", () => {
  it("states a syllable count the pronunciation agrees with", () => {
    // The count is what grades the learner, so an authored number that drifted
    // from the sentence would put them at the wrong point on the scale and
    // nothing downstream could tell.
    const wrong = ELICITED_IMITATION_ITEMS.filter(
      (item) => syllablesOf(item.text).count !== item.syllables,
    ).map((item) => `${item.id}: says ${item.syllables}, is ${syllablesOf(item.text).count}`);
    expect(wrong).toEqual([]);
  });

  it("uses only words the dictionary can pronounce", () => {
    // A word CMUdict does not hold cannot be counted, and an uncounted word
    // silently shortens the item.
    const unknown = ELICITED_IMITATION_ITEMS.flatMap(
      (item) => syllablesOf(item.text).unknown,
    );
    expect(unknown).toEqual([]);
  });

  it("stays inside the span the instrument is built for", () => {
    for (const item of ELICITED_IMITATION_ITEMS) {
      expect(item.syllables, item.id).toBeGreaterThanOrEqual(EI_MIN_SYLLABLES);
      expect(item.syllables, item.id).toBeLessThanOrEqual(EI_MAX_SYLLABLES);
    }
  });

  it("covers every length in the span", () => {
    // A gap is a length at which the instrument cannot say anything, and it is
    // exactly the lengths near a learner's ceiling that carry the information.
    const present = new Set(ELICITED_IMITATION_ITEMS.map((i) => i.syllables));
    const missing: number[] = [];
    for (let n = EI_MIN_SYLLABLES; n <= EI_MAX_SYLLABLES; n += 1) {
      if (!present.has(n)) missing.push(n);
    }
    expect(missing).toEqual([]);
  });

  it("has unique ids and no repeated sentence", () => {
    const ids = ELICITED_IMITATION_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    const texts = ELICITED_IMITATION_ITEMS.map((i) => i.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("holds enough items to grade with", () => {
    // Published banks run to about thirty. Far fewer and one misheard item
    // moves the score more than a month of learning would.
    expect(ELICITED_IMITATION_ITEMS.length).toBeGreaterThanOrEqual(30);
  });
});
