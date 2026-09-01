import { describe, expect, it } from "vitest";

import type { LessonCitation } from "@/shared/contracts/lesson";

import { isReadablePassage, passageFromCitations } from "./passage-from-lesson";

const cite = (text: string): LessonCitation =>
  ({ segmentId: "s1", startMs: 0, endMs: 1000, text }) as unknown as LessonCitation;

const long = "I want to show you how this whole thing actually works today";
const alsoLong = "The first part is easy but the second part takes practice";

describe("turning a learner's own video into something to read", () => {
  it("keeps lines long enough to carry a clause", () => {
    const passage = passageFromCitations([cite(long), cite(alsoLong)]);
    expect(passage.paragraphs).toEqual([long, alsoLong]);
  });

  it("drops fragments, which read as noise rather than as English", () => {
    // A transcript segment is often three or four words. A screen of those is
    // not a passage.
    const passage = passageFromCitations([
      cite("Yeah."),
      cite("Okay so"),
      cite(long),
    ]);
    expect(passage.paragraphs).toEqual([long]);
  });

  it("never repeats a line several activities happened to cite", () => {
    // Reading the same sentence three times in a row is not narrow reading.
    const passage = passageFromCitations([cite(long), cite(long), cite(long)]);
    expect(passage.paragraphs).toHaveLength(1);
  });

  it("ignores case and spacing when deciding a line is a repeat", () => {
    const passage = passageFromCitations([
      cite(long),
      cite(`  ${long.toUpperCase()}  `),
    ]);
    expect(passage.paragraphs).toHaveLength(1);
  });

  it("counts the words, so the session can say how much there is", () => {
    expect(passageFromCitations([cite(long), cite(alsoLong)]).words).toBe(23);
  });

  it("refuses a passage too thin to be a reading step", () => {
    expect(isReadablePassage(passageFromCitations([cite("Hi.")]))).toBe(false);
    expect(isReadablePassage(passageFromCitations([cite(long)]))).toBe(false);
    expect(
      isReadablePassage(passageFromCitations([cite(long), cite(alsoLong)])),
    ).toBe(true);
  });
});
