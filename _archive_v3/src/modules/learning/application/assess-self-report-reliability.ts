/**
 * Turns "I know this word" into something a machine can check.
 *
 * The beginner track asks the learner whether they know a word and records the
 * answer. Nothing verified it, and that is the definition of manufactured
 * progress: a learner who is tired, generous with themselves, or mistaken
 * produces exactly the same evidence as one who is right. It matters more here
 * than in most products, because independence is deliberately impossible to
 * erase once written — so a wrong yes is permanent.
 *
 * The vocabulary-testing literature solved this a long time ago by mixing in
 * words that do not exist. Saying yes to one is a false alarm, and the
 * false-alarm rate is what converts a self-report into a score, because raw
 * yes/no answers reliably overstate what someone knows.
 *
 * The correction here is the standard one: subtract the guessing, then rescale
 * by what was left to guess at.
 *
 *     corrected = (hitRate - falseAlarmRate) / (1 - falseAlarmRate)
 *
 * Read plainly: of the real words the learner did not simply say yes to out of
 * habit, what share did they actually know.
 */

export type CalibrationTrial = {
  readonly item: string;
  /** True when the item is a pseudoword that cannot be known. */
  readonly isNonword: boolean;
  /** What the learner reported. Never inferred from anything else. */
  readonly claimedKnown: boolean;
};

export type CalibrationVerdict =
  | {
      kind: "measured";
      hitRate: number;
      falseAlarmRate: number;
      /** Share of real words genuinely known, once guessing is removed. */
      corrected: number;
      reliable: boolean;
    }
  | { kind: "insufficient"; nonwordTrials: number };

/**
 * Below this many nonwords the false-alarm rate is not a rate, it is an
 * anecdote: with one nonword the only possible values are 0 and 1, and either
 * would swing the correction across its whole range.
 */
export const MIN_NONWORD_TRIALS = 3;

/**
 * Above this share of false alarms the session's self-reports are not banked.
 *
 * One in four is the point where the correction starts removing more than it
 * keeps for a learner at this level, and where a plausible innocent
 * explanation — misreading one item — stops covering the result.
 */
export const FALSE_ALARM_CEILING = 0.25;

export function assessSelfReportReliability(
  trials: readonly CalibrationTrial[],
): CalibrationVerdict {
  const nonwords = trials.filter((trial) => trial.isNonword);
  const words = trials.filter((trial) => !trial.isNonword);

  if (nonwords.length < MIN_NONWORD_TRIALS) {
    return { kind: "insufficient", nonwordTrials: nonwords.length };
  }

  const falseAlarmRate =
    nonwords.filter((trial) => trial.claimedKnown).length / nonwords.length;
  const hitRate =
    words.length === 0
      ? 0
      : words.filter((trial) => trial.claimedKnown).length / words.length;

  // Every nonword claimed. Nothing about the real words can be recovered from
  // this, so the correction is not attempted — reporting a small positive
  // number here would be the flattering answer and the false one.
  const corrected =
    falseAlarmRate >= 1
      ? 0
      : Math.max(0, (hitRate - falseAlarmRate) / (1 - falseAlarmRate));

  return {
    kind: "measured",
    hitRate,
    falseAlarmRate,
    corrected,
    reliable: falseAlarmRate <= FALSE_ALARM_CEILING,
  };
}
