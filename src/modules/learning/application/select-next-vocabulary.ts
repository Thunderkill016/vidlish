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
 * Frequency now comes from SUBTLEX-US, a corpus of film and television
 * subtitles, and it decides the order within a level. Part of speech drops to a
 * tie-break. The measured difference is not marginal: ordering by part of
 * speech and then the alphabet produced a first fifty of `a, all, an, another,
 * any, anybody, anyone, anything` — a dictionary read from page one. Ordering
 * by how often people actually say the word produces `you, the, to, a, it,
 * that, and, of, what, in, me, is, we`. Only 44 of the first hundred words are
 * the same under the two rules.
 *
 * Subtitles rather than books, deliberately: the first skill here is listening,
 * and written-corpus frequency over-weights words nobody says out loud.
 */

export type VocabularyEntry = {
  word: string;
  pos: string;
  cefr: string;
};

/**
 * How often each word appears in spoken English. A word with no entry sorts
 * last within its level: one the subtitle corpus never recorded anyone saying
 * is not a word to teach early, and treating a missing count as zero says
 * exactly that.
 */
export type SpokenFrequency = Readonly<Record<string, number>>;

let spokenFrequency: SpokenFrequency = {};

/**
 * Injected rather than imported, so the ordering rule stays free of an adapter
 * and a test can state the frequencies it asserts about instead of depending on
 * whatever the shipped artifact happens to contain.
 *
 * Not named `useSpokenFrequency`: a `use` prefix means a React hook here, and
 * calling one at module scope is an error the linter is right to raise.
 */
export function applySpokenFrequency(frequency: SpokenFrequency): void {
  spokenFrequency = frequency;
}

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

  // Frequency first, descending: the words a learner hears most are the words
  // that unlock the most of what they hear.
  const byFrequency =
    (spokenFrequency[right.word] ?? 0) - (spokenFrequency[left.word] ?? 0);
  if (byFrequency !== 0) return byFrequency;

  // Part of speech survives as a tie-break for words the corpus counted
  // equally. Function words still come first among those, for the reason they
  // always did: a sentence cannot hold together without them.
  const byPos =
    (POS_PRIORITY[left.pos] ?? UNRANKED_POS) -
    (POS_PRIORITY[right.pos] ?? UNRANKED_POS);
  if (byPos !== 0) return byPos;

  // Alphabetical last, only so the same catalogue always yields the same
  // lesson. It carries no pedagogical claim.
  return left.word.localeCompare(right.word, "en");
}
