import { z } from "zod";

import { cefrLevelSchema } from "@/shared/contracts/lesson-draft";
import { videoIdSchema } from "@/shared/contracts/video";

export const GENERATION_PIPELINE_VERSION = "generation-pipeline:v1" as const;

export const generationJobStatusSchema = z.enum([
  "queued",
  "validating_video",
  "acquiring_transcript",
  "awaiting_user_input",
  "normalizing_transcript",
  "checking_language",
  "analyzing_video",
  "mining_language",
  "planning_lesson",
  "composing_activities",
  "validating_lesson",
  "repairing_lesson",
  "publishing",
  "completed",
  "failed",
  "cancelled",
]);

export type GenerationJobStatus = z.infer<typeof generationJobStatusSchema>;

export const generationSafeErrorCodeSchema = z.enum([
  "VIDEO_LANGUAGE_UNSUPPORTED",
  "TRANSCRIPT_UNAVAILABLE",
  "TRANSCRIPT_EVIDENCE_TOO_WEAK",
  // A job that reached the model step and stalled there. Without a terminal
  // outcome it would occupy an active-job slot forever.
  "LESSON_GENERATION_FAILED",
]);
export type GenerationSafeErrorCode = z.infer<
  typeof generationSafeErrorCodeSchema
>;

export const activeGenerationJobStatuses: readonly GenerationJobStatus[] = [
  "queued",
  "validating_video",
  "acquiring_transcript",
  "awaiting_user_input",
  "normalizing_transcript",
  "checking_language",
  "analyzing_video",
  "mining_language",
  "planning_lesson",
  "composing_activities",
  "validating_lesson",
  "repairing_lesson",
  "publishing",
] as const;

export const learnerGenerationPhaseSchema = z.enum([
  "preparing",
  "transcript",
  "language_check",
  "video_analysis",
  "lesson_plan",
  "activities",
  "quality_check",
  "publishing",
  "completed",
  "failed",
  "cancelled",
]);

export type LearnerGenerationPhase = z.infer<typeof learnerGenerationPhaseSchema>;

export function toLearnerGenerationPhase(
  status: GenerationJobStatus,
): LearnerGenerationPhase {
  switch (status) {
    case "queued":
    case "validating_video":
      return "preparing";
    case "acquiring_transcript":
    case "awaiting_user_input":
    case "normalizing_transcript":
      return "transcript";
    case "checking_language":
      return "language_check";
    case "analyzing_video":
    case "mining_language":
      return "video_analysis";
    case "planning_lesson":
      return "lesson_plan";
    case "composing_activities":
      return "activities";
    case "validating_lesson":
    case "repairing_lesson":
      return "quality_check";
    case "publishing":
      return "publishing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
  }
}

export const createLessonJobRequestSchema = z
  .object({
    videoId: videoIdSchema,
    cefrLevel: cefrLevelSchema,
    metadataVersion: z.string().min(1).max(256),
  })
  .strict();

export type CreateLessonJobRequest = z.infer<
  typeof createLessonJobRequestSchema
>;

export const createLessonJobResponseSchema = z
  .object({
    jobId: z.string().uuid(),
    reused: z.boolean(),
  })
  .strict();

export type CreateLessonJobResponse = z.infer<
  typeof createLessonJobResponseSchema
>;

export const generationJobSchema = z
  .object({
    id: z.string().uuid(),
    ownerUserId: z.string().min(1).max(256),
    videoId: videoIdSchema,
    videoTitle: z.string().min(1).max(500),
    channelName: z.string().min(1).max(300),
    thumbnailUrl: z.string().url().optional(),
    durationMs: z.number().int().nonnegative().optional(),
    /**
     * YouTube's `defaultAudioLanguage`, when the video declares one.
     *
     * Lets the caption strategy tell an original English track from an English
     * translation. Forcing `en` without it would fetch translations of
     * non-English videos, and teaching from a translation breaks the invariant
     * that source quotes are exact spoken English.
     */
    declaredAudioLanguage: z.string().min(2).max(35).optional(),
    cefrLevel: cefrLevelSchema,
    metadataVersion: z.string().min(1).max(256),
    pipelineVersion: z.literal(GENERATION_PIPELINE_VERSION),
    status: generationJobStatusSchema,
    currentStage: z.string().min(1).max(100),
    dispatchStatus: z.enum(["pending", "sent", "failed"]),
    safeErrorCode: generationSafeErrorCodeSchema.optional(),
    // Supabase serializes timestamptz values with an explicit UTC offset
    // (for example +00:00), while other adapters may use the equivalent Z form.
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type GenerationJob = z.infer<typeof generationJobSchema>;

export const publicGenerationJobSchema = generationJobSchema.omit({
  ownerUserId: true,
});
export type PublicGenerationJob = z.infer<typeof publicGenerationJobSchema>;

export const generationJobResponseSchema = z
  .object({
    job: publicGenerationJobSchema,
    phase: learnerGenerationPhaseSchema,
  })
  .strict();

export const generationRequestedEventSchema = z
  .object({
    jobId: z.string().uuid(),
    pipelineVersion: z.literal(GENERATION_PIPELINE_VERSION),
  })
  .strict();

export type GenerationRequestedEvent = z.infer<
  typeof generationRequestedEventSchema
>;

export function generationRequestedEventId(
  event: GenerationRequestedEvent,
): string {
  return `lesson-generation:${event.jobId}:${event.pipelineVersion}`;
}
