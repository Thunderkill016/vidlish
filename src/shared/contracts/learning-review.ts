import { z } from "zod";

import { activityResponseSchema } from "@/shared/contracts/lesson-v2";
import { privacySafeActivityResponseSchema } from "@/shared/contracts/privacy-safe-learning-evidence";

const offsetDateTimeSchema = z.string().datetime({ offset: true });
const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);
const itemKeySchema = z.string().min(1).max(160);

export const learningReviewStepSchema = z.enum(["recall", "transfer", "completed"]);
export type LearningReviewStep = z.infer<typeof learningReviewStepSchema>;

export const learningReviewOutcomeSchema = z.enum(["again", "hard", "good"]);
export type LearningReviewOutcome = z.infer<typeof learningReviewOutcomeSchema>;

/**
 * The scheduler's state for one item, as persisted.
 *
 * It lives in the contracts layer because the database checks the version tag
 * and a later migration has nothing else to read these rows by. Serialisable on
 * purpose: no scheduler types cross this boundary.
 */
export const persistedReviewStateSchema = z
  .object({
    version: z.literal("review-state:v1"),
    due: offsetDateTimeSchema,
    stability: z.number(),
    difficulty: z.number(),
    elapsedDays: z.number(),
    scheduledDays: z.number(),
    reps: z.number().int().nonnegative(),
    lapses: z.number().int().nonnegative(),
    learningSteps: z.number().int().nonnegative(),
    state: z.number().int().nonnegative(),
    lastReview: offsetDateTimeSchema.nullable(),
  })
  .strict();
export type PersistedReviewState = z.infer<typeof persistedReviewStateSchema>;

export const learningReviewItemStateSchema = z
  .object({
    ownerUserId: z.string().uuid(),
    itemKey: itemKeySchema,
    sourceLessonVersionId: z.string().uuid(),
    exposureCount: z.number().int().nonnegative(),
    attemptCount: z.number().int().nonnegative(),
    successfulRetrievals: z.number().int().nonnegative(),
    lastOutcome: learningReviewOutcomeSchema.nullable(),
    lastSeenAt: offsetDateTimeSchema,
    nextReviewAt: offsetDateTimeSchema.nullable(),
    lastDelayedTransferAt: offsetDateTimeSchema.nullable(),
    /**
     * Last correct production with no support open, and last confirmed reuse in
     * a changed context. Separate from the counts on purpose: a due date says
     * when to ask again, and a count says how often they tried — neither says
     * the learner can do it unaided.
     */
    lastIndependentAt: offsetDateTimeSchema.nullable(),
    transferSucceededAt: offsetDateTimeSchema.nullable(),
    reviewState: persistedReviewStateSchema.nullable(),
  })
  .strict();
export type LearningReviewItemState = z.infer<typeof learningReviewItemStateSchema>;

export const learningReviewSessionSchema = z
  .object({
    id: z.string().uuid(),
    ownerUserId: z.string().uuid(),
    itemKey: itemKeySchema,
    sourceLessonVersionId: z.string().uuid(),
    scheduledFor: offsetDateTimeSchema,
    variantId: entityIdSchema,
    status: z.enum(["in_progress", "completed", "abandoned"]),
    currentStep: learningReviewStepSchema,
    startedAt: offsetDateTimeSchema,
    completedAt: offsetDateTimeSchema.nullable(),
    updatedAt: offsetDateTimeSchema,
  })
  .strict();
export type LearningReviewSession = z.infer<typeof learningReviewSessionSchema>;

export const learningReviewAttemptEvaluationSchema = z.discriminatedUnion("step", [
  z
    .object({
      step: z.literal("recall"),
      verdict: z.enum(["correct", "incorrect"]),
    })
    .strict(),
  z
    .object({
      step: z.literal("transfer"),
      verdict: z.literal("self_check"),
      checkedCriteria: z.array(z.number().int().nonnegative()).max(8),
      requiredCriteria: z.number().int().positive().max(8),
      confirmed: z.boolean(),
    })
    .strict(),
]);
export type LearningReviewAttemptEvaluation = z.infer<
  typeof learningReviewAttemptEvaluationSchema
>;

export const privacySafeLearningReviewAttemptSchema = z
  .object({
    id: z.string().uuid(),
    reviewSessionId: z.string().uuid(),
    step: z.enum(["recall", "transfer"]),
    attemptNumber: z.number().int().positive(),
    idempotencyKey: z.string().uuid(),
    responseEvidence: privacySafeActivityResponseSchema,
    evaluation: learningReviewAttemptEvaluationSchema,
    submittedAt: offsetDateTimeSchema,
  })
  .strict();
export type PrivacySafeLearningReviewAttempt = z.infer<
  typeof privacySafeLearningReviewAttemptSchema
>;

export const learnerReviewSessionSchema = learningReviewSessionSchema
  .omit({ ownerUserId: true, itemKey: true, sourceLessonVersionId: true })
  .strict();
export type LearnerReviewSession = z.infer<typeof learnerReviewSessionSchema>;

export const learningReviewRecallTaskSchema = z
  .object({
    step: z.literal("recall"),
    promptVi: z.string().min(5).max(500),
  })
  .strict();

export const learningReviewTransferTaskSchema = z
  .object({
    step: z.literal("transfer"),
    scenarioVi: z.string().min(10).max(700),
    promptVi: z.string().min(5).max(500),
  })
  .strict();

export const learningReviewTaskSchema = z.discriminatedUnion("step", [
  learningReviewRecallTaskSchema,
  learningReviewTransferTaskSchema,
]);
export type LearningReviewTask = z.infer<typeof learningReviewTaskSchema>;

export const learningReviewStartResponseSchema = z
  .object({
    session: learnerReviewSessionSchema,
    task: learningReviewTaskSchema,
  })
  .strict();

export const learningReviewAttemptRequestSchema = z
  .object({
    sessionId: z.string().uuid(),
    step: z.enum(["recall", "transfer"]),
    idempotencyKey: z.string().uuid(),
    response: activityResponseSchema,
  })
  .strict();

const recallPostAttemptSchema = z
  .object({
    step: z.literal("recall"),
    answerAfterAttempt: z.string().min(1).max(160),
    correctionVi: z.string().min(5).max(500),
    nextTask: learningReviewTransferTaskSchema.nullable(),
  })
  .strict();

const transferPostAttemptSchema = z
  .object({
    step: z.literal("transfer"),
    criteriaVi: z.array(z.string().min(5).max(300)).min(2).max(8),
    exemplarAfterAttempt: z.string().min(1).max(700),
    outcome: learningReviewOutcomeSchema.nullable(),
  })
  .strict();

export const learningReviewAttemptResponseSchema = z
  .object({
    session: learnerReviewSessionSchema,
    evaluation: learningReviewAttemptEvaluationSchema,
    created: z.boolean(),
    postAttempt: z.discriminatedUnion("step", [
      recallPostAttemptSchema,
      transferPostAttemptSchema,
    ]),
  })
  .strict();

export type LearningReviewStartResponse = z.infer<
  typeof learningReviewStartResponseSchema
>;
export type LearningReviewAttemptRequest = z.infer<
  typeof learningReviewAttemptRequestSchema
>;
export type LearningReviewAttemptResponse = z.infer<
  typeof learningReviewAttemptResponseSchema
>;