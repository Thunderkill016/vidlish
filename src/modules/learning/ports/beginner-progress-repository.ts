/**
 * Lexical evidence accumulated by the current zero-beginner path and used to
 * decide what input the learner may meet next.
 *
 * Important provenance limitation: `knownWords()` is a lexical-gate set, not a
 * capability certification. Dictation can create checked evidence, but the
 * standalone bootstrap path may also bank a calibrated learner self-report
 * when no sentence exists yet to score. The current persistence shape does not
 * expose that provenance distinction through `knownWords()`.
 *
 * Therefore this set may drive the conservative beginner input policy, but it
 * must not by itself upgrade a learner-facing "verified independent ability",
 * changed-context, retained, or mastery claim. A later bounded feature should
 * split/strengthen beginner provenance and add cross-session review.
 */

export type BeginnerWordEvidence = {
  readonly word: string;
  readonly successfulRetrievals: number;
  /**
   * Historical field name retained for schema compatibility. On the current
   * standalone bootstrap path this timestamp can originate from a calibrated
   * self-report, so consumers must not treat it as universally observed speech.
   */
  readonly lastIndependentAt: string | null;
};

export type CalibrationRecord = {
  readonly checkedAt: string;
  readonly reliable: boolean;
};

export type BeginnerEvidenceChallengeKind = "introduce_word" | "dictation";

/**
 * Server-owned authority for one learner attempt.
 *
 * The browser may display/hear the sentence, but it never chooses which word or
 * sentence the evidence write is about. `sentence` is null for a standalone
 * bootstrap introduction.
 */
export type BeginnerEvidenceChallenge = {
  readonly id: string;
  readonly kind: BeginnerEvidenceChallengeKind;
  readonly word: string;
  readonly sentence: string | null;
  readonly expiresAt: string;
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

  /** Current lexical-gate set; see the provenance warning above. */
  knownWords(ownerUserId: string): Promise<string[]>;

  /** Create the opaque server authority a browser attempt must later reference. */
  createEvidenceChallenge(input: {
    readonly ownerUserId: string;
    readonly kind: BeginnerEvidenceChallengeKind;
    readonly word: string;
    readonly sentence: string | null;
  }): Promise<BeginnerEvidenceChallenge>;

  /** Resolve only a currently usable challenge owned by this learner. */
  evidenceChallenge(input: {
    readonly ownerUserId: string;
    readonly challengeId: string;
  }): Promise<BeginnerEvidenceChallenge | null>;

  /**
   * Atomically consume a server challenge and bank lexical-gate evidence for the
   * word stored on that challenge. The caller never supplies a target word.
   *
   * `independent` here is a legacy persistence verdict and is not sufficient by
   * itself for a learner-facing verified-capability claim because bootstrap
   * introductions may be self-reported.
   */
  recordChallengeEvidence(input: {
    readonly ownerUserId: string;
    readonly challengeId: string;
    readonly independent: boolean;
  }): Promise<BeginnerWordEvidence>;

  /**
   * Legacy internal primitive retained for compatibility/tests. New learner
   * routes must use a challenge-bound write instead of choosing a word here.
   */
  recordWordEvidence(input: {
    readonly ownerUserId: string;
    readonly word: string;
    readonly independent: boolean;
  }): Promise<BeginnerWordEvidence>;
}
