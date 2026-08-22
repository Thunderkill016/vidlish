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
 * This is deliberately stricter than a progress score. Exposure, lesson
 * completion, scheduler state, attempt count and supported success are useful
 * operational facts, but none of them upgrades the capability checkpoint.
 *
 * The stages are monotonic in claim strength:
 *
 * durable item exists
 *   -> correct independent production
 *   -> independent production + successful changed-context use
 *   -> the same evidence chain survives a delayed transfer
 *
 * A row with internally inconsistent timestamps is never allowed to skip a
 * weaker prerequisite just because a stronger-looking timestamp is present.
 */
export function derivePersonalLearningCheckpoint(
  items: readonly LearningReviewItemState[],
): PersonalLearningCheckpoint {
  const independent = items.filter((item) => item.lastIndependentAt !== null);
  const transferred = items.filter(
    (item) =>
      item.lastIndependentAt !== null && item.transferSucceededAt !== null,
  );
  const delayedTransfer = items.filter(
    (item) =>
      item.lastIndependentAt !== null &&
      item.transferSucceededAt !== null &&
      item.lastDelayedTransferAt !== null,
  );

  if (delayedTransfer.length > 0) {
    return {
      stage: "delayed_transfer",
      nextAction: "continue_learning",
      itemCount: items.length,
      independentCount: independent.length,
      transferredCount: transferred.length,
      delayedTransferCount: delayedTransfer.length,
    };
  }

  if (transferred.length > 0) {
    return {
      stage: "changed_context_transfer",
      nextAction: "complete_delayed_review",
      itemCount: items.length,
      independentCount: independent.length,
      transferredCount: transferred.length,
      delayedTransferCount: 0,
    };
  }

  if (independent.length > 0) {
    return {
      stage: "independent_retrieval",
      nextAction: "use_changed_context",
      itemCount: items.length,
      independentCount: independent.length,
      transferredCount: 0,
      delayedTransferCount: 0,
    };
  }

  return {
    stage: "building_evidence",
    nextAction: items.length > 0 ? "retrieve_without_support" : "start_learning",
    itemCount: items.length,
    independentCount: 0,
    transferredCount: 0,
    delayedTransferCount: 0,
  };
}
