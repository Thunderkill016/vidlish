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

export const videoMetadataSchema = z.discriminatedUnion("availability", [
  describedMetadataSchema.extend({ availability: z.literal("playable") }),
  videoMetadataBaseSchema.extend({ availability: z.literal("not_found") }),
  describedMetadataSchema.partial({
    title: true,
    channelName: true,
  }).extend({ availability: z.literal("private") }),
  describedMetadataSchema.partial({
    title: true,
    channelName: true,
  }).extend({ availability: z.literal("restricted") }),
  describedMetadataSchema.partial({
    title: true,
    channelName: true,
  }).extend({ availability: z.literal("unavailable") }),
  videoMetadataBaseSchema.extend({ availability: z.literal("metadata_failed") }),
]);

export const validateVideoUrlResponseSchema = z.object({
  metadata: videoMetadataSchema.extract({ availability: ["playable"] }),
});

export type VideoMetadata = z.infer<typeof videoMetadataSchema>;
export type PlayableVideoMetadata = Extract<
  VideoMetadata,
  { availability: "playable" }
>;
