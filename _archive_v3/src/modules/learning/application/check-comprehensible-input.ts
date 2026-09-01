/**
 * Applies the current lexical-novelty policy for beginner-generated input.
 *
 * Comprehensibility is broader than word novelty: receptive familiarity,
 * constructions, acoustics, context, task demand and support can all matter.
 * The current beginner generator does not yet model those dimensions. Instead
 * it uses an intentionally conservative, deterministic gate that can be
 * checked before generated language reaches the learner:
 *
 *   every token is in the lexical evidence set except at most the configured
 *   number of new words (one by default).
 *
 * The default is therefore a Vidlish product policy, not a universal
 * definition of Krashen's `i+1` or a claim that one unknown word is the SLA
 * threshold for every learner and sentence.
 *
 * Today the caller's lexical set is built from independently produced language
 * because that is the durable evidence the current system can project safely.
 * Unsupported productive recall is strong productive evidence; it is not the
 * only possible form of receptive lexical knowledge. A later capability-model
 * feature may provide additional evidence without changing this function's
 * fail-closed role.
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
  /** Defaults to the current conservative lexical-novelty budget: one. */
  maxNewWords?: number;
}): ComprehensibleInputVerdict {
  const budget = input.maxNewWords ?? 1;
  const words = tokenise(input.sentence);

  // Order preserved and duplicates collapsed: a word repeated in one sentence
  // is one new lexical item for this gate, not two occurrences.
  const newWords = [...new Set(words.filter((word) => !input.known.has(word)))];

  if (newWords.length > budget) return { kind: "too_hard", newWords };
  // Input with nothing new can still be useful language exposure, but this
  // specific generator exists to introduce a selected target. Accepting a
  // zero-novelty draft here would spend that teaching slot without introducing
  // the target the batch was requested for.
  if (newWords.length === 0) return { kind: "nothing_new" };
  return { kind: "usable", newWords };
}
