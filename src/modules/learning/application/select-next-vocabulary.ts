/**
 * What a learner from zero should meet next.
 *
 * The coverage research is unusually clear-cut: the first hundred English words
 * are about half of all written text, the first thousand are three quarters of
 * writing and four fifths of speech, and going from one thousand to two adds
 * only about seven points. So for someone starting at zero, the order of the
 * first thousand words matters more than almost anything else the product does.
 *
 * Two rules follow from that, and both are deliberate:
 *
 * 1. **Level before anything.** An A2 word is not offered while A1 words remain.
 *    Meeting a word the learner cannot yet use in a sentence is a word wasted.
 * 2. **Function words before content words.** `the`, `is`, `to`, `and` carry far
 *    more coverage per word than any noun, and they are what makes a sentence
 *    hold together at all. A learner who knows fifty nouns and no determiners
 *    cannot read; one who knows the reverse can read a great deal.
 *
 * What this does *not* do is order by real frequency, because the CEFR-J
 * artifact does not carry it. Part of speech is a proxy for coverage, and a
 * weaker one than a frequency list would be — see the artifact's README.
 */

export type VocabularyEntry = {
  word: string;
  pos: string;
  cefr: string;
};

/**
 * Lower sorts earlier. Grouped by what a sentence needs to exist, then by what
 * carries the most meaning per word learned.
 */
const POS_PRIORITY: Record<string, number> = {
  determiner: 0,
  pronoun: 0,
  preposition: 1,
  conjunction: 1,
  auxiliary: 1,
  verb: 2,
  adverb: 3,
  adjective: 4,
  noun: 5,
};

const UNRANKED_POS = 6;
const LEVEL_ORDER: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3 };
const UNRANKED_LEVEL = 9;

export function selectNextVocabulary(input: {
  catalogue: readonly VocabularyEntry[];
  /** Words the learner already has evidence for, in any state. */
  known: ReadonlySet<string>;
  limit: number;
}): VocabularyEntry[] {
  return input.catalogue
    .filter((entry) => !input.known.has(entry.word))
    .slice()
    .sort(compareTeachingOrder)
    .slice(0, Math.max(0, input.limit));
}

/** Exported so the ordering itself can be asserted, not just its first slice. */
export function compareTeachingOrder(
  left: VocabularyEntry,
  right: VocabularyEntry,
): number {
  const byLevel =
    (LEVEL_ORDER[left.cefr] ?? UNRANKED_LEVEL) -
    (LEVEL_ORDER[right.cefr] ?? UNRANKED_LEVEL);
  if (byLevel !== 0) return byLevel;

  const byPos =
    (POS_PRIORITY[left.pos] ?? UNRANKED_POS) -
    (POS_PRIORITY[right.pos] ?? UNRANKED_POS);
  if (byPos !== 0) return byPos;

  // Alphabetical last, only so the same catalogue always yields the same
  // lesson. It carries no pedagogical claim.
  return left.word.localeCompare(right.word, "en");
}
