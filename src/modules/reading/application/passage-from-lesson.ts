import type { LessonCitation } from "@/shared/contracts/lesson";

/**
 * Turns the quoted lines of a learner's own video lesson into something to read.
 *
 * The product owner chose to keep the video path and wire it into the daily
 * session rather than leave it as a separate wing. This is the join: the same
 * reading surface, with his own material in it.
 *
 * It is worth being precise about what these lines are. Every citation was
 * checked against the transcript allowlist before it was stored — the model
 * returns identifiers and the server hydrates the exact words. So this is real
 * speech from a video he chose, not text a model wrote about it.
 *
 * Why offer it ahead of the curated shelf when it exists: interest is the one
 * moderator no design substitutes for, and material a learner picked themselves
 * needs no motivating. The shelf stays as the fallback, because a learner with
 * no lessons yet still has to read something today.
 */

/**
 * Below this a citation is a fragment, not a passage.
 *
 * Spoken lines are short — a transcript segment is often three or four words —
 * and a screen of fragments reads as noise rather than as English. Eight words
 * is roughly where a line carries a clause.
 */
const MINIMUM_WORDS = 8;

export type LessonPassage = {
  readonly paragraphs: readonly string[];
  readonly words: number;
};

export function passageFromCitations(
  citations: readonly LessonCitation[],
): LessonPassage {
  const seen = new Set<string>();
  const paragraphs: string[] = [];

  for (const citation of citations) {
    const text = citation.text.trim().replace(/\s+/g, " ");
    if (text.split(" ").length < MINIMUM_WORDS) continue;

    // The same line can be cited by several activities in one lesson. Reading
    // it three times in a row is not narrow reading, it is a bug.
    const key = text.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    paragraphs.push(text);
  }

  return {
    paragraphs,
    words: paragraphs.reduce(
      (sum, paragraph) => sum + paragraph.split(" ").length,
      0,
    ),
  };
}

/** Whether there is enough here to be worth a reading step. */
export function isReadablePassage(passage: LessonPassage): boolean {
  return passage.paragraphs.length >= 2;
}
