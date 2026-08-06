import { z } from "zod";

import {
  activityEvaluationSchema,
  activityResponseSchema,
  sourceEvidenceSchema,
  targetLanguageItemSchema,
} from "@/shared/contracts/lesson-v2";

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

export const learningLabAttemptRequestSchema = z
  .object({
    activityId: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/),
    idempotencyKey: z.string().uuid(),
    response: activityResponseSchema,
  })
  .strict();

export const learningLabAttemptResponseSchema = z
  .object({
    activityId: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/),
    idempotencyKey: z.string().uuid(),
    evaluation: activityEvaluationSchema,
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

export type LearnerTargetAfterAttempt = z.infer<
  typeof learnerTargetAfterAttemptSchema
>;
