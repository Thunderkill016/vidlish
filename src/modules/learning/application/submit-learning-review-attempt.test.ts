import { describe, expect, it, vi } from "vitest";

import { resolveFixtureLearningReviewPlan } from "@/adapters/fake/fixture-learning-review-plan";
import type { LearningReviewRepository } from "@/modules/learning/ports/learning-review-repository";
import { SubmitLearningReviewAttempt } from "@/modules/learning/application/submit-learning-review-attempt";
import type {
  LearningReviewItemState,
  LearningReviewSession,
} from "@/shared/contracts/learning-review";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";
const VERSION_ID = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-08-19T08:00:00.000Z";

function reviewSession(step: "recall" | "transfer"): LearningReviewSession {
  return {
    id: SESSION_ID,
    ownerUserId: OWNER_ID,
    itemKey: "a-member-of",
    sourceLessonVersionId: VERSION_ID,
    scheduledFor: "2026-08-18T08:00:00.000Z",
    variantId: "review_variant_affiliation_01",
    status: "in_progress",
    currentStep: step,
    startedAt: NOW,
    completedAt: null,
    updatedAt: NOW,
  };
}

function itemState(): LearningReviewItemState {
  return {
    ownerUserId: OWNER_ID,
    itemKey: "a-member-of",
    sourceLessonVersionId: VERSION_ID,
    exposureCount: 1,
    attemptCount: 0,
    successfulRetrievals: 0,
    lastOutcome: null,
    lastSeenAt: NOW,
    nextReviewAt: "2026-08-18T08:00:00.000Z",
    lastDelayedTransferAt: null,
  };
}

function repositoryFor(input: {
  step: "recall" | "transfer";
  recallAttempts?: number;
}) {
  const session = reviewSession(input.step);
  const recordReviewAttempt = vi.fn(async (recordInput) => ({
    attempt: {
      id: "44444444-4444-4444-8444-444444444444",
      reviewSessionId: SESSION_ID,
      step: recordInput.step,
      attemptNumber: 1,
      idempotencyKey: recordInput.idempotencyKey,
      responseEvidence: recordInput.responseEvidence,
      evaluation: recordInput.evaluation,
      submittedAt: NOW,
    },
    session,
    itemState: itemState(),
    created: true,
  }));
  const repository: LearningReviewRepository = {
    listScheduled: vi.fn(async () => [itemState()]),
    startDue: vi.fn(async () => ({ session, created: true })),
    findOwnedReviewSession: vi.fn(async () => session),
    countReviewAttempts: vi.fn(async () => input.recallAttempts ?? 0),
    recordReviewAttempt,
  };
  return { repository, recordReviewAttempt };
}

describe("SubmitLearningReviewAttempt", () => {
  it("strips raw delayed-recall text before persistence", async () => {
    const { repository, recordReviewAttempt } = repositoryFor({ step: "recall" });

    await new SubmitLearningReviewAttempt(
      repository,
      resolveFixtureLearningReviewPlan,
    ).execute({
      ownerUserId: OWNER_ID,
      reviewSessionId: SESSION_ID,
      step: "recall",
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
      response: { kind: "text", text: "PRIVATE raw delayed recall" },
    });

    expect(recordReviewAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        responseEvidence: {
          kind: "text",
          submitted: true,
          characterCount: 26,
        },
        evaluation: { step: "recall", verdict: "incorrect" },
        advance: false,
        complete: false,
        outcome: null,
      }),
    );
    expect(JSON.stringify(recordReviewAttempt.mock.calls[0]?.[0])).not.toContain(
      "PRIVATE raw delayed recall",
    );
  });

  it("marks confirmed delayed transfer hard after a corrected recall and strips raw text", async () => {
    const { repository, recordReviewAttempt } = repositoryFor({
      step: "transfer",
      recallAttempts: 2,
    });

    await new SubmitLearningReviewAttempt(
      repository,
      resolveFixtureLearningReviewPlan,
    ).execute({
      ownerUserId: OWNER_ID,
      reviewSessionId: SESSION_ID,
      step: "transfer",
      idempotencyKey: "66666666-6666-4666-8666-666666666666",
      response: {
        kind: "self_check",
        text: "PRIVATE changed-context sentence",
        checkedCriteria: [0, 1, 2],
      },
    });

    expect(recordReviewAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        responseEvidence: {
          kind: "self_check",
          submitted: true,
          characterCount: 32,
          checkedCriteria: [0, 1, 2],
        },
        evaluation: {
          step: "transfer",
          verdict: "self_check",
          checkedCriteria: [0, 1, 2],
          requiredCriteria: 3,
          confirmed: true,
        },
        advance: false,
        complete: true,
        outcome: "hard",
      }),
    );
    expect(JSON.stringify(recordReviewAttempt.mock.calls[0]?.[0])).not.toContain(
      "PRIVATE changed-context sentence",
    );
  });
});
