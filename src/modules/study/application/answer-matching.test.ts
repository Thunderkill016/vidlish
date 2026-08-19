import { describe, expect, it } from "vitest";

import {
  isTypedAnswerCorrect,
  normalizeTypedAnswer,
  splitClozeSentence,
} from "@/modules/study/application/answer-matching";

describe("typed answer matching", () => {
  it("forgives case, spacing and edge punctuation", () => {
    expect(isTypedAnswerCorrect("  Habit ", "habit")).toBe(true);
    expect(isTypedAnswerCorrect("habit.", "habit")).toBe(true);
    expect(isTypedAnswerCorrect("take  off", "take off")).toBe(true);
  });

  it("treats a typed curly apostrophe as the same word", () => {
    expect(isTypedAnswerCorrect("don’t", "don't")).toBe(true);
    expect(isTypedAnswerCorrect("don't", "don’t")).toBe(true);
  });

  it("does not forgive a different word", () => {
    expect(isTypedAnswerCorrect("habits", "habit")).toBe(false);
    expect(isTypedAnswerCorrect("", "habit")).toBe(false);
    expect(isTypedAnswerCorrect("take on", "take off")).toBe(false);
  });

  it("refuses to mark an empty expected answer correct", () => {
    expect(isTypedAnswerCorrect("", "   ")).toBe(false);
    expect(isTypedAnswerCorrect("anything", "!!!")).toBe(false);
  });

  it("keeps punctuation inside a word", () => {
    expect(normalizeTypedAnswer("well-known!")).toBe("well-known");
  });

  it("splits a sentence around its blank", () => {
    expect(splitClozeSentence("I ___ every morning")).toEqual({
      before: "I ",
      after: " every morning",
      hasBlank: true,
    });
    expect(splitClozeSentence("no blank here")).toEqual({
      before: "no blank here",
      after: "",
      hasBlank: false,
    });
  });
});
