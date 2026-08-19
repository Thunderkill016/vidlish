import {
  learnerReviewSessionSchema,
  type LearnerReviewSession,
  type LearningReviewSession,
} from "@/shared/contracts/learning-review";

export function toLearnerReviewSession(
  session: LearningReviewSession,
): LearnerReviewSession {
  return learnerReviewSessionSchema.parse({
    id: session.id,
    scheduledFor: session.scheduledFor,
    variantId: session.variantId,
    status: session.status,
    currentStep: session.currentStep,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
    updatedAt: session.updatedAt,
  });
}
