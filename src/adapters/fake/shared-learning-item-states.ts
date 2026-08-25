import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

/**
 * The one table two fakes were pretending to be separately.
 *
 * In production, the beginner evidence write and the review queue read the same
 * `learning_item_states` row. The in-memory fakes held two unconnected maps, so
 * a test could show a word being banked and a review queue staying empty and
 * neither would be wrong — the fake simply did not model the thing that links
 * them. That is the shape of defect this repository has been bitten by before:
 * a fixture that passes for a reason production does not share.
 */
const states = new Map<string, LearningReviewItemState>();

function key(ownerUserId: string, itemKey: string): string {
  return `${ownerUserId}:${itemKey.toLowerCase()}`;
}

export function upsertBeginnerReviewSchedule(input: {
  readonly ownerUserId: string;
  readonly itemKey: string;
  readonly reviewState: unknown;
  readonly nextReviewAt: string;
}): void {
  const existing = states.get(key(input.ownerUserId, input.itemKey));
  states.set(key(input.ownerUserId, input.itemKey), {
    ownerUserId: input.ownerUserId,
    itemKey: input.itemKey.toLowerCase(),
    // Null on purpose: a beginner word has no lesson behind it, and that is
    // exactly the case the review queue used to drop.
    sourceLessonVersionId: null,
    exposureCount: (existing?.exposureCount ?? 0) + 1,
    attemptCount: (existing?.attemptCount ?? 0) + 1,
    successfulRetrievals: existing?.successfulRetrievals ?? 0,
    lastOutcome: existing?.lastOutcome ?? null,
    lastSeenAt: new Date().toISOString(),
    nextReviewAt: input.nextReviewAt,
    lastDelayedTransferAt: existing?.lastDelayedTransferAt ?? null,
    lastIndependentAt: existing?.lastIndependentAt ?? null,
    transferAttemptedAt: existing?.transferAttemptedAt ?? null,
    transferSucceededAt: existing?.transferSucceededAt ?? null,
    reviewState: input.reviewState as LearningReviewItemState["reviewState"],
  });
}

export function beginnerScheduledFor(
  ownerUserId: string,
): LearningReviewItemState[] {
  return [...states.values()].filter(
    (state) => state.ownerUserId === ownerUserId,
  );
}
