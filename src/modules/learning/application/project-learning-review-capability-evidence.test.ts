import { describe, expect, it } from "vitest";

import { privacySafeLearningReviewAttemptSchema } from "@/shared/contracts/learning-review";

import { projectLearningReviewCapabilityEvidence } from "./project-learning-review-capability-evidence";

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const NOW = "2026-08-23T14:00:00.000Z";

function recallAttempt(input: {
  number: number;
  verdict: "correct" | "incorrect";
}) {
  const id = input.number === 1
    ? "22222222-2222-4222-8222-222222222222"
    : "33333333-3333-4333-8333-333333333333";
  return privacySafeLearningReviewAttemptSchema.parse({
    id,
    reviewSessionId: SESSION_ID,
    step: "recall",
    attemptNumber: input.number,
    idempotencyKey: id,
    responseEvidence: { kind: "text", submitted: true, characterCount: 11 },
    evaluation: { step: "recall", verdict: input.verdict },
    submittedAt: NOW,
  });
}

describe("projectLearningReviewCapabilityEvidence", () => {
  it("treats first typed delayed recall as objective independent writing", () => {
    expect(
      projectLearningReviewCapabilityEvidence({
        itemKey: "a-member-of",
        attempt: recallAttempt({ number: 1, verdict: "correct" }),
      }),
    ).toEqual([
      expect.objectContaining({
        subject: { kind: "language_item", key: "a-member-of" },
        targetSkill: "writing",
        support: "independent",
        responseMode: "writing",
        verification: "objective",
        outcome: "successful",
        evidenceKind: "learning_review",
      }),
    ]);
  });

  it("keeps an incorrect first recall as independent objective failure", () => {
    expect(
      projectLearningReviewCapabilityEvidence({
        itemKey: "a-member-of",
        attempt: recallAttempt({ number: 1, verdict: "incorrect" }),
      })[0],
    ).toMatchObject({
      targetSkill: "writing",
      support: "independent",
      verification: "objective",
      outcome: "unsuccessful",
    });
  });

  it("marks later recall supported because the previous attempt revealed the answer", () => {
    expect(
      projectLearningReviewCapabilityEvidence({
        itemKey: "a-member-of",
        attempt: recallAttempt({ number: 2, verdict: "correct" }),
      })[0],
    ).toMatchObject({
      targetSkill: "writing",
      support: "supported",
      verification: "objective",
      outcome: "successful",
    });
  });

  it("keeps delayed transfer as supported unscored self-check", () => {
    const attempt = privacySafeLearningReviewAttemptSchema.parse({
      id: "44444444-4444-4444-8444-444444444444",
      reviewSessionId: SESSION_ID,
      step: "transfer",
      attemptNumber: 1,
      idempotencyKey: "44444444-4444-4444-8444-444444444444",
      responseEvidence: {
        kind: "self_check",
        submitted: true,
        characterCount: 28,
        checkedCriteriaCount: 3,
      },
      evaluation: {
        step: "transfer",
        verdict: "self_check",
        checkedCriteria: [0, 1, 2],
        requiredCriteria: 3,
        confirmed: true,
      },
      submittedAt: NOW,
    });

    expect(
      projectLearningReviewCapabilityEvidence({
        itemKey: "a-member-of",
        attempt,
      })[0],
    ).toMatchObject({
      targetSkill: "writing",
      support: "supported",
      responseMode: "writing",
      verification: "self_check",
      outcome: "unscored",
      evidenceKind: "learning_review",
    });
  });
});
