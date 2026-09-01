import { z } from "zod";

export const validateVideoUrlRequestSchema = z.object({
  url: z.string().trim().min(1).max(2048),
});

export const videoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

const videoMetadataBaseSchema = z.object({
  videoId: videoIdSchema,
  metadataVersion: z.string().min(1).max(256),
});

const describedMetadataSchema = videoMetadataBaseSchema.extend({
  title: z.string().min(1).max(500),
  channelName: z.string().min(1).max(300),
  thumbnailUrl: z.string().url().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  captionAvailable: z.boolean().optional(),
  declaredAudioLanguage: z.string().min(1).max(35).optional(),
});

export const playableVideoMetadataSchema = describedMetadataSchema.extend({
  availability: z.literal("playable"),
});

const optionalDescriptionSchema = describedMetadataSchema.partial({
  title: true,
  channelName: true,
});

export const videoMetadataSchema = z.discriminatedUnion("availability", [
  playableVideoMetadataSchema,
  videoMetadataBaseSchema.extend({ availability: z.literal("not_found") }),
  optionalDescriptionSchema.extend({ availability: z.literal("private") }),
  optionalDescriptionSchema.extend({ availability: z.literal("restricted") }),
  optionalDescriptionSchema.extend({ availability: z.literal("unavailable") }),
  videoMetadataBaseSchema.extend({ availability: z.literal("metadata_failed") }),
]);

export const validateVideoUrlResponseSchema = z.object({
  metadata: playableVideoMetadataSchema,
});

export type VideoMetadata = z.infer<typeof videoMetadataSchema>;
export type PlayableVideoMetadata = z.infer<typeof playableVideoMetadataSchema>;
