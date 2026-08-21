import "server-only";

import { z } from "zod";

const serverConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    CI: z
      .enum(["true", "false", "1", "0"])
      .default("false")
      .transform((value) => value === "true" || value === "1"),
    AUTH_ADAPTER: z.enum(["supabase", "fake"]).default("supabase"),
    SUPABASE_SECRET_KEY: z.string().min(1),
    AUTH_FAKE_CODE: z.string().regex(/^\d{6}$/).default("123456"),
    TEST_BETA_EMAILS: z.string().default("invited@example.com"),
    VIDEO_METADATA_ADAPTER: z.enum(["youtube", "fixture"]).default("fixture"),
    YOUTUBE_DATA_API_KEY: z.string().min(1).optional(),
    YOUTUBE_VIEWER_REGION: z.string().regex(/^[A-Z]{2}$/).default("VN"),
    YOUTUBE_METADATA_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(15000)
      .default(5000),
    GENERATION_REPOSITORY: z.enum(["supabase", "fake"]).default("fake"),
    GENERATION_DISPATCHER: z.enum(["workflow", "inline"]).default("inline"),
    GENERATION_MAX_ACTIVE_JOBS: z.coerce
      .number()
      .int()
      .min(1)
      .max(20)
      .default(2),
    GENERATION_MAX_JOBS_PER_DAY: z.coerce
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(20),
    GENERATION_MAX_JOBS_PER_MINUTE: z.coerce
      .number()
      .int()
      .min(1)
      .max(60)
      .default(3),
    TRANSCRIPT_NATIVE_ENABLED: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    TRANSCRIPT_NATIVE_ADAPTER: z
      .enum(["supadata", "fixture"])
      .default("fixture"),
    TRANSCRIPT_REPOSITORY: z.enum(["supabase", "fake"]).default("fake"),
    SUPADATA_API_KEY: z.string().min(1).optional(),
    SUPADATA_NATIVE_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .min(500)
      .max(30000)
      .default(8000),
    LESSON_PROVIDER: z.enum(["gemini", "fixture"]).default("fixture"),
    // Defaults to off. The v2 chain publishes content a learner studies, so
    // turning it on is a deliberate act, not something a deploy does by itself.
    // "fixture" exists for dev and CI and must never be how production authors.
    LEARNING_AUTHORING_PROVIDER: z
      .enum(["off", "gemini", "fixture"])
      .default("off"),
    /**
     * Overridable so a newer Gemini model can be adopted without a code change.
     *
     * The default was `gemini-3.5-flash-lite` — the cheapest, weakest tier — and
     * the failures production kept returning were schema adherence: a draft
     * rejected at one field after both model calls had been paid for. A
     * rejected lesson costs its whole generation, so the cheapest model per
     * token is not the cheapest per accepted lesson.
     *
     * `gemini-3.7-flash` is $0.75 / $3.75 per million against Flash-Lite's
     * $0.30 / $2.50 — roughly a cent and a half more per lesson, against a
     * generation thrown away. It is also cheaper than `gemini-3.5-flash`
     * ($1.50 / $9.00), so this is not simply "spend more".
     */
    LESSON_MODEL_ID: z.string().min(1).default("gemini-3.7-flash"),
    GEMINI_API_KEY: z.string().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.AUTH_ADAPTER === "fake"
    ) {
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
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.GENERATION_REPOSITORY === "fake"
    ) {
      context.addIssue({
        code: "custom",
        path: ["GENERATION_REPOSITORY"],
        message: "The fake generation repository cannot run in production.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.GENERATION_DISPATCHER === "inline"
    ) {
      context.addIssue({
        code: "custom",
        path: ["GENERATION_DISPATCHER"],
        message: "The inline generation dispatcher cannot run in production.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.TRANSCRIPT_NATIVE_ADAPTER === "fixture"
    ) {
      context.addIssue({
        code: "custom",
        path: ["TRANSCRIPT_NATIVE_ADAPTER"],
        message: "The fixture transcript adapter cannot run in production.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.TRANSCRIPT_REPOSITORY === "fake"
    ) {
      context.addIssue({
        code: "custom",
        path: ["TRANSCRIPT_REPOSITORY"],
        message: "The fake transcript repository cannot run in production.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.LESSON_PROVIDER === "fixture"
    ) {
      context.addIssue({
        code: "custom",
        path: ["LESSON_PROVIDER"],
        message: "The fixture lesson provider cannot run in production.",
      });
    }
    // VLR-006. The fixture authoring provider writes a stand-in lesson that
    // looks exactly like a real one — same schema, same runtime, same session.
    // Nothing downstream can tell the difference, so a learner would study a
    // demo believing it came from their video. `off` is a fine production
    // value; `fixture` never is.
    if (
      value.NODE_ENV === "production" &&
      !value.CI &&
      value.LEARNING_AUTHORING_PROVIDER === "fixture"
    ) {
      context.addIssue({
        code: "custom",
        path: ["LEARNING_AUTHORING_PROVIDER"],
        message:
          "The fixture learning authoring provider cannot run in production.",
      });
    }
  });

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cached: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  if (cached) return cached;

  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";

  const result = serverConfigSchema.safeParse({
    NODE_ENV: nodeEnv,
    CI: process.env.CI,
    AUTH_ADAPTER: process.env.AUTH_ADAPTER,
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    AUTH_FAKE_CODE: process.env.AUTH_FAKE_CODE,
    TEST_BETA_EMAILS: process.env.TEST_BETA_EMAILS,
    VIDEO_METADATA_ADAPTER:
      process.env.VIDEO_METADATA_ADAPTER ??
      (isProduction ? "youtube" : undefined),
    YOUTUBE_DATA_API_KEY: process.env.YOUTUBE_DATA_API_KEY,
    YOUTUBE_VIEWER_REGION: process.env.YOUTUBE_VIEWER_REGION,
    YOUTUBE_METADATA_TIMEOUT_MS: process.env.YOUTUBE_METADATA_TIMEOUT_MS,
    GENERATION_REPOSITORY:
      process.env.GENERATION_REPOSITORY ??
      (isProduction ? "supabase" : undefined),
    GENERATION_DISPATCHER:
      process.env.GENERATION_DISPATCHER ??
      (isProduction ? "workflow" : undefined),
    GENERATION_MAX_ACTIVE_JOBS: process.env.GENERATION_MAX_ACTIVE_JOBS,
    GENERATION_MAX_JOBS_PER_DAY: process.env.GENERATION_MAX_JOBS_PER_DAY,
    GENERATION_MAX_JOBS_PER_MINUTE: process.env.GENERATION_MAX_JOBS_PER_MINUTE,
    TRANSCRIPT_NATIVE_ENABLED: process.env.TRANSCRIPT_NATIVE_ENABLED,
    TRANSCRIPT_NATIVE_ADAPTER:
      process.env.TRANSCRIPT_NATIVE_ADAPTER ??
      (isProduction ? "supadata" : undefined),
    TRANSCRIPT_REPOSITORY:
      process.env.TRANSCRIPT_REPOSITORY ??
      (isProduction ? "supabase" : undefined),
    SUPADATA_API_KEY: process.env.SUPADATA_API_KEY,
    SUPADATA_NATIVE_TIMEOUT_MS: process.env.SUPADATA_NATIVE_TIMEOUT_MS,
    LESSON_PROVIDER:
      process.env.LESSON_PROVIDER ?? (isProduction ? "gemini" : undefined),
    LEARNING_AUTHORING_PROVIDER: process.env.LEARNING_AUTHORING_PROVIDER,
    LESSON_MODEL_ID: process.env.LESSON_MODEL_ID,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "config"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Server application configuration is invalid: ${details}`);
  }

  cached = result.data;
  return result.data;
}
