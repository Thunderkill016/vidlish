import { z } from "zod";

import {
  activityEvaluationSchema,
  activityResponseSchema,
  sourceEvidenceSchema,
} from "@/shared/contracts/lesson-v2";

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
  })
  .strict();

export type LearningLabAttemptRequest = z.infer<
  typeof learningLabAttemptRequestSchema
>;
export type LearningLabAttemptResponse = z.infer<
  typeof learningLabAttemptResponseSchema
>;
