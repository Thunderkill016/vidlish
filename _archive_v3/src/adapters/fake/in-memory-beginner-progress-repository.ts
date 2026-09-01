import { randomUUID } from "node:crypto";

import type {
  BeginnerEvidenceChallenge,
  BeginnerEvidenceChallengeKind,
  BeginnerProgressRepository,
  BeginnerWordEvidence,
  CalibrationRecord,
} from "@/modules/learning/ports/beginner-progress-repository";

import { upsertBeginnerReviewSchedule } from "./shared-learning-item-states";

/**
 * The beginner evidence store for development and CI.
 *
 * It reproduces the rules that are easy to lose when the production adapter is
 * unavailable: challenge modality is server-owned, independence only moves its
 * matching capability forward, a challenge belongs to one learner, and one
 * challenge can create evidence only once.
 */
type StoredChallenge = BeginnerEvidenceChallenge & {
  ownerUserId: string;
  consumedAt: string | null;
};

function publicChallenge(challenge: StoredChallenge): BeginnerEvidenceChallenge {
  return {
    id: challenge.id,
    kind: challenge.kind,
    word: challenge.word,
    sentence: challenge.sentence,
    expiresAt: challenge.expiresAt,
  };
}

function emptyEvidence(word: string): BeginnerWordEvidence {
  return {
    word,
    successfulRetrievals: 0,
    lastIndependentAt: null,
    successfulDictations: 0,
    lastSuccessfulDictationAt: null,
    lastIndependentDictationAt: null,
  };
}

