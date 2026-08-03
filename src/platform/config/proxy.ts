import { z } from "zod";

const proxyConfigSchema = z.object({
  AUTH_ADAPTER: z.enum(["supabase", "fake"]).default("supabase"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function getProxyConfig() {
  const result = proxyConfigSchema.safeParse({
    AUTH_ADAPTER: process.env.AUTH_ADAPTER,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) throw new Error("Proxy configuration is invalid.");
  return result.data;
}
