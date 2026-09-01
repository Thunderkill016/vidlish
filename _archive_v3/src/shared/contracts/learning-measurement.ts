import { z } from "zod";

import { learningCapabilityObservationSchema } from "@/shared/contracts/learning-capability";
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
    // Backward-compatible for existing telemetry consumers such as the Gate 5
    // study evaluator: old summaries without capability evidence still parse,
    // while a full /measurement response can be pasted without being rejected
    // by this otherwise-strict contract.
    capabilityObservations: z
      .array(learningCapabilityObservationSchema)
      .optional(),
  })
  .strict();

/**
 * Owner-scoped durable evidence for one lesson session.
 *
 * Product telemetry remains a separate concept from capability evidence. The
 * API response requires observations, while the base telemetry summary keeps
 * them optional so existing summaries and Gate 5 study records remain valid.
 * Observations contain no learner free text, transcript or audio and are
 * projected at read time from immutable blueprint + privacy-safe
 * attempts/support events.
 */
export const learningSessionMeasurementResponseSchema =
  learningMeasurementSummarySchema
    .extend({
      capabilityObservations: z.array(learningCapabilityObservationSchema),
    })
    .strict();

export type LearningMeasurementSummary = z.infer<
  typeof learningMeasurementSummarySchema
>;

export type LearningSessionMeasurementResponse = z.infer<
  typeof learningSessionMeasurementResponseSchema
>;