export class InMemoryBeginnerProgressRepository
  implements BeginnerProgressRepository
{
  private readonly rows = new Map<string, BeginnerWordEvidence>();
  private readonly calibrations = new Map<string, CalibrationRecord>();
  private readonly challenges = new Map<string, StoredChallenge>();

  async latestCalibration(
    ownerUserId: string,
  ): Promise<CalibrationRecord | null> {
    return this.calibrations.get(ownerUserId) ?? null;
  }

  async recordCalibration(input: {
    ownerUserId: string;
    wordTrials: number;
    nonwordTrials: number;
    hits: number;
    falseAlarms: number;
    reliable: boolean;
  }): Promise<CalibrationRecord> {
    const record = {
      checkedAt: new Date().toISOString(),
      reliable: input.reliable,
    };
    this.calibrations.set(input.ownerUserId, record);
    return record;
  }

  private key(ownerUserId: string, word: string): string {
    return `${ownerUserId}::${word.toLocaleLowerCase("en-US")}`;
  }

  private readonly schedules = new Map<
    string,
    { reviewState: unknown; nextReviewAt: string }
  >();

  async reviewSchedule(input: { ownerUserId: string; itemKey: string }) {
    return this.schedules.get(`${input.ownerUserId}:${input.itemKey.toLowerCase()}`) ?? null;
  }

  private readonly exposures = new Map<string, number>();

  async scheduleReview(input: {
    ownerUserId: string;
    itemKey: string;
    reviewState: unknown;
    nextReviewAt: string;
  }) {
    // Production runs an UPDATE against a row the evidence function created, so
    // a word with no evidence behind it is silently not scheduled. The fake used
    // to accept anything, which made it *kinder* than production — and a kinder
    // fake is a test suite that cannot see the bug. A reading feature shipped
    // green here and would have written nothing at all against Supabase.
    if (!this.hasItem(input.ownerUserId, input.itemKey)) return;

    this.schedules.set(`${input.ownerUserId}:${input.itemKey.toLowerCase()}`, {
      reviewState: input.reviewState,
      nextReviewAt: input.nextReviewAt,
    });
    // Production writes this to the same row the review queue reads. The fakes
    // used to be two unconnected maps, which let a test show a word banked and
    // the queue empty without either being wrong.
    upsertBeginnerReviewSchedule(input);
  }

  /** Whether any row exists for this item — evidence or a reading encounter. */
  private hasItem(ownerUserId: string, itemKey: string): boolean {
    const word = itemKey.toLowerCase();
    if (this.exposures.has(`${ownerUserId}:${word}`)) return true;
    return [...this.rows.entries()].some(
      ([key, row]) => key.startsWith(`${ownerUserId}::`) && row.word === word,
    );
  }

  async recordReadingExposure(input: {
    ownerUserId: string;
    itemKey: string;
    reviewState: unknown;
    nextReviewAt: string;
  }) {
    const word = input.itemKey.toLowerCase();
    const key = `${input.ownerUserId}:${word}`;
    this.exposures.set(key, (this.exposures.get(key) ?? 0) + 1);
    this.schedules.set(key, {
      reviewState: input.reviewState,
      nextReviewAt: input.nextReviewAt,
    });
    upsertBeginnerReviewSchedule(input);
  }

  /** How many times a word was met while reading. Never evidence of knowing it. */
  exposureCount(ownerUserId: string, itemKey: string): number {
    return this.exposures.get(`${ownerUserId}:${itemKey.toLowerCase()}`) ?? 0;
  }

  async knownWords(ownerUserId: string): Promise<string[]> {
    const prefix = `${ownerUserId}::`;
    return [...this.rows.entries()]
      .filter(([key, row]) => key.startsWith(prefix) && row.lastIndependentAt)
      .map(([, row]) => row.word)
      .sort();
  }

  async createEvidenceChallenge(input: {
    ownerUserId: string;
    kind: BeginnerEvidenceChallengeKind;
    word: string;
    sentence: string | null;
  }): Promise<BeginnerEvidenceChallenge> {
    const challenge: StoredChallenge = {
      id: randomUUID(),
      ownerUserId: input.ownerUserId,
      kind: input.kind,
      word: input.word.toLocaleLowerCase("en-US"),
      sentence: input.sentence,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      consumedAt: null,
    };
    this.challenges.set(challenge.id, challenge);
    return publicChallenge(challenge);
  }

  async evidenceChallenge(input: {
    ownerUserId: string;
    challengeId: string;
  }): Promise<BeginnerEvidenceChallenge | null> {
    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) return null;
    if (challenge.ownerUserId !== input.ownerUserId) return null;
    if (challenge.consumedAt !== null) return null;
    if (Date.parse(challenge.expiresAt) <= Date.now()) return null;
    return publicChallenge(challenge);
  }

  async recordChallengeEvidence(input: {
    ownerUserId: string;
    challengeId: string;
    successful: boolean;
    independent: boolean;
  }): Promise<BeginnerWordEvidence> {
    if (input.independent && !input.successful) {
      throw new Error("Independent beginner evidence must be successful.");
    }

    const challenge = this.challenges.get(input.challengeId);
    if (
      !challenge ||
      challenge.ownerUserId !== input.ownerUserId ||
      challenge.consumedAt !== null ||
      Date.parse(challenge.expiresAt) <= Date.now()
    ) {
      throw new Error("Beginner evidence challenge is not available.");
    }

    // Mark consumed before mutating evidence. JavaScript execution in this fake
    // is single-process, so subsequent/re-entrant calls observe the consumed
    // state just as the database row lock does in production.
    const now = new Date().toISOString();
    challenge.consumedAt = now;
    this.challenges.set(challenge.id, challenge);

    const key = this.key(input.ownerUserId, challenge.word);
    const existing = this.rows.get(key) ?? emptyEvidence(challenge.word);

    const next: BeginnerWordEvidence =
      challenge.kind === "dictation"
        ? {
            ...existing,
            successfulDictations:
              existing.successfulDictations + (input.successful ? 1 : 0),
            lastSuccessfulDictationAt: input.successful
              ? now
              : existing.lastSuccessfulDictationAt,
            lastIndependentDictationAt: input.independent
              ? now
              : existing.lastIndependentDictationAt,
          }
        : {
            ...existing,
            // Preserve the current productive contract: only independent
            // introduction banks a successful retrieval/known-word timestamp.
            successfulRetrievals:
              existing.successfulRetrievals + (input.independent ? 1 : 0),
            lastIndependentAt: input.independent
              ? now
              : existing.lastIndependentAt,
          };

    this.rows.set(key, next);
    return next;
  }

  async recordWordEvidence(input: {
    ownerUserId: string;
    word: string;
    independent: boolean;
  }): Promise<BeginnerWordEvidence> {
    const word = input.word.toLocaleLowerCase("en-US");
    const key = this.key(input.ownerUserId, word);
    const existing = this.rows.get(key) ?? emptyEvidence(word);
    const next: BeginnerWordEvidence = {
      ...existing,
      successfulRetrievals:
        existing.successfulRetrievals + (input.independent ? 1 : 0),
      lastIndependentAt: input.independent
        ? new Date().toISOString()
        : existing.lastIndependentAt,
    };
    this.rows.set(key, next);
    return next;
  }
}
