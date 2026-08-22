import { describe, expect, it } from "vitest";
import catalogue from "./cefrj-a1-a2.json";
import { glossedWordCount, vietnameseGlossFor } from "./vietnamese-glosses";

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

  it("returns nothing rather than a guess for a word with no entry", () => {
    // `the` has no Vietnamese equivalent — Vietnamese has no article. Wiktionary
    // says so explicitly, and inventing something here would teach a word that
    // does not do the job.
    expect(vietnameseGlossFor("the")).toBeNull();
    expect(vietnameseGlossFor("qwertyuiop")).toBeNull();
  });

  it("carries no writing system the learner cannot read", () => {
    // Wiktionary also holds Chữ Nôm for some entries. A learner shown 每𠊛 for
    // "everyone" has been handed a puzzle, not a translation.
    const latin = /^[A-Za-zÀ-ỿ̀-ͯ\s'’.-]+$/;
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
