import { readFileSync } from "node:fs";

import { dictionary } from "cmu-pronouncing-dictionary";
import { describe, expect, it } from "vitest";

import {
  CONTRASTS,
  HELD_OUT_VOICE,
  TRAINING_VOICES,
  contrast,
  contrastWords,
} from "./minimal-pairs";

/** CMUdict phonemes with the stress digits stripped. */
function phonemes(word: string): string[] {
  const pronunciation = dictionary[word.toLowerCase()];
  if (!pronunciation) throw new Error(`CMUdict does not know "${word}"`);
  return pronunciation.split(" ").map((phoneme) => phoneme.replace(/\d/g, ""));
}

describe("the Vietnamese-targeted sound contrasts", () => {
  it("uses only words a pronunciation dictionary knows", () => {
    // A word CMUdict cannot pronounce is a word nobody verified the contrast
    // of, and one the renderer would voice by guesswork.
    const unknown = contrastWords().filter(
      (word) => dictionary[word.toLowerCase()] === undefined,
    );
    expect(unknown).toEqual([]);
  });

  it("makes every pair differ in exactly one phoneme", () => {
    // This is the property that makes it a minimal pair at all. A pair that
    // differs in two places lets the learner succeed on the wrong cue, and the
    // training then measures something other than what it claims to teach.
    const broken: string[] = [];
    for (const item of CONTRASTS) {
      for (const pair of item.pairs) {
        const a = phonemes(pair.a);
        const b = phonemes(pair.b);
        if (a.length !== b.length) {
          broken.push(`${item.id}: ${pair.a}/${pair.b} differ in length`);
          continue;
        }
        const differing = a.filter((phoneme, index) => phoneme !== b[index]);
        if (differing.length !== 1) {
          broken.push(
            `${item.id}: ${pair.a}/${pair.b} differ in ${differing.length} phonemes`,
          );
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("makes the one difference be the phonemes the contrast claims to teach", () => {
    const wrong: string[] = [];
    for (const item of CONTRASTS) {
      for (const pair of item.pairs) {
        const a = phonemes(pair.a);
        const b = phonemes(pair.b);
        const index = a.findIndex((phoneme, at) => phoneme !== b[at]);
        if (a[index] !== item.phonemeA || b[index] !== item.phonemeB) {
          wrong.push(
            `${item.id}: ${pair.a}/${pair.b} differ in ${a[index]}/${b[index]}, not ${item.phonemeA}/${item.phonemeB}`,
          );
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("puts the difference where the contrast says it is", () => {
    const misplaced: string[] = [];
    for (const item of CONTRASTS) {
      for (const pair of item.pairs) {
        const a = phonemes(pair.a);
        const index = a.findIndex((phoneme, at) => phoneme !== phonemes(pair.b)[at]);
        const at = item.position === "initial" ? index === 0 : index === a.length - 1;
        if (!at) {
          misplaced.push(
            `${item.id}: ${pair.a}/${pair.b} differ at ${index} of ${a.length}, not ${item.position}`,
          );
        }
      }
    }
    expect(misplaced).toEqual([]);
  });

  it("explains every sound before it trains it", () => {
    // Presenting phonetic information about the target before perception
    // training measurably improves how much of the gain reaches production, so
    // an unexplained contrast is a weaker treatment, not a tidier one.
    for (const item of CONTRASTS) {
      expect(item.explanationVi.length).toBeGreaterThan(80);
      expect(item.titleVi).not.toHaveLength(0);
      expect(item.pairs.length).toBeGreaterThanOrEqual(3);
    }
    expect(() => contrast("initial_aspiration_p_b")).not.toThrow();
    // @ts-expect-error — the guard exists for ids arriving from outside TypeScript.
    expect(() => contrast("nope")).toThrow(/Unknown contrast/);
  });

  it("trains on several voices and keeps one back to test a new one", () => {
    // Hearing one speaker teaches that speaker, not the sound. Three talkers is
    // the floor the meta-analysis supports; the held-out voice is what shows
    // whether the learning generalised or was memorised.
    expect(TRAINING_VOICES.length).toBeGreaterThanOrEqual(3);
    expect(new Set(TRAINING_VOICES).size).toBe(TRAINING_VOICES.length);
    expect(TRAINING_VOICES).not.toContain(HELD_OUT_VOICE);
  });

  it("never lists the same word twice inside one contrast", () => {
    for (const item of CONTRASTS) {
      const words = item.pairs.flatMap((pair) => [pair.a, pair.b]);
      expect(new Set(words).size).toBe(words.length);
    }
  });
});

describe("how familiar the training words are", () => {
  it("keeps most training words inside the learner's own vocabulary", () => {
    // Identification is a perceptual task, not a comprehension one: the learner
    // sees both spellings and picks the sound they heard, so a word they have
    // never met still trains the contrast. The classic studies did not control
    // familiarity either.
    //
    // But an unknown word is one more thing on screen to be unsure about, and
    // there is no reason to reach for one when the catalogue already contains a
    // pair that differs in the same phoneme. This bounds the drift rather than
    // forbidding it: if a later edit pushes past the threshold, that is a signal
    // someone started picking words for convenience.
    const catalogue = new Set(
      (
        JSON.parse(
          readFileSync("src/adapters/vocabulary/cefrj-a1-a2.json", "utf8"),
        ) as unknown[]
      ).flatMap((entry) =>
        typeof entry === "string"
          ? [entry]
          : [(entry as { word?: string }).word ?? ""],
      ),
    );

    const words = contrastWords();
    const known = words.filter((word) => catalogue.has(word));
    expect(known.length / words.length).toBeGreaterThan(0.65);
  });
});
