/**
 * Whether a sentence is input this learner can actually learn from.
 *
 * Krashen's i+1 says input should sit a little beyond what the learner already
 * has. In most products that is a slogan. Here it is a gate a machine can check:
 *
 *   every word is already known, except at most one.
 *
 * That is the same shape the video path already relies on — a quote must exist
 * in the transcript, checked, not promised. At zero there is no transcript to
 * check against, so the learner's own evidence takes its place, and the rule
 * gets stricter rather than looser.
 *
 * "Known" is not self-reported. It means the learner produced the word
 * correctly with no support open — the `last_independent_at` signal — because a
 * word someone recognises on a page is not a word they can build a sentence
 * from.
 */

export type ComprehensibleInputVerdict =
  | { kind: "usable"; newWords: string[] }
  | { kind: "too_hard"; newWords: string[] }
  | { kind: "nothing_new" };

/** Words as the learner meets them, lowercased and stripped of punctuation. */
export function tokenise(sentence: string): string[] {
  return sentence
    .toLocaleLowerCase("en-US")
    .split(/[^a-z'’]+/)
    .filter((token) => token.length > 0)
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length > 0);
}

export function checkComprehensibleInput(input: {
  sentence: string;
  known: ReadonlySet<string>;
  /** Defaults to one: the +1 in i+1. */
  maxNewWords?: number;
}): ComprehensibleInputVerdict {
  const budget = input.maxNewWords ?? 1;
  const words = tokenise(input.sentence);

  // Order preserved and duplicates collapsed: a word repeated in one sentence
  // is one new word to learn, not two.
  const newWords = [...new Set(words.filter((word) => !input.known.has(word)))];

  if (newWords.length > budget) return { kind: "too_hard", newWords };
  // Input with nothing new is comprehensible but teaches nothing. Serving it
  // would let a learner spend a session and end where they started, and the
  // product would have no evidence to record either way.
  if (newWords.length === 0) return { kind: "nothing_new" };
  return { kind: "usable", newWords };
}
