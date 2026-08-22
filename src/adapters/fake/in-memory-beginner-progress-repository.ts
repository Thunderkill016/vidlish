import { randomUUID } from "node:crypto";

import type {
  BeginnerEvidenceChallenge,
  BeginnerEvidenceChallengeKind,
  BeginnerProgressRepository,
  BeginnerWordEvidence,
  CalibrationRecord,
} from "@/modules/learning/ports/beginner-progress-repository";

/**
 * The beginner evidence store for development and CI.
 *
 * It reproduces the rules that are easy to lose when the production adapter is
 * unavailable: independence only moves forward, a challenge belongs to one
 * learner, and one challenge can create evidence only once.
 */
type StoredChallenge = BeginnerEvidenceChallenge & {
  consumedAt: string | null;
};

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
      kind: input.kind,
      word: input.word.toLocaleLowerCase("en-US"),
      sentence: input.sentence,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      consumedAt: null,
    };
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  async evidenceChallenge(input: {
    ownerUserId: string;
    challengeId: string;
  }): Promise<BeginnerEvidenceChallenge | null> {
    const challenge = this.challenges.get(input.challengeId);
    if (!challenge) return null;
    if (challenge.consumedAt !== null) return null;
    if (challenge.expiresAt <= new Date().toISOString()) return null;

    const ownerPrefix = `${input.ownerUserId}::`;
    const challengeOwnerKey = this.key(input.ownerUserId, challenge.word);
    // The stored challenge does not expose owner publicly, so use a private
    // marker map key below rather than letting the returned DTO carry identity.
    if (!this.challengeOwners.has(`${input.challengeId}::${input.ownerUserId}`)) {
      void ownerPrefix;
      void challengeOwnerKey;
      return null;
    }
    return challenge;
  }

  private readonly challengeOwners = new Set<string>();

  async recordChallengeEvidence(input: {
    ownerUserId: string;
    challengeId: string;
    independent: boolean;
  }): Promise<BeginnerWordEvidence> {
    const challenge = await this.evidenceChallenge(input);
    if (!challenge) {
      throw new Error("Beginner evidence challenge is not available.");
    }

    const stored = this.challenges.get(input.challengeId);
    if (!stored) {
      throw new Error("Beginner evidence challenge is not available.");
    }
    stored.consumedAt = new Date().toISOString();
    this.challenges.set(stored.id, stored);

    return this.recordWordEvidence({
      ownerUserId: input.ownerUserId,
      word: challenge.word,
      independent: input.independent,
    });
  }

  async recordWordEvidence(input: {
    ownerUserId: string;
    word: string;
    independent: boolean;
  }): Promise<BeginnerWordEvidence> {
    const word = input.word.toLocaleLowerCase("en-US");
    const key = this.key(input.ownerUserId, word);
    const existing = this.rows.get(key);
    const next: BeginnerWordEvidence = {
      word,
      successfulRetrievals:
        (existing?.successfulRetrievals ?? 0) + (input.independent ? 1 : 0),
      lastIndependentAt: input.independent
        ? new Date().toISOString()
        : (existing?.lastIndependentAt ?? null),
    };
    this.rows.set(key, next);
    return next;
  }

  /**
   * Associate a challenge owner without leaking owner identity in the public
   * challenge DTO.
   */
  private rememberChallengeOwner(challengeId: string, ownerUserId: string): void {
    this.challengeOwners.add(`${challengeId}::${ownerUserId}`);
  }
}
