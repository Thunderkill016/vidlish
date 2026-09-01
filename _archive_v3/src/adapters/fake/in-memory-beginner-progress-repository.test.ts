import { describe, expect, it } from "vitest";

import { InMemoryBeginnerProgressRepository } from "./in-memory-beginner-progress-repository";

const OWNER = "d1111111-1111-4111-8111-111111111111";

describe("InMemoryBeginnerProgressRepository challenge evidence", () => {
  it("keeps successful independent dictation out of productive known words", async () => {
    const repository = new InMemoryBeginnerProgressRepository();
    const challenge = await repository.createEvidenceChallenge({
      ownerUserId: OWNER,
      kind: "dictation",
      word: "water",
      sentence: "I want water.",
    });

    const evidence = await repository.recordChallengeEvidence({
      ownerUserId: OWNER,
      challengeId: challenge.id,
      successful: true,
      independent: true,
    });

    expect(evidence.successfulDictations).toBe(1);
    expect(evidence.lastSuccessfulDictationAt).not.toBeNull();
    expect(evidence.lastIndependentDictationAt).not.toBeNull();
    expect(evidence.successfulRetrievals).toBe(0);
    expect(evidence.lastIndependentAt).toBeNull();
    await expect(repository.knownWords(OWNER)).resolves.toEqual([]);
  });

  it("records supported successful dictation without claiming independence", async () => {
    const repository = new InMemoryBeginnerProgressRepository();
    const challenge = await repository.createEvidenceChallenge({
      ownerUserId: OWNER,
      kind: "dictation",
      word: "water",
      sentence: "Water is here.",
    });

    const evidence = await repository.recordChallengeEvidence({
      ownerUserId: OWNER,
      challengeId: challenge.id,
      successful: true,
      independent: false,
    });

    expect(evidence.successfulDictations).toBe(1);
    expect(evidence.lastSuccessfulDictationAt).not.toBeNull();
    expect(evidence.lastIndependentDictationAt).toBeNull();
    expect(evidence.lastIndependentAt).toBeNull();
  });

  it("can later promote the same word through independent introduction without erasing dictation history", async () => {
    const repository = new InMemoryBeginnerProgressRepository();
    const dictation = await repository.createEvidenceChallenge({
      ownerUserId: OWNER,
      kind: "dictation",
      word: "water",
      sentence: "I want water.",
    });
    await repository.recordChallengeEvidence({
      ownerUserId: OWNER,
      challengeId: dictation.id,
      successful: true,
      independent: true,
    });

    const introduction = await repository.createEvidenceChallenge({
      ownerUserId: OWNER,
      kind: "introduce_word",
      word: "water",
      sentence: null,
    });
    const evidence = await repository.recordChallengeEvidence({
      ownerUserId: OWNER,
      challengeId: introduction.id,
      successful: true,
      independent: true,
    });

    expect(evidence.successfulRetrievals).toBe(1);
    expect(evidence.lastIndependentAt).not.toBeNull();
    expect(evidence.successfulDictations).toBe(1);
    expect(evidence.lastIndependentDictationAt).not.toBeNull();
    await expect(repository.knownWords(OWNER)).resolves.toEqual(["water"]);
  });

  it("rejects impossible independent failure without consuming the challenge", async () => {
    const repository = new InMemoryBeginnerProgressRepository();
    const challenge = await repository.createEvidenceChallenge({
      ownerUserId: OWNER,
      kind: "dictation",
      word: "water",
      sentence: "I want water.",
    });

    await expect(
      repository.recordChallengeEvidence({
        ownerUserId: OWNER,
        challengeId: challenge.id,
        successful: false,
        independent: true,
      }),
    ).rejects.toThrow(/must be successful/i);

    await expect(
      repository.evidenceChallenge({
        ownerUserId: OWNER,
        challengeId: challenge.id,
      }),
    ).resolves.not.toBeNull();
  });
});
