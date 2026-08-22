import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

export type PersonalLearningCheckpointStage =
  | "building_evidence"
  | "independent_retrieval"
  | "changed_context_transfer"
  | "delayed_transfer";

export type PersonalLearningNextAction =
  | "start_learning"
  | "retrieve_without_support"
  | "use_changed_context"
  | "complete_delayed_review"
  | "continue_learning";

export type PersonalLearningCheckpoint = {
  readonly stage: PersonalLearningCheckpointStage;
  readonly nextAction: PersonalLearningNextAction;
  readonly itemCount: number;
  readonly independentCount: number;
  readonly transferredCount: number;
  readonly delayedTransferCount: number;
};

/**
 * Projects the strongest personal learning claim the durable evidence can make.
 *
 * Beginner `knownWords()` is deliberately narrow in this codebase: it contains
 * only words the learner has independently produced with support closed. That
 * makes its count legitimate independent evidence, even before the learner has
 * any source-lesson review item.
 *
 * Everything stronger still requires the durable review-item chain. Exposure,
 * lesson completion, scheduler state, attempt count and supported success are
 * useful operational facts, but none of them upgrades the checkpoint.
 *
 * The stages are monotonic in claim strength:
 *
 * independent beginner/source production
 *   -> independent source production + successful changed-context use
 *   -> the same source evidence chain survives a delayed transfer
 *
 * A row with internally inconsistent timestamps is never allowed to skip a
 * weaker prerequisite just because a stronger-looking timestamp is present.
 */
export function derivePersonalLearningCheckpoint(input: {
  readonly items: readonly LearningReviewItemState[];
  readonly beginnerIndependentCount: number;
}): PersonalLearningCheckpoint {
  const independentItems = input.items.filter(
    (item) => item.lastIndependentAt !== null,
  );
  const transferred = input.items.filter(
    (item) =>
      item.lastIndependentAt !== null && item.transferSucceededAt !== null,
  );
  const delayedTransfer = input.items.filter(
    (item) =>
      item.lastIndependentAt !== null &&
      item.transferSucceededAt !== null &&
      item.lastDelayedTransferAt !== null,
  );
  const independentCount =
    input.beginnerIndependentCount + independentItems.length;

  if (delayedTransfer.length > 0) {
    return {
      stage: "delayed_transfer",
      nextAction: "continue_learning",
      itemCount: input.items.length,
      independentCount,
      transferredCount: transferred.length,
      delayedTransferCount: delayedTransfer.length,
    };
  }

  if (transferred.length > 0) {
    return {
      stage: "changed_context_transfer",
      nextAction: "complete_delayed_review",
      itemCount: input.items.length,
      independentCount,
      transferredCount: transferred.length,
      delayedTransferCount: 0,
    };
  }

  if (independentCount > 0) {
    return {
      stage: "independent_retrieval",
      nextAction: "use_changed_context",
      itemCount: input.items.length,
      independentCount,
      transferredCount: 0,
      delayedTransferCount: 0,
    };
  }

  return {
    stage: "building_evidence",
    nextAction:
      input.items.length > 0 ? "retrieve_without_support" : "start_learning",
    itemCount: input.items.length,
    independentCount: 0,
    transferredCount: 0,
    delayedTransferCount: 0,
  };
}
