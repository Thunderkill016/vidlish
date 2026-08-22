import { z } from "zod";

import { learningRuntimeErrorKindSchema } from "@/shared/contracts/learning-product-events";

const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);
const verdictSchema = z.enum(["correct", "incorrect", "self_check", "unscored"]);

const attemptMetricSchema = z
  .object({
    activityId: entityIdSchema.nullable(),
    attemptCount: z.number().int().nonnegative(),
    latestVerdict: verdictSchema.nullable(),
    correctCount: z.number().int().nonnegative(),
  })
  .strict();

export const learningMeasurementSummarySchema = z
  .object({
    sessionId: z.string().uuid(),
    status: z.enum(["not_started", "in_progress", "completed", "abandoned"]),
    sessionViewed: z.boolean(),
    completed: z.boolean(),
    lastKnownActivityId: entityIdSchema,
    incompleteAtLastKnownActivity: entityIdSchema.nullable(),
    firstSource: z
      .object({
        activityId: entityIdSchema.nullable(),
        playStarted: z.boolean(),
        playCompleted: z.boolean(),
        replayed: z.boolean(),
      })
      .strict(),
    targetNotice: z
      .object({
        activityId: entityIdSchema.nullable(),
        attempted: z.boolean(),
      })
      .strict(),
    correction: z
      .object({
        incorrectAttemptCount: z.number().int().nonnegative(),
        shownCount: z.number().int().nonnegative(),
      })
      .strict(),
    retrieval: attemptMetricSchema,
    transfer: attemptMetricSchema,
    afterListen: attemptMetricSchema,
    totalSupportStepsOpened: z.number().int().nonnegative(),
    runtimeErrors: z.array(learningRuntimeErrorKindSchema),
  })
  .strict();

export type LearningMeasurementSummary = z.infer<
  typeof learningMeasurementSummarySchema
>;
