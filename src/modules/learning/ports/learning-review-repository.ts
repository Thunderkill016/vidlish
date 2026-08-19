import type {
  LearningReviewAttemptEvaluation,
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
};

export interface LearningReviewRepository {
  listScheduled(ownerUserId: string): Promise<LearningReviewItemState[]>;

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