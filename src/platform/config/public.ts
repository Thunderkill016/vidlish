import { z } from "zod";

const publicConfigSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .min(1)
    .max(600)
    .default(60),
});

export type PublicConfig = z.infer<typeof publicConfigSchema>;

let cached: PublicConfig | undefined;

export function getPublicConfig(): PublicConfig {
  if (cached) return cached;

  const result = publicConfigSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS:
      process.env.NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS,
  });

  if (!result.success) {
    throw new Error("Public application configuration is invalid.");
  }

  cached = result.data;
  return result.data;
}
