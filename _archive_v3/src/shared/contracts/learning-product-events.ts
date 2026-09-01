import { z } from "zod";

const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);

export const learningProductEventKindSchema = z.enum([
  "source_play_completed",
  "correction_shown",
  "runtime_error",
]);
export type LearningProductEventKind = z.infer<
  typeof learningProductEventKindSchema
>;

export const learningRuntimeErrorKindSchema = z.enum([
  "youtube_api_load",
  "youtube_player",
  "session_request",
  "attempt_request",
  "support_request",
]);
export type LearningRuntimeErrorKind = z.infer<
  typeof learningRuntimeErrorKindSchema
>;

export const recordLearningProductEventRequestSchema = z.discriminatedUnion(
  "eventKind",
  [
    z
      .object({
        sessionId: z.string().uuid(),
        activityId: entityIdSchema,
        idempotencyKey: z.string().uuid(),
        eventKind: z.literal("source_play_completed"),
      })
      .strict(),
    z
      .object({
        sessionId: z.string().uuid(),
        activityId: entityIdSchema,
        idempotencyKey: z.string().uuid(),
        eventKind: z.literal("correction_shown"),
      })
      .strict(),
    z
      .object({
        sessionId: z.string().uuid(),
        activityId: entityIdSchema,
        idempotencyKey: z.string().uuid(),
        eventKind: z.literal("runtime_error"),
        detailKind: learningRuntimeErrorKindSchema,
      })
      .strict(),
  ],
);
export type RecordLearningProductEventRequest = z.infer<
  typeof recordLearningProductEventRequestSchema
>;

export const privacySafeLearningProductEventSchema = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    activityId: entityIdSchema,
    idempotencyKey: z.string().uuid(),
    eventKind: learningProductEventKindSchema,
    detailKind: learningRuntimeErrorKindSchema.nullable(),
    occurredAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((event, context) => {
    if (event.eventKind === "runtime_error") {
      if (event.detailKind === null) {
        context.addIssue({
          code: "custom",
          path: ["detailKind"],
          message: "Runtime error events require a bounded detail kind.",
        });
      }
      return;
    }

    if (event.detailKind !== null) {
      context.addIssue({
        code: "custom",
        path: ["detailKind"],
        message: "Non-error events cannot carry error details.",
      });
    }
  });

export type PrivacySafeLearningProductEvent = z.infer<
  typeof privacySafeLearningProductEventSchema
>;

export const learningProductEventResponseSchema = z
  .object({
    event: privacySafeLearningProductEventSchema,
    created: z.boolean(),
  })
  .strict();
export type LearningProductEventResponse = z.infer<
  typeof learningProductEventResponseSchema
>;
