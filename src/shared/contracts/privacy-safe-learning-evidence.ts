import { z } from "zod";

import type { ActivityResponse } from "@/shared/contracts/lesson-v2";

const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);

export const privacySafeActivityResponseSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("choice"),
      optionId: entityIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("text"),
      submitted: z.literal(true),
      characterCount: z.number().int().nonnegative().max(20_000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("self_check"),
      submitted: z.literal(true),
      characterCount: z.number().int().nonnegative().max(20_000),
      checkedCriteria: z.array(z.number().int().nonnegative()).max(16),
    })
    .strict(),
  z
    .object({
      kind: z.literal("reflection"),
      submitted: z.literal(true),
      characterCount: z.number().int().nonnegative().max(20_000),
    })
    .strict(),
]);

export type PrivacySafeActivityResponse = z.infer<
  typeof privacySafeActivityResponseSchema
>;

export function createPrivacySafeActivityResponse(
  response: ActivityResponse,
): PrivacySafeActivityResponse {
  switch (response.kind) {
    case "choice":
      return privacySafeActivityResponseSchema.parse({
        kind: response.kind,
        optionId: response.optionId,
      });
    case "text":
      return privacySafeActivityResponseSchema.parse({
        kind: response.kind,
        submitted: true,
        characterCount: response.text.length,
      });
    case "self_check":
      return privacySafeActivityResponseSchema.parse({
        kind: response.kind,
        submitted: true,
        characterCount: response.text.length,
        checkedCriteria: response.checkedCriteria,
      });
    case "reflection":
      return privacySafeActivityResponseSchema.parse({
        kind: response.kind,
        submitted: true,
        characterCount: response.text.length,
      });
  }
}

export const privacySafeActivityAttemptSchema = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    activityId: entityIdSchema,
    attemptNumber: z.number().int().positive(),
    idempotencyKey: z.string().uuid(),
    responseEvidence: privacySafeActivityResponseSchema,
    evaluation: z
      .object({
        verdict: z.enum(["correct", "incorrect", "self_check", "unscored"]),
      })
      .passthrough(),
    submittedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type PrivacySafeActivityAttempt = z.infer<
  typeof privacySafeActivityAttemptSchema
>;
