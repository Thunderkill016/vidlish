import "server-only";

import { z } from "zod";

const serverConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    CI: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    AUTH_ADAPTER: z.enum(["supabase", "fake"]).default("supabase"),
    SUPABASE_SECRET_KEY: z.string().min(1),
    AUTH_FAKE_CODE: z.string().regex(/^\d{6}$/).default("123456"),
    TEST_BETA_EMAILS: z.string().default("invited@example.com"),
    VIDEO_METADATA_ADAPTER: z.enum(["youtube", "fixture"]).default("fixture"),
    YOUTUBE_DATA_API_KEY: z.string().min(1).optional(),
    YOUTUBE_VIEWER_REGION: z.string().regex(/^[A-Z]{2}$/).default("VN"),
    YOUTUBE_METADATA_TIMEOUT_MS: z.coerce.number().int().min(500).max(15000).default(5000),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.CI && value.AUTH_ADAPTER === "fake") {
      context.addIssue({
        code: "custom",
        path: ["AUTH_ADAPTER"],
        message: "The fake authentication adapter cannot run in production.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.VIDEO_METADATA_ADAPTER === "fixture"
    ) {
      context.addIssue({
        code: "custom",
        path: ["VIDEO_METADATA_ADAPTER"],
        message: "The fixture metadata adapter cannot run in production.",
      });
    }
    if (
      value.VIDEO_METADATA_ADAPTER === "youtube" &&
      !value.YOUTUBE_DATA_API_KEY
    ) {
      context.addIssue({
        code: "custom",
        path: ["YOUTUBE_DATA_API_KEY"],
        message: "YouTube Data API key is required for the YouTube adapter.",
      });
    }
  });

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cached: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  if (cached) return cached;

  const result = serverConfigSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV ?? "development",
    CI: process.env.CI,
    AUTH_ADAPTER: process.env.AUTH_ADAPTER,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    AUTH_FAKE_CODE: process.env.AUTH_FAKE_CODE,
    TEST_BETA_EMAILS: process.env.TEST_BETA_EMAILS,
    VIDEO_METADATA_ADAPTER: process.env.VIDEO_METADATA_ADAPTER,
    YOUTUBE_DATA_API_KEY: process.env.YOUTUBE_DATA_API_KEY,
    YOUTUBE_VIEWER_REGION: process.env.YOUTUBE_VIEWER_REGION,
    YOUTUBE_METADATA_TIMEOUT_MS: process.env.YOUTUBE_METADATA_TIMEOUT_MS,
  });

  if (!result.success) {
    throw new Error("Server application configuration is invalid.");
  }

  cached = result.data;
  return result.data;
}
