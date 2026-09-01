/**
 * Grading a typed answer is the one place where being strict makes the product
 * worse. A learner who types `dont` for `don't`, or capitalises the first word,
 * has understood the sentence; failing them teaches nothing.
 *
 * Normalization is deliberately narrow: it forgives case, surrounding
 * punctuation and whitespace, and the shapes of a typed apostrophe. It does not
 * forgive a different word, and it never edits the stored answer — the lesson
 * itself is untouched.
 */
const APOSTROPHES = /[‘’ʼ´`]/g;
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

export function normalizeTypedAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .replace(APOSTROPHES, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(EDGE_PUNCTUATION, "");
}

export function isTypedAnswerCorrect(given: string, expected: string): boolean {
  const normalizedExpected = normalizeTypedAnswer(expected);
  if (normalizedExpected.length === 0) return false;
  return normalizeTypedAnswer(given) === normalizedExpected;
}

/** The blank a cloze sentence is written around. */
export const CLOZE_BLANK = "___";

/**
 * Splits `"I ___ every morning"` into the text before and after the blank so
 * the input can be rendered inline, where the learner reads the sentence as one
 * sentence instead of as a prompt above a box.
 */
export function splitClozeSentence(sentence: string): {
  before: string;
  after: string;
  hasBlank: boolean;
} {
  const at = sentence.indexOf(CLOZE_BLANK);
  if (at < 0) return { before: sentence, after: "", hasBlank: false };
  return {
    before: sentence.slice(0, at),
    after: sentence.slice(at + CLOZE_BLANK.length),
    hasBlank: true,
  };
}
