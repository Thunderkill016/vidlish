import { describe, expect, it } from "vitest";

import type { BeginnerSentence } from "@/adapters/vocabulary/beginner-sentence-catalogue";

import {
  BLANK,
  buildClozeItem,
  isUsableCloze,
  markCloze,
  selectClozeItems,
} from "./build-cloze-item";

const sentence = (
  text: string,
  target: string,
  id = 1,
): BeginnerSentence => ({ id, text, target, words: text.split(/\s+/).length });

describe("removing one word for the learner to supply", () => {
  it("blanks the target and keeps the rest of the sentence intact", () => {
    const item = buildClozeItem(sentence("I sent the file yesterday.", "file"));
    expect(item.prompt).toBe(`I sent the ${BLANK} yesterday.`);
    expect(item.answer).toBe("file");
    expect(item.sentence).toBe("I sent the file yesterday.");
  });

  it("blanks only the first occurrence when a word repeats", () => {
    // Blanking every instance turns one question into several and the learner
    // cannot tell which one is being asked about.
    const item = buildClozeItem(sentence("A program is a program.", "program"));
    expect(item.prompt).toBe(`A ${BLANK} is a program.`);
  });

  it("blanks whole words only, never a fragment inside one", () => {
    const item = buildClozeItem(sentence("Can you scan the can?", "can"));
    expect(item.prompt).toBe(`${BLANK} you scan the can?`);
  });

  it("uses a fixed-width blank, so its length never hints at the answer", () => {
    const short = buildClozeItem(sentence("I go now.", "go"));
    const long = buildClozeItem(sentence("I understand now.", "understand"));
    expect(short.prompt.match(/_+/)?.[0]).toBe(long.prompt.match(/_+/)?.[0]);
  });
});

describe("which sentences are worth asking about", () => {
  const known = new Set(["i", "sent", "the", "yesterday"]);

  it("accepts a sentence where every other word is known", () => {
    expect(isUsableCloze(sentence("I sent the file yesterday.", "file"), known)).toBe(
      true,
    );
  });

  it("refuses a sentence with a second unknown word", () => {
    // Two unknown words does not test assembly, it tests guessing — and a guess
    // leaves nothing behind.
    expect(
      isUsableCloze(sentence("I sent the file quickly.", "file"), known),
    ).toBe(false);
  });

  it("refuses a sentence that does not contain its own target", () => {
    expect(isUsableCloze(sentence("I sent the file.", "report"), known)).toBe(false);
  });

  it("puts the longest readable sentence first", () => {
    // A longer sentence the learner can otherwise read whole is a bigger step
    // in assembly, and assembly is the skill being built.
    const items = selectClozeItems({
      sentences: [
        sentence("I sent the file.", "file", 1),
        sentence("I sent the file yesterday.", "file", 2),
      ],
      known,
      wanted: 2,
    });
    expect(items.map((item) => item.sentenceId)).toEqual([2, 1]);
  });
});

describe("marking what the learner wrote", () => {
  const item = buildClozeItem(sentence("I sent the file yesterday.", "file"));

  it("forgives case and stray punctuation", () => {
    for (const written of ["file", " File ", "FILE.", '"file"']) {
      expect(markCloze(item, written)).toBe("correct");
    }
  });

  it("does not forgive spelling", () => {
    // The learner is being asked to produce a form. Accepting a near-miss
    // teaches the near-miss.
    for (const written of ["fil", "files", "phile", ""]) {
      expect(markCloze(item, written)).toBe("wrong");
    }
  });

  it("keeps an apostrophe, because it is part of the word", () => {
    const contraction = buildClozeItem(sentence("I don't know.", "don't"));
    expect(markCloze(contraction, "don't")).toBe("correct");
    expect(markCloze(contraction, "dont")).toBe("wrong");
  });
});
