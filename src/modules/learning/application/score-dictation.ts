import { tokenise } from "./check-comprehensible-input";

/**
 * What the learner heard, checked against what was said.
 *
 * This exists to replace a self-report. Asking "did you understand?" measures
 * confidence; asking the learner to write down what they heard measures
 * listening, and a wrong word is a wrong word with nothing left to interpret.
 *
 * The comparison is by position, not by set membership. A learner who writes
 * the right words in the wrong order has not understood the sentence, and a
 * scorer that sorted both sides would call that a perfect answer.
 *
 * Punctuation and case are ignored. A beginner who hears the sentence and
 * writes it without a capital letter has done the thing being measured, and
 * marking them wrong would teach them to attend to the wrong signal.
 */

export type DictationScore = {
  /** Words in the target that the learner reproduced in the right place. */
  readonly correct: number;
  readonly total: number;
  /** Every target word the learner did not produce in its place, in order. */
  readonly missed: string[];
  /** True only when the whole sentence came back. */
  readonly perfect: boolean;
};

export function scoreDictation(input: {
  readonly target: string;
  readonly heard: string;
}): DictationScore {
  const target = tokenise(input.target);
  const heard = tokenise(input.heard);

  const missed: string[] = [];
  let correct = 0;
  for (let index = 0; index < target.length; index += 1) {
    if (heard[index] === target[index]) {
      correct += 1;
      continue;
    }
    missed.push(target[index]);
  }

  return {
    correct,
    total: target.length,
    missed,
    // Extra words at the end are not free: a learner who wrote the sentence and
    // then guessed another word did not reproduce what was said, and counting
    // that as perfect would let padding raise the score.
    perfect: correct === target.length && heard.length === target.length,
  };
}
