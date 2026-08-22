import { describe, expect, it } from "vitest";
import { scoreDictation } from "./score-dictation";

describe("scoreDictation", () => {
  it("accepts the sentence written back exactly", () => {
    expect(
      scoreDictation({ target: "I have the water.", heard: "I have the water" }),
    ).toEqual({ correct: 4, total: 4, missed: [], perfect: true });
  });

  it("ignores case and punctuation", () => {
    // A beginner who heard the sentence and wrote it without a capital has done
    // the thing being measured.
    expect(
      scoreDictation({ target: "I have the water.", heard: "i have the water!" }),
    ).toMatchObject({ perfect: true });
  });

  it("names every word that did not come back", () => {
    expect(
      scoreDictation({ target: "I have the water.", heard: "I have a water" }),
    ).toEqual({ correct: 3, total: 4, missed: ["the"], perfect: false });
  });

  it("does not accept the right words in the wrong order", () => {
    // Set-based scoring would call this perfect. The learner did not
    // understand the sentence.
    expect(
      scoreDictation({ target: "the cat is here", heard: "here is the cat" }),
    ).toMatchObject({ perfect: false });
  });

  it("does not let padding raise the score", () => {
    expect(
      scoreDictation({ target: "I have water", heard: "I have water and cat" }),
    ).toMatchObject({ correct: 3, perfect: false });
  });

  it("scores an empty answer as nothing heard rather than throwing", () => {
    expect(scoreDictation({ target: "I have water", heard: "   " })).toEqual({
      correct: 0,
      total: 3,
      missed: ["i", "have", "water"],
      perfect: false,
    });
  });
});
