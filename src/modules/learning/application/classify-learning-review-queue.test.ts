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
    reviewState: null,
  };
}

describe("classifyLearningReviewQueue", () => {
  it("separates due from upcoming and ignores unsupported item keys", () => {
    const now = new Date("2026-08-19T08:00:00.000Z").getTime();
    const queue = classifyLearningReviewQueue(
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
});
