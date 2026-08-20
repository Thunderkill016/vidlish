import { z } from "zod";

const safeIdentifierSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9._:-]+$/);

export const generationEventSchema = z
  .object({
    event: z.literal("vidlish_generation"),
    level: z.enum(["info", "warning", "error"]),
    jobId: z.string().uuid(),
    stage: z.enum([
      "transcript_acquisition",
      "language_eligibility",
      "lesson_generation",
      "workflow_terminalization",
      "learning_authoring",
    ]),
    action: z.enum(["started", "succeeded", "skipped", "failed"]),
    provider: z.enum([
      "youtube",
      "supadata",
      "franc",
      "gemini",
      "fixture",
      "workflow",
    ]),
    modelId: safeIdentifierSchema.optional(),
    outcome: z
      .enum([
        "persisted",
        "already_advanced",
        "eligible",
        "ineligible",
        "insufficient_evidence",
        "published",
        "already_published",
        "no_permitted_segments",
        "terminated",
        "already_settled",
      ])
      .optional(),
    reason: z
      .enum([
        "job_missing",
        "status_mismatch",
        "transcript_missing",
        "language_check_failed",
        "provider_failure",
        // Provider failures split by kind. None of these carry learner or
        // transcript text — they name the shape of the failure, which is what
        // production needs to tell a rate limit from a rejected schema.
        "provider_rate_limited",
        "provider_unavailable",
        "provider_truncated",
        "provider_declined",
        "provider_not_json",
        "provider_schema_rejected",
        "unexpected_error",
      ])
      .optional(),
    elapsedMs: z.number().int().nonnegative().optional(),
    retryable: z.boolean().optional(),
    errorName: safeIdentifierSchema.optional(),
  })
  .strict();

export type GenerationEvent = z.infer<typeof generationEventSchema>;
export type GenerationEventInput = Omit<GenerationEvent, "event">;

type GenerationEventSink = Pick<Console, "info" | "warn" | "error">;

export function buildGenerationEvent(
  input: GenerationEventInput,
): GenerationEvent {
  return generationEventSchema.parse({ event: "vidlish_generation", ...input });
}

export function emitGenerationEvent(
  input: GenerationEventInput,
  sink: GenerationEventSink = console,
): GenerationEvent {
  const event = buildGenerationEvent(input);
  const line = JSON.stringify(event);

  if (event.level === "error") sink.error(line);
  else if (event.level === "warning") sink.warn(line);
  else sink.info(line);

  return event;
}
