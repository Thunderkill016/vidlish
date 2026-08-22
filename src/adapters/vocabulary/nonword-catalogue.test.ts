import { describe, expect, it } from "vitest";
import catalogue from "./cefrj-a1-a2.json";
import {
  isNonword,
  nonwordCatalogueSize,
  sampleNonwords,
} from "./nonword-catalogue";

describe("nonword catalogue", () => {
  it("ships enough nonwords that a check is never the same twice", () => {
    expect(nonwordCatalogueSize()).toBeGreaterThan(100);
  });

  it("contains no word the learner is being taught", () => {
    // A "nonword" that is actually on the syllabus would mark a learner
    // unreliable for knowing something the product taught them.
    const taught = new Set(
      (catalogue as { word: string }[]).map((entry) => entry.word),
    );
    for (const item of sampleNonwords(nonwordCatalogueSize(), 0)) {
      expect(taught.has(item)).toBe(false);
    }
  });

  it("recognises its own items case-insensitively", () => {
    const [first] = sampleNonwords(1, 0);
    expect(isNonword(first)).toBe(true);
    expect(isNonword(first.toUpperCase())).toBe(true);
  });

  it("does not mistake a real word for a nonword", () => {
    expect(isNonword("water")).toBe(false);
    expect(isNonword("the")).toBe(false);
  });

  it("never repeats an item within one check", () => {
    const sampled = sampleNonwords(20, 7);
    expect(new Set(sampled).size).toBe(sampled.length);
  });

  it("gives the same check for the same learner state", () => {
    // A check that changed between two requests would let a learner reload
    // until they got items they liked.
    expect(sampleNonwords(3, 42)).toEqual(sampleNonwords(3, 42));
    expect(sampleNonwords(3, 42)).not.toEqual(sampleNonwords(3, 43));
  });
});
