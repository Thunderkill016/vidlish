/**
 * Turns a set of scored repetitions into a statement about the learner.
 *
 * What the instrument measures is where sentences stop being reproducible, so
 * the answer is a length, not a percentage. Reporting "you scored 68%" would be
 * a number nobody can act on; "you hold sentences up to about ten syllables"
 * says what changed and what to practise.
 *
 * It is reported as a band, and the band is not a decoration. The lengths a
 * learner passes and fails interleave near their ceiling — that is what a
 * ceiling looks like — and collapsing that to one number would invent
 * precision the attempt does not contain. The band is bounded by the longest
 * length they passed and the shortest they failed; when those cross, the band
 * is wide and says so.
 *
 * There is a second reason for the band, specific to this product. The
 * repetition is transcribed by a recogniser that has never been measured on
 * Vietnamese-accented English. Until it has, a point estimate would be
 * attributing the recogniser's errors to the learner.
 */

import { EI_MAX_SYLLABLES, EI_MIN_SYLLABLES } from "@/modules/measurement/content/elicited-imitation-items";

export type ScoredImitation = {
  readonly syllables: number;
  /** Word errors against the played sentence. */
  readonly errors: number;
};

export type ImitationCeiling =
  | {
      kind: "measured";
      /** Longest length reproduced. */
      readonly heldTo: number;
      /** Shortest length that broke down. */
      readonly brokeAt: number;
      readonly attempted: number;
      readonly passed: number;
      /** True when nothing in the bank defeated them — the bank is the limit. */
      readonly aboveBank: boolean;
    }
  | { kind: "not_enough_attempts"; attempted: number; needed: number };

/**
 * A repetition counts as reproduced with at most one word wrong.
 *
 * This threshold is mine, not the literature's. Published rubrics use a scale
 * of several levels and credit meaning retained despite errors of form, which
 * needs a human. One word is the closest inspectable rule: a single slip in a
 * fourteen-syllable sentence is not a failure to parse it, and two starts to be.
 * It is written down here so it can be argued with rather than discovered in a
 * formula.
 */
export const REPRODUCED_WITHIN_ERRORS = 1;

/**
 * Below this many items the band would move more on one misheard word than on
 * a month of learning. Published banks run to about thirty items; a third of
 * one is the least that says anything.
 */
export const MINIMUM_ATTEMPTS = 10;

export function estimateImitationCeiling(
  scored: readonly ScoredImitation[],
): ImitationCeiling {
  if (scored.length < MINIMUM_ATTEMPTS) {
    return {
      kind: "not_enough_attempts",
      attempted: scored.length,
      needed: MINIMUM_ATTEMPTS,
    };
  }

  const passedLengths: number[] = [];
  const failedLengths: number[] = [];
  for (const item of scored) {
    (item.errors <= REPRODUCED_WITHIN_ERRORS ? passedLengths : failedLengths).push(
      item.syllables,
    );
  }

  const heldTo = passedLengths.length > 0 ? Math.max(...passedLengths) : EI_MIN_SYLLABLES - 1;
  const brokeAt =
    failedLengths.length > 0 ? Math.min(...failedLengths) : EI_MAX_SYLLABLES + 1;

  return {
    kind: "measured",
    heldTo,
    brokeAt,
    attempted: scored.length,
    passed: passedLengths.length,
    // Nothing in the bank defeated them, so the number reported is the bank's
    // ceiling and not the learner's. Saying otherwise would credit the
    // instrument's limit to the person.
    aboveBank: failedLengths.length === 0,
  };
}
