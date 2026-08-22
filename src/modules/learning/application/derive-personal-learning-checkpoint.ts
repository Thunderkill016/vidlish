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
 * Projects the strongest personal capability claim supported by the durable
 * review-item evidence chain.
 *
 * The beginner lexical gate is intentionally NOT an input here. Its current
 * bootstrap path may bank a server-bound, calibrated learner self-report when
 * there is not yet a sentence to score. That is useful evidence for choosing
 * conservative input, but it is not the same as the system observing correct
 * independent production. A personal capability checkpoint must not silently
 * upgrade that weaker evidence.
 *
 * Exposure, lesson completion, scheduler state, attempt count and supported
 * success likewise do not upgrade the checkpoint.
 *
 * The stages are monotonic in claim strength:
 *
 * correct independent source production
 *   -> independent production + successful changed-context use
 *   -> the same evidence chain survives a delayed transfer
 *
 * An internally inconsistent stronger-looking timestamp cannot skip a weaker
 * prerequisite.
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
