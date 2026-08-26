import shelfData from "./shelf.json";

/**
 * The bounded shelf of real English this learner reads.
 *
 * Bounded on purpose. The 2025 meta-analysis of extensive reading (34 studies,
 * 3,942 learners) found effects were *larger* when learners' choice of text was
 * limited and when some accountability was present — the opposite of what every
 * popular reading product offers. A search box would be the easier product and
 * the weaker one.
 *
 * Grouped by topic for the same reason narrow reading works: several texts on
 * one theme recycle low-frequency words far more than texts pulled from
 * unrelated sources, and repetition is the scarce resource — more than 8
 * encounters before a word's form is half-remembered, more than 14 for its
 * meaning.
 *
 * Rebuilt by `node scripts/build-reading-shelf.mjs`.
 */

export type TextSource = {
  readonly url: string;
  readonly revision: number | null;
  readonly licence: { readonly name: string; readonly url: string };
};

export type ShelfText = {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
  readonly words: number;
  /**
   * Where it came from, shown to the reader.
   *
   * Simple English Wikipedia is CC BY-SA 4.0 — verified against the site's own
   * API, not assumed. That permits reproduction and requires attribution, so
   * attribution ships with the text rather than being remembered later.
   */
  readonly source: TextSource;
};

export type ShelfTopic = { readonly topic: string; readonly texts: readonly ShelfText[] };

const SHELF: readonly ShelfTopic[] = shelfData;

export function readingShelf(): readonly ShelfTopic[] {
  return SHELF;
}

export function shelfTextById(id: string): ShelfText | null {
  for (const topic of SHELF) {
    for (const text of topic.texts) if (text.id === id) return text;
  }
  return null;
}

/** Total words on the shelf. Reported against the 60,000 at which patterns recur. */
export function shelfWordCount(): number {
  return SHELF.flatMap((topic) => topic.texts).reduce((sum, text) => sum + text.words, 0);
}
