import type {
  LearningReviewAttemptEvaluation,
  PersistedReviewState,
  LearningReviewItemState,
  LearningReviewOutcome,
  LearningReviewSession,
  PrivacySafeLearningReviewAttempt,
} from "@/shared/contracts/learning-review";
import type { PrivacySafeActivityResponse } from "@/shared/contracts/privacy-safe-learning-evidence";

export type StartLearningReviewInput = {
  ownerUserId: string;
  itemKey: string;
  variantId: string;
};

export type RecordLearningReviewAttemptInput = {
  ownerUserId: string;
  reviewSessionId: string;
  step: "recall" | "transfer";
  idempotencyKey: string;
  responseEvidence: PrivacySafeActivityResponse;
  evaluation: LearningReviewAttemptEvaluation;
  advance: boolean;
  complete: boolean;
  outcome: LearningReviewOutcome | null;
  /**
   * When the item next falls due, computed by the scheduler rather than by the
   * database. Null unless this attempt completes the review.
   */
  nextReviewAt: string | null;
  reviewState: PersistedReviewState | null;
};

export interface LearningReviewRepository {
  listScheduled(ownerUserId: string): Promise<LearningReviewItemState[]>;

  /**
   * The item's current state, including the schedule so far. Needed before
   * grading: without it every review would restart the item from scratch and no
   * item would ever earn a long interval.
   */
  findItemState(
    ownerUserId: string,
    itemKey: string,
  ): Promise<LearningReviewItemState | null>;

  startDue(
    input: StartLearningReviewInput,
  ): Promise<{ session: LearningReviewSession; created: boolean }>;

  findOwnedReviewSession(
    reviewSessionId: string,
    ownerUserId: string,
  ): Promise<LearningReviewSession | null>;

  countReviewAttempts(
    reviewSessionId: string,
    step: "recall" | "transfer",
    ownerUserId: string,
  ): Promise<number>;

  recordReviewAttempt(
    input: RecordLearningReviewAttemptInput,
  ): Promise<{
    attempt: PrivacySafeLearningReviewAttempt;
    session: LearningReviewSession;
    itemState: LearningReviewItemState;
    created: boolean;
  }>;
}