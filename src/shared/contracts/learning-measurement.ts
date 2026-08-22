import { z } from "zod";

import { learningRuntimeErrorKindSchema } from "@/shared/contracts/learning-product-events";
import { persistedLearningSupportStepSchema } from "@/shared/contracts/privacy-safe-learning-evidence";

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

const activitySupportMetricSchema = z
  .object({
    activityId: entityIdSchema,
    playbackCount: z.number().int().nonnegative(),
    openedSupportSteps: z.array(persistedLearningSupportStepSchema),
  })
  .strict();

export const learningMeasurementSummarySchema = z
  .object({
    sessionId: z.string().uuid(),
    status: z.enum(["not_started", "in_progress", "completed", "abandoned"]),
    sessionViewed: z.boolean(),
    completed: z.boolean(),
    observedElapsedSeconds: z.number().int().nonnegative().nullable(),
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
    gist: attemptMetricSchema,
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
    supportByActivity: z.array(activitySupportMetricSchema),
    totalSupportStepsOpened: z.number().int().nonnegative(),
    runtimeErrors: z.array(learningRuntimeErrorKindSchema),
  })
  .strict();

export type LearningMeasurementSummary = z.infer<
  typeof learningMeasurementSummarySchema
>;
