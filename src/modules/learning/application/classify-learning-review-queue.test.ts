import { describe, expect, it } from "vitest";

import { classifyLearningReviewQueue } from "@/modules/learning/application/classify-learning-review-queue";
import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";

function item(
  itemKey: string,
  nextReviewAt: string,
): LearningReviewItemState {
  return {
    ownerUserId: OWNER_ID,
    itemKey,
    sourceLessonVersionId: VERSION_ID,
    exposureCount: 1,
    attemptCount: 0,
    successfulRetrievals: 0,
    lastOutcome: null,
    lastSeenAt: "2026-08-18T00:00:00.000Z",
    nextReviewAt,
    lastDelayedTransferAt: null,
    lastIndependentAt: null,
    transferAttemptedAt: null,
    transferSucceededAt: null,
    reviewState: null,
  };
}

describe("classifyLearningReviewQueue", () => {
  it("separates due from upcoming and ignores unsupported item keys", async () => {
    const now = new Date("2026-08-19T08:00:00.000Z").getTime();
    const queue = await classifyLearningReviewQueue(
      [
        item("a-member-of", "2026-08-19T07:59:00.000Z"),
        item("future-supported", "2026-08-20T08:00:00.000Z"),
        item("unsupported", "2026-08-18T08:00:00.000Z"),
      ],
      (itemKey) => itemKey !== "unsupported",
      now,
    );

    expect(queue.supported.map((entry) => entry.itemKey)).toEqual([
      "a-member-of",
      "future-supported",
    ]);
    expect(queue.due.map((entry) => entry.itemKey)).toEqual(["a-member-of"]);
    expect(queue.upcoming?.itemKey).toBe("future-supported");
  });

  it("keeps an item whose key no fixture has ever heard of", async () => {
    // The queue used to ask a fixture that knew one hard-coded key, so an item
    // from a learner's own video was dropped here even though the review API
    // could build its task. The predicate now answers from the lesson, and this
    // holds the two sides to the same answer.
    const now = new Date("2026-08-19T08:00:00.000Z").getTime();
    const queue = await classifyLearningReviewQueue(
      [item("arbitrary-key-0", "2026-08-19T07:59:00.000Z")],
      async (itemKey) => itemKey === "arbitrary-key-0",
      now,
    );

    expect(queue.due.map((entry) => entry.itemKey)).toEqual(["arbitrary-key-0"]);
  });

  it("preserves order when the predicate resolves out of order", async () => {
    // Resolved in parallel, so a slow answer must not reorder the queue or
    // shift which decision belongs to which item.
    const now = new Date("2026-08-19T08:00:00.000Z").getTime();
    const queue = await classifyLearningReviewQueue(
      [
        item("slow-supported", "2026-08-19T07:00:00.000Z"),
        item("fast-unsupported", "2026-08-19T07:30:00.000Z"),
        item("fast-supported", "2026-08-19T07:59:00.000Z"),
      ],
      async (itemKey) => {
        if (itemKey === "slow-supported") {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        return itemKey !== "fast-unsupported";
      },
      now,
    );

    expect(queue.due.map((entry) => entry.itemKey)).toEqual([
      "slow-supported",
      "fast-supported",
    ]);
  });
});
