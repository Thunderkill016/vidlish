import "server-only";

import { z } from "zod";

const serverConfigSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    AUTH_ADAPTER: z.enum(["supabase", "fake"]).default("supabase"),
    SUPABASE_SECRET_KEY: z.string().min(1),
    AUTH_FAKE_CODE: z.string().regex(/^\d{6}$/).default("123456"),
    TEST_BETA_EMAILS: z.string().default("invited@example.com"),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && value.AUTH_ADAPTER === "fake") {
      context.addIssue({
        code: "custom",
        path: ["AUTH_ADAPTER"],
        message: "The fake authentication adapter cannot run in production.",
      });
    }
  });

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cached: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  if (cached) return cached;

  const result = serverConfigSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV ?? "development",
    AUTH_ADAPTER: process.env.AUTH_ADAPTER,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    AUTH_FAKE_CODE: process.env.AUTH_FAKE_CODE,
    TEST_BETA_EMAILS: process.env.TEST_BETA_EMAILS,
  });

  if (!result.success) {
    throw new Error("Server application configuration is invalid.");
  }

  cached = result.data;
  return result.data;
}
