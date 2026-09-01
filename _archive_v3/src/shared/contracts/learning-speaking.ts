import { z } from "zod";

import { learningSupportLevelSchema } from "@/shared/contracts/learning-capability";

const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);
const offsetDateTimeSchema = z.string().datetime({ offset: true });

export const learningSpeakingAttemptSchema = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    activityId: entityIdSchema,
    attemptNumber: z.number().int().positive(),
    support: learningSupportLevelSchema,
    idempotencyKey: z.string().uuid(),
    durationMs: z.number().int().min(500).max(120_000),
    byteCount: z.number().int().min(256).max(5_000_000),
    mimeType: z.string().min(6).max(120).regex(/^audio\//),
    replayed: z.literal(true),
    confirmedAudibleSpeech: z.literal(true),
    createdAt: offsetDateTimeSchema,
  })
  .strict();
export type LearningSpeakingAttempt = z.infer<
  typeof learningSpeakingAttemptSchema
>;

export const recordLearningSpeakingAttemptInputSchema = z
  .object({
    ownerUserId: z.string().uuid(),
    sessionId: z.string().uuid(),
    activityId: entityIdSchema,
    idempotencyKey: z.string().uuid(),
    durationMs: z.number().int().min(500).max(120_000),
    byteCount: z.number().int().min(256).max(5_000_000),
    mimeType: z.string().min(6).max(120).regex(/^audio\//),
    replayed: z.literal(true),
    confirmedAudibleSpeech: z.literal(true),
  })
  .strict();
export type RecordLearningSpeakingAttemptInput = z.infer<
  typeof recordLearningSpeakingAttemptInputSchema
>;

export const learningSpeakingAttemptResponseSchema = z
  .object({
    attempt: learningSpeakingAttemptSchema,
    created: z.boolean(),
  })
  .strict();

export const learningSpeakingReviewCandidateSchema = z
  .object({
    sessionId: z.string().uuid(),
    activityId: entityIdSchema,
    dueAt: offsetDateTimeSchema,
  })
  .strict();
export type LearningSpeakingReviewCandidate = z.infer<
  typeof learningSpeakingReviewCandidateSchema
>;

export const learningSpeakingReviewQueueSchema = z
  .object({
    due: z.array(learningSpeakingReviewCandidateSchema),
    upcoming: learningSpeakingReviewCandidateSchema.nullable(),
  })
  .strict();
export type LearningSpeakingReviewQueue = z.infer<
  typeof learningSpeakingReviewQueueSchema
>;
