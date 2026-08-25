import { tokenise } from "@/modules/learning/application/check-comprehensible-input";
import type { BeginnerSentence } from "@/adapters/vocabulary/beginner-sentence-catalogue";

/**
 * Builds one sentence with a single word removed, for the learner to supply.
 *
 * Built for one sentence the product owner said about himself: *biết từ nhưng
 * không ghép thành câu* — knows the words, cannot assemble them into sentences.
 * Everything this product had measured until now was recognition: known-word
 * counts, coverage percentages, a reading surface that counts words recognised.
 * Recognition is not the blocked step. Production is.
 *
 * Three properties, each forced by something specific:
 *
 * **The context is sparse on purpose.** Three experiments compared practising a
 * word in an informative context, where its meaning could be inferred, against
 * an uninformative one that forced retrieval from memory. The informative
 * context helped comprehension *during* practice — and recall of form, recall of
 * meaning, and recognition in a new context were all better after retrieval. So
 * nothing here hints at the answer.
 *
 * **The learner types the word.** Choosing from options is recognition again,
 * which is the thing that already works for him.
 *
 * **Nothing needs to be said aloud.** He is usually somewhere he cannot speak,
 * and a production route he can only use in private is a production route he
 * mostly does not use.
 *
 * And the unit is the sentence, not the word — the metric Clozemaster changed
 * to and this product had wrong.
 */

export type ClozeItem = {
  /** The full sentence, kept for marking and for showing after the attempt. */
  readonly sentence: string;
  /** The word removed. Lowercased; matching is case-insensitive. */
  readonly answer: string;
  /** The sentence with the answer replaced by a blank. */
  readonly prompt: string;
  readonly sentenceId: number;
};

/** What a blank looks like. Fixed width so its length never hints at the word. */
export const BLANK = "_____";

/**
 * Whether this sentence is usable: every word known except the one being asked
 * for.
 *
 * This is the i+1 gate the product already applies to reading, turned around.
 * A sentence with two unknown words does not test assembly — it tests guessing,
 * and a guess leaves nothing behind.
 */
export function isUsableCloze(
  sentence: BeginnerSentence,
  known: ReadonlySet<string>,
): boolean {
  const target = sentence.target.toLocaleLowerCase("en-US");
  const words = tokenise(sentence.text);
  if (!words.includes(target)) return false;
  return words.every((word) => word === target || known.has(word));
}

export function buildClozeItem(sentence: BeginnerSentence): ClozeItem {
  const answer = sentence.target.toLocaleLowerCase("en-US");
  // Replace only whole words, and only the first occurrence: blanking every
  // instance of a word that repeats turns one question into several, and the
  // learner cannot tell which one is being asked about.
  const prompt = sentence.text.replace(
    new RegExp(`\\b${escapeForRegExp(sentence.target)}\\b`, "iu"),
    BLANK,
  );
  return { sentence: sentence.text, answer, prompt, sentenceId: sentence.id };
}

export type ClozeVerdict = "correct" | "wrong";

/**
 * Marks an answer.
 *
 * Case and surrounding punctuation are forgiven; spelling is not. The learner is
 * being asked to produce a form, and a product that accepts a near-miss teaches
 * the near-miss.
 */
export function markCloze(item: ClozeItem, written: string): ClozeVerdict {
  const cleaned = written
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/^[^a-z']+|[^a-z']+$/g, "");
  return cleaned === item.answer ? "correct" : "wrong";
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Picks the sentences worth asking about, hardest-earned first.
 *
 * Ordered by how much of the sentence the learner already holds: a longer
 * sentence they can otherwise read whole is a bigger step in assembly than a
 * two-word fragment, and assembly is the skill being built.
 */
export function selectClozeItems(input: {
  readonly sentences: readonly BeginnerSentence[];
  readonly known: ReadonlySet<string>;
  readonly wanted: number;
}): readonly ClozeItem[] {
  const usable = input.sentences.filter((sentence) =>
    isUsableCloze(sentence, input.known),
  );
  const ranked = [...usable].sort(
    (a, b) => b.words - a.words || a.id - b.id,
  );
  return ranked.slice(0, input.wanted).map(buildClozeItem);
}
