import {
  recordReview,
  type ReviewOutcome,
  type ReviewState,
} from "./review-scheduler";

import type { ActivityEvaluation } from "@/shared/contracts/lesson-v2";

/**
 * Turns the result of an activity into the item's next review.
 *
 * This is the join between grading and scheduling, and it is the piece that was
 * missing: `learning_item_states` has carried a due index since the schema was
 * written and no code path has ever put a row in it.
 */

/** The version tag persisted alongside the state, checked by the database. */
export const REVIEW_STATE_VERSION = "review-state:v1";

export type PersistedReviewState = ReviewState & {
  readonly version: typeof REVIEW_STATE_VERSION;
};

export type ItemReviewUpdate = {
  readonly itemKey: string;
  readonly outcome: ReviewOutcome;
  readonly successful: boolean;
  readonly nextReviewAt: string;
  readonly reviewState: PersistedReviewState;
};

/**
 * Reads a verdict as a recall grade, or as nothing at all.
 *
 * Only two of the four verdicts are evidence about memory. A self-check is the
 * learner marking their own work, which is useful feedback and not a retrieval
 * measurement; an unscored activity was never a question. Scheduling either as
 * though it were a graded recall would move an item's due date on the strength
 * of the learner having clicked something.
 *
 * FSRS also accepts `hard` and `easy`, and nothing in the product emits them
 * yet — the activity contract grades correct or incorrect and stops there. They
 * stay unused rather than being faked from a verdict that does not carry them.
 */
export function outcomeFromEvaluation(
  evaluation: ActivityEvaluation,
): ReviewOutcome | null {
  switch (evaluation.verdict) {
    case "correct":
      return "good";
    case "incorrect":
      return "again";
    default:
      return null;
  }
}

/**
 * Schedules every item an activity practised.
 *
 * Returns nothing for a verdict that is not recall evidence, so a caller can
 * hand it any attempt without deciding what counts.
 */
export function scheduleItemReviews(input: {
  readonly itemKeys: readonly string[];
  readonly evaluation: ActivityEvaluation;
  readonly priorStates: ReadonlyMap<string, ReviewState | null>;
  readonly now: Date;
}): ItemReviewUpdate[] {
  const outcome = outcomeFromEvaluation(input.evaluation);
  if (outcome === null) return [];

  // Duplicates would apply the same grade twice and double the interval an item
  // earns from one answer.
  const uniqueKeys = [...new Set(input.itemKeys)];

  return uniqueKeys.map((itemKey) => {
    const next = recordReview(
      input.priorStates.get(itemKey) ?? null,
      outcome,
      input.now,
    );
    return {
      itemKey,
      outcome,
      successful: outcome === "good",
      nextReviewAt: next.due,
      reviewState: { ...next, version: REVIEW_STATE_VERSION },
    };
  });
}
