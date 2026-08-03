import { z } from "zod";

const thumbnailSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const youtubeVideoListResponseSchema = z.object({
  etag: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string(),
      etag: z.string().optional(),
      snippet: z.object({
        title: z.string(),
        channelTitle: z.string(),
        defaultAudioLanguage: z.string().optional(),
        thumbnails: z.record(z.string(), thumbnailSchema).optional(),
      }),
      contentDetails: z.object({
        duration: z.string().optional(),
        caption: z.string().optional(),
        regionRestriction: z
          .object({
            allowed: z.array(z.string()).optional(),
            blocked: z.array(z.string()).optional(),
          })
          .optional(),
      }),
      status: z.object({
        uploadStatus: z.string().optional(),
        privacyStatus: z.string().optional(),
        embeddable: z.boolean().optional(),
      }),
    }),
  ),
});

export type YouTubeVideoResource = z.infer<
  typeof youtubeVideoListResponseSchema
>["items"][number];
