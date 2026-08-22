import { describe, expect, it } from "vitest";

import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

import { derivePersonalLearningCheckpoint } from "./derive-personal-learning-checkpoint";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const LESSON_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-08-22T12:00:00+00:00";

function item(
  overrides: Partial<LearningReviewItemState> = {},
): LearningReviewItemState {
  return {
    ownerUserId: OWNER_ID,
    itemKey: "phrase:member-of",
    sourceLessonVersionId: LESSON_VERSION_ID,
    exposureCount: 1,
    attemptCount: 1,
    successfulRetrievals: 0,
    lastOutcome: null,
    lastSeenAt: NOW,
    nextReviewAt: null,
    lastDelayedTransferAt: null,
    lastIndependentAt: null,
    transferAttemptedAt: null,
    transferSucceededAt: null,
    reviewState: null,
    ...overrides,
  };
}

function derive(
  items: readonly LearningReviewItemState[] = [],
  beginnerIndependentCount = 0,
) {
  return derivePersonalLearningCheckpoint({ items, beginnerIndependentCount });
}

describe("derivePersonalLearningCheckpoint", () => {
  it("starts with learning rather than inventing capability when no evidence exists", () => {
    expect(derive()).toEqual({
      stage: "building_evidence",
      nextAction: "start_learning",
      itemCount: 0,
      independentCount: 0,
      transferredCount: 0,
      delayedTransferCount: 0,
    });
  });

  it("counts narrow beginner known-word evidence as independent production", () => {
    const result = derive([], 3);

    expect(result.stage).toBe("independent_retrieval");
    expect(result.nextAction).toBe("continue_beginner_learning");
    expect(result.independentCount).toBe(3);
  });

  it("does not upgrade support-only retrieval, exposure or scheduling", () => {
    const result = derive([
      item({
        exposureCount: 12,
        attemptCount: 8,
        successfulRetrievals: 5,
        nextReviewAt: "2026-08-23T12:00:00+00:00",
        reviewState: {
          version: "review-state:v1",
          due: "2026-08-23T12:00:00+00:00",
          stability: 3,
          difficulty: 4,
          elapsedDays: 1,
          scheduledDays: 2,
          reps: 4,
          lapses: 0,
          learningSteps: 1,
          state: 2,
          lastReview: NOW,
        },
      }),
    ]);

    expect(result.stage).toBe("building_evidence");
    expect(result.nextAction).toBe("retrieve_without_support");
    expect(result.independentCount).toBe(0);
  });

  it("recognises source-lesson independent retrieval only from lastIndependentAt", () => {
    const result = derive([
      item({ lastIndependentAt: NOW, successfulRetrievals: 1 }),
    ]);

    expect(result.stage).toBe("independent_retrieval");
    expect(result.nextAction).toBe("use_changed_context");
    expect(result.independentCount).toBe(1);
  });

  it("does not accept a transfer timestamp without independent production", () => {
    const result = derive([
      item({ transferAttemptedAt: NOW, transferSucceededAt: NOW }),
    ]);

    expect(result.stage).toBe("building_evidence");
    expect(result.transferredCount).toBe(0);
  });

  it("requires independent production plus successful changed-context use", () => {
    const result = derive([
      item({
        successfulRetrievals: 1,
        lastIndependentAt: NOW,
        transferAttemptedAt: NOW,
        transferSucceededAt: NOW,
      }),
    ]);

    expect(result.stage).toBe("changed_context_transfer");
    expect(result.nextAction).toBe("complete_delayed_review");
    expect(result.transferredCount).toBe(1);
  });

  it("does not let a delayed timestamp skip the changed-context prerequisite", () => {
    const result = derive([
      item({ lastIndependentAt: NOW, lastDelayedTransferAt: NOW }),
    ]);

    expect(result.stage).toBe("independent_retrieval");
    expect(result.delayedTransferCount).toBe(0);
  });

  it("reports one complete evidence loop only when delayed transfer follows the prerequisites", () => {
    const result = derive([
      item({
        successfulRetrievals: 2,
        lastIndependentAt: NOW,
        transferAttemptedAt: NOW,
        transferSucceededAt: NOW,
        lastDelayedTransferAt: "2026-08-29T12:00:00+00:00",
      }),
    ]);

    expect(result.stage).toBe("delayed_transfer");
    expect(result.nextAction).toBe("continue_learning");
    expect(result.delayedTransferCount).toBe(1);
  });
});
