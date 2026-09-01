import { z } from "zod";

import {
  activityEvaluationSchema,
  activityResponseSchema,
  lessonSessionSchema,
  sourceEvidenceSchema,
  targetLanguageItemSchema,
} from "@/shared/contracts/lesson-v2";
import {
  persistedLearningSupportStepSchema,
  privacySafeActivityAttemptSchema,
  privacySafeLearningSupportEventSchema,
} from "@/shared/contracts/privacy-safe-learning-evidence";

const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);

const learnerTargetAfterAttemptSchema = targetLanguageItemSchema
  .pick({
    id: true,
    itemKey: true,
    surfaceForm: true,
    contextualMeaningVi: true,
    communicativeFunctionVi: true,
    register: true,
    pronunciationNoteVi: true,
  })
  .strict();

/**
 * What the server durably holds for each activity in this session.
 *
 * VLR-103. The browser used to be the only source of restored support state, so
 * a learner returning on another device saw an untouched ladder while the
 * server already held the caption they had opened. Support level is a claim
 * about what help someone was given; the durable record has to be the one that
 * answers it.
 */
export const learningActivityDurableProgressSchema = z
  .object({
    activityId: entityIdSchema,
    playbackCount: z.number().int().min(0),
    attemptCount: z.number().int().min(0),
    openedSupportSteps: z.array(persistedLearningSupportStepSchema),
  })
  .strict();

export const learningLabSessionResponseSchema = z
  .object({
    session: lessonSessionSchema,
    created: z.boolean(),
    progress: z.array(learningActivityDurableProgressSchema),
  })
  .strict();

export const learningLabAttemptRequestSchema = z
  .object({
    sessionId: z.string().uuid().optional(),
    activityId: entityIdSchema,
    idempotencyKey: z.string().uuid(),
    response: activityResponseSchema,
  })
  .strict();

export const learningLabAttemptResponseSchema = z
  .object({
    activityId: entityIdSchema,
    idempotencyKey: z.string().uuid(),
    evaluation: activityEvaluationSchema,
    persistedAttempt: privacySafeActivityAttemptSchema.optional(),
    session: lessonSessionSchema.optional(),
    created: z.boolean().optional(),
    hydratedEvidence: z.array(sourceEvidenceSchema).max(16),
    selfCheckCriteriaVi: z.array(z.string().min(5).max(300)).max(4).optional(),
    postAttemptSupport: z
      .object({
        targetItem: learnerTargetAfterAttemptSchema.nullable(),
        chunkBoundaryText: z.string().min(1).max(1_000).nullable(),
      })
      .strict(),
  })
  .strict();

export const learningLabSupportEventRequestSchema = z.discriminatedUnion(
  "eventKind",
  [
    z
      .object({
        sessionId: z.string().uuid(),
        activityId: entityIdSchema,
        idempotencyKey: z.string().uuid(),
        eventKind: z.literal("playback"),
      })
      .strict(),
    z
      .object({
        sessionId: z.string().uuid(),
        activityId: entityIdSchema,
        idempotencyKey: z.string().uuid(),
        eventKind: z.literal("support_opened"),
        supportStep: persistedLearningSupportStepSchema,
      })
      .strict(),
  ],
);

export const learningLabSupportEventResponseSchema = z
  .object({
    event: privacySafeLearningSupportEventSchema,
    created: z.boolean(),
  })
  .strict();

export type LearningLabSessionResponse = z.infer<
  typeof learningLabSessionResponseSchema
>;

export type LearningLabAttemptRequest = z.infer<
  typeof learningLabAttemptRequestSchema
>;

type ParsedLearningLabAttemptResponse = z.infer<
  typeof learningLabAttemptResponseSchema
>;

export type LearningLabAttemptResponse = Omit<
  ParsedLearningLabAttemptResponse,
  "evaluation"
> & {
  evaluation: ParsedLearningLabAttemptResponse["evaluation"] & {
    reveal?: {
      answer?: string;
      explanationVi?: string;
    };
  };
};

export type LearningLabSupportEventRequest = z.infer<
  typeof learningLabSupportEventRequestSchema
>;

export type LearningLabSupportEventResponse = z.infer<
  typeof learningLabSupportEventResponseSchema
>;

export type LearnerTargetAfterAttempt = z.infer<
  typeof learnerTargetAfterAttemptSchema
>;
