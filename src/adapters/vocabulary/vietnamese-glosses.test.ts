import { describe, expect, it } from "vitest";
import catalogue from "./cefrj-a1-a2.json";
import { glossedWordCount, vietnameseGlossFor } from "./vietnamese-glosses";
import spokenFrequency from "./spoken-frequency.json";

describe("vietnamese glosses", () => {
  it("covers most of the catalogue", () => {
    expect(glossedWordCount()).toBeGreaterThan(1_500);
  });

  it("gives a Vietnamese meaning for a concrete word", () => {
    expect(vietnameseGlossFor("water")).toContain("nước");
    expect(vietnameseGlossFor("cat")).toContain("mèo");
  });

  it("matches case-insensitively", () => {
    expect(vietnameseGlossFor("Water")).toEqual(vietnameseGlossFor("water"));
  });

  it("returns nothing rather than a guess for a word nothing knows", () => {
    expect(vietnameseGlossFor("qwertyuiop")).toBeNull();
  });

  it("explains a grammatical word instead of leaving the learner nothing", () => {
    // This used to return null, on the reasoning that Vietnamese has no article
    // so any translation of `the` would teach a word that does not do the job.
    // That half was right and the conclusion was wrong: a learner shown nothing
    // at all is not protected from a bad translation, they are just left to
    // guess, and `the` is the third most spoken word in English.
    //
    // So the rule is narrower than it was. Do not invent a one-word
    // translation; do say what the word is for.
    const gloss = vietnameseGlossFor("the");
    expect(gloss).not.toBeNull();
    expect(gloss?.join(" ")).toMatch(/không có từ tương đương/);
  });

  it("carries no writing system the learner cannot read", () => {
    // Wiktionary also holds Chữ Nôm for some entries. A learner shown 每𠊛 for
    // "everyone" has been handed a puzzle, not a translation.
    // Parentheses, commas and slashes are punctuation, not a writing system:
    // a grammatical word is explained rather than translated, and the
    // explanation needs to be punctuated to be readable.
    const latin = /^[A-Za-zÀ-ỿ̀-ͯ\s'’.,()/-]+$/;
    for (const entry of catalogue as { word: string }[]) {
      for (const sense of vietnameseGlossFor(entry.word) ?? []) {
        expect(sense).toMatch(latin);
      }
    }
  });

  it("keeps glosses short enough to be a gloss", () => {
    for (const entry of catalogue as { word: string }[]) {
      expect((vietnameseGlossFor(entry.word) ?? []).length).toBeLessThanOrEqual(3);
    }
  });
});

describe("the words a learner meets first", () => {
  const SPOKEN_FREQUENCY = spokenFrequency as Record<string, number>;

  function mostSpoken(count: number): string[] {
    return Object.entries(SPOKEN_FREQUENCY)
      .sort(([, left], [, right]) => right - left)
      .slice(0, count)
      .map(([word]) => word);
  }

  it("gives every one of the hundred most spoken words a meaning", () => {
    // A learner meeting their first hundred words with no Vietnamese is being
    // handed a sound and asked to guess. These are also the words the scrape
    // covered worst, because Vietnamese has no article and no case-marked
    // pronoun, so there is nothing for it to take.
    const missing = mostSpoken(100).filter((word) => !vietnameseGlossFor(word));
    expect(missing).toEqual([]);
  });

  it("does not gloss the pronoun I as the letter I", () => {
    // What the scrape returned was “i, i ngắn” — the alphabet letter — for the
    // word that is four percent of everything anyone says.
    const gloss = vietnameseGlossFor("i");
    expect(gloss).not.toBeNull();
    expect(gloss?.join(" ")).toContain("tôi");
    expect(gloss?.join(" ")).not.toContain("ngắn");
  });

  it("does not offer a word meaning yes as a gloss for no", () => {
    // The scrape returned “không, ừ, phải”, and the last two mean yes.
    const gloss = vietnameseGlossFor("no")?.join(" ") ?? "";
    expect(gloss).toContain("không");
    expect(gloss).not.toMatch(/\bừ\b|\bphải\b/);
  });

  it("does not gloss are as a unit of area", () => {
    const gloss = vietnameseGlossFor("are")?.join(" ") ?? "";
    expect(gloss).toContain("là");
  });

  it("explains a grammatical word rather than inventing a translation", () => {
    // Vietnamese has no article. A one-word "translation" of `the` would be a
    // word that does not do the job, and the learner would carry it for months.
    const gloss = vietnameseGlossFor("the")?.join(" ") ?? "";
    expect(gloss).toMatch(/không có từ tương đương|từ chỉ vật đã biết/);
  });
});
