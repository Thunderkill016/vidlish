import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicConfig } from "@/platform/config/public";
import { getServerConfig } from "@/platform/config/server";

let adminClient: SupabaseClient | undefined;

export function getAdminSupabaseClient(): SupabaseClient {
  if (adminClient) return adminClient;

  const publicConfig = getPublicConfig();
  const serverConfig = getServerConfig();

  adminClient = createClient(
    publicConfig.NEXT_PUBLIC_SUPABASE_URL,
    serverConfig.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );

  return adminClient;
}
