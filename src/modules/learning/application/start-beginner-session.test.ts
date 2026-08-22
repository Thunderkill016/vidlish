import { describe, expect, it, vi } from "vitest";
import { startBeginnerSession } from "./start-beginner-session";

const catalogue = [
  { word: "the", pos: "determiner", cefr: "A1" },
  { word: "water", pos: "noun", cefr: "A1" },
  { word: "mountain", pos: "noun", cefr: "A2" },
];

const neverGenerates = vi.fn(async () => {
  throw new Error("generation should not have been reached");
});

describe("startBeginnerSession", () => {
  it("serves human-written sentences without asking the model", async () => {
    const generate = vi.fn(async () => []);
    const result = await startBeginnerSession({
      catalogue,
      known: new Set(["the", "i", "have"]),
      candidatesFor: () => ["I have the water.", "The water is the water."],
      generate,
      wanted: 1,
    });

    expect(result).toEqual({
      kind: "ready",
      plan: {
        target: "water",
        source: "retrieved",
        sentences: ["I have the water."],
        knownWordCount: 3,
      },
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("introduces the first word on its own under the bootstrap policy", async () => {
    // The current conservative sentence gate has no multi-word candidate that
    // can pass with an empty independent lexical set. The runtime therefore
    // bootstraps the target instead of calling generation for material it would
    // reject. This tests the current policy, not a universal acquisition rule.
    const generate = vi.fn(async () => []);
    const result = await startBeginnerSession({
      catalogue,
      known: new Set(),
      candidatesFor: () => [],
      generate,
      wanted: 3,
    });

    expect(result).toEqual({
      kind: "introduce_word",
      target: "the",
      knownWordCount: 0,
    });
    expect(generate).not.toHaveBeenCalled();
  });

  it("generates when the corpus cannot reach the target", async () => {
    const generate = vi.fn(async () => ["I have the water.", "The water is water."]);
    const result = await startBeginnerSession({
      catalogue,
      known: new Set(["the", "i", "have", "is"]),
      candidatesFor: () => [],
      generate,
      wanted: 1,
    });

    expect(result).toMatchObject({ kind: "ready", plan: { source: "generated" } });
    expect(generate).toHaveBeenCalledWith({
      target: "water",
      known: ["the", "i", "have", "is"],
      count: 1,
    });
  });

  it("applies the same gate to generated sentences as to retrieved ones", async () => {
    // The model reached outside the vocabulary allowed by the current policy.
    // That output is discarded rather than silently widening learner input.
    const result = await startBeginnerSession({
      catalogue,
      known: new Set(["the", "i", "have"]),
      candidatesFor: () => [],
      generate: async () => ["I drink cold water.", "The dog is here."],
      wanted: 1,
    });

    expect(result).toEqual({ kind: "no_usable_input", target: "water" });
  });

  it("refuses a batch shorter than the current session policy requires", async () => {
    // The current session contract asks for a varied batch before banking this
    // sentence phase. That is a design constraint, not a claim that a single
    // sentence can never contribute to learning.
    const result = await startBeginnerSession({
      catalogue,
      known: new Set(["the", "i", "have"]),
      candidatesFor: () => ["I have the water."],
      generate: async () => ["I have the water."],
      wanted: 3,
    });

    expect(result).toEqual({ kind: "no_usable_input", target: "water" });
  });

  it("teaches an A1 word before an A2 word", async () => {
    const result = await startBeginnerSession({
      catalogue,
      known: new Set(["i", "have"]),
      candidatesFor: (target) => (target === "the" ? ["I have the."] : []),
      generate: neverGenerates,
      wanted: 1,
    });

    expect(result).toMatchObject({ plan: { target: "the" } });
  });

  it("says so when the learner has finished the catalogue", async () => {
    const result = await startBeginnerSession({
      catalogue,
      known: new Set(["the", "water", "mountain"]),
      candidatesFor: () => [],
      generate: neverGenerates,
      wanted: 1,
    });

    expect(result).toEqual({ kind: "catalogue_exhausted" });
  });
});
