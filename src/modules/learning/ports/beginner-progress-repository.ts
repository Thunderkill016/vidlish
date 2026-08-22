/**
 * The evidence a learner from zero accumulates, and the only thing that decides
 * what they meet next.
 *
 * `knownWords` is deliberately narrow: it returns words the learner has
 * produced with no support open, and nothing else. Not words they have seen,
 * not words they recognised on a page. The current beginner lexical gate reads
 * this set, so widening it would make the product serve input on evidence the
 * learner has not actually produced.
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

export type BeginnerEvidenceChallengeKind = "introduce_word" | "dictation";

/**
 * Server-owned authority for one learner attempt.
 *
 * The browser may display/hear the sentence, but it never chooses which word or
 * sentence the evidence write is about. `sentence` is null only for the very
 * first standalone word introduction.
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

  knownWords(ownerUserId: string): Promise<string[]>;

  /**
   * Create the opaque server authority a browser attempt must later reference.
   */
  createEvidenceChallenge(input: {
    readonly ownerUserId: string;
    readonly kind: BeginnerEvidenceChallengeKind;
    readonly word: string;
    readonly sentence: string | null;
  }): Promise<BeginnerEvidenceChallenge>;

  /**
   * Resolve only a currently usable challenge owned by this learner.
   */
  evidenceChallenge(input: {
    readonly ownerUserId: string;
    readonly challengeId: string;
  }): Promise<BeginnerEvidenceChallenge | null>;

  /**
   * Atomically consume a server challenge and bank evidence for the word stored
   * on that challenge. The caller supplies only the server-decided independence
   * verdict, never a target word.
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
    /** True only when every support was closed. Never inferred by the adapter. */
    readonly independent: boolean;
  }): Promise<BeginnerWordEvidence>;
}
