/**
 * The evidence a learner from zero accumulates, and the only thing that decides
 * what they meet next.
 *
 * `knownWords` is deliberately narrow: it returns words the learner has
 * produced with no support open, and nothing else. Not words they have seen,
 * not words they recognised on a page. The i+1 gate reads this set, so widening
 * it would not make the learner know more — it would make the product serve
 * sentences they cannot read and call them comprehensible.
 */

export type BeginnerWordEvidence = {
  readonly word: string;
  readonly successfulRetrievals: number;
  readonly lastIndependentAt: string | null;
};

export type CalibrationRecord = {
  readonly checkedAt: string;
  readonly reliable: boolean;
};

export interface BeginnerProgressRepository {
  /** The most recent check of whether this learner's self-reports mean anything. */
  latestCalibration(ownerUserId: string): Promise<CalibrationRecord | null>;

  recordCalibration(input: {
    readonly ownerUserId: string;
    readonly wordTrials: number;
    readonly nonwordTrials: number;
    readonly hits: number;
    readonly falseAlarms: number;
    readonly reliable: boolean;
  }): Promise<CalibrationRecord>;

  knownWords(ownerUserId: string): Promise<string[]>;

  recordWordEvidence(input: {
    readonly ownerUserId: string;
    readonly word: string;
    /** True only when every support was closed. Never inferred. */
    readonly independent: boolean;
  }): Promise<BeginnerWordEvidence>;
}
