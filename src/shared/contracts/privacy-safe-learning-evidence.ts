import { z } from "zod";

import {
  activityEvaluationSchema,
  type ActivityResponse,
} from "@/shared/contracts/lesson-v2";

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
    evaluation: activityEvaluationSchema,
    submittedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type PrivacySafeActivityAttempt = z.infer<
  typeof privacySafeActivityAttemptSchema
>;

/** Replay is represented by playbackOrdinal >= 2, never by support_opened. */
export const persistedLearningSupportStepSchema = z.enum([
  "context_hint",
  "keyword_hint",
  "english_caption",
  "chunk_boundaries",
  "vietnamese_meaning",
  "slower_playback",
]);
export type PersistedLearningSupportStep = z.infer<
  typeof persistedLearningSupportStepSchema
>;

/**
 * Server-confirmed evidence that a learner used bounded runtime support.
 *
 * This deliberately stores no audio, captions, generated hint copy or learner
 * free text. A playback is represented only by its server-assigned ordinal;
 * the second playback is enough to prove a replay happened. A support event
 * stores only the canonical support-step label from the runtime policy.
 */
export const privacySafeLearningSupportEventSchema = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    activityId: entityIdSchema,
    idempotencyKey: z.string().uuid(),
    eventKind: z.enum(["playback", "support_opened"]),
    supportStep: persistedLearningSupportStepSchema.nullable(),
    playbackOrdinal: z.number().int().positive().nullable(),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.eventKind === "playback") {
      if (event.supportStep !== null) {
        context.addIssue({
          code: "custom",
          path: ["supportStep"],
          message: "Playback evidence cannot carry a support step.",
        });
      }
      if (event.playbackOrdinal === null) {
        context.addIssue({
          code: "custom",
          path: ["playbackOrdinal"],
          message: "Playback evidence requires a server ordinal.",
        });
      }
      return;
    }

    if (event.supportStep === null) {
      context.addIssue({
        code: "custom",
        path: ["supportStep"],
        message: "Support-opened evidence requires a support step.",
      });
    }
    if (event.playbackOrdinal !== null) {
      context.addIssue({
        code: "custom",
        path: ["playbackOrdinal"],
        message: "Support-opened evidence cannot carry a playback ordinal.",
      });
    }
  });

export type PrivacySafeLearningSupportEvent = z.infer<
  typeof privacySafeLearningSupportEventSchema
>;
