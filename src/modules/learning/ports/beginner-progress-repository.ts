/**
 * The evidence a learner from zero accumulates, and the only thing that decides
 * what they meet next.
 *
 * `knownWords` is deliberately narrow: it returns words the learner has
 * produced with no support open, and nothing else. Not words they have seen,
 * not words they recognised on a page, and not words they copied correctly in
 * dictation. The current beginner lexical gate reads this set, so widening it
 * would make the product serve input on evidence the learner has not actually
 * produced independently.
 */

export type BeginnerWordEvidence = {
  readonly word: string;
  /** Productive retrieval evidence used by the current known-word gate. */
  readonly successfulRetrievals: number;
  readonly lastIndependentAt: string | null;
  /** Dictation is useful listening/orthographic evidence, but not productive-known evidence. */
  readonly successfulDictations: number;
  readonly lastSuccessfulDictationAt: string | null;
  readonly lastIndependentDictationAt: string | null;
};

export type CalibrationRecord = {
  readonly checkedAt: string;
  readonly reliable: boolean;
};

/**
 * Which kind of work the server issued the challenge for.
 *
 * This is the only thing that decides which capability dimension an attempt
 * lands in, and the browser never sends it. The curriculum labels activities
 * with a skill; if the browser could choose the kind, "I typed it" and "I said
 * it" would be the same claim, which is how thirteen speaking activities came
 * to be answered without anyone speaking.
 */
export type BeginnerEvidenceChallengeKind =
  | "introduce_word"
  | "dictation"
  | "spoken"
  | "written"
  | "reading";

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
   * on that challenge. The caller supplies outcome strength only; the
   * server-owned challenge kind decides which capability dimension is updated.
   * `independent` is valid only for a successful challenge.
   */
  recordChallengeEvidence(input: {
    readonly ownerUserId: string;
    readonly challengeId: string;
    readonly successful: boolean;
    readonly independent: boolean;
  }): Promise<BeginnerWordEvidence>;

  /**
   * The item's current spacing schedule, or null if it has never been scheduled.
   *
   * Needed because scheduling is arithmetic that belongs in the application
   * layer — FSRS is TypeScript — while the evidence write is a database
   * function. The route reads the previous state, advances it, and writes the
   * result back.
   */
  reviewSchedule(input: {
    readonly ownerUserId: string;
    readonly itemKey: string;
  }): Promise<{ readonly reviewState: unknown; readonly nextReviewAt: string | null } | null>;

  /**
   * Record when this item comes back, and the state that decided it.
   *
   * Words learned on the beginner track used to be banked and then never
   * scheduled: nothing set `next_review_at`, so nothing ever put them in a
   * review queue, so a learner met a word once and never saw it again. Every
   * measurement in this product assumes 8-12 spaced reviews per item; without
   * this write there were zero.
   */
  scheduleReview(input: {
    readonly ownerUserId: string;
    readonly itemKey: string;
    readonly reviewState: unknown;
    readonly nextReviewAt: string;
  }): Promise<void>;

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
