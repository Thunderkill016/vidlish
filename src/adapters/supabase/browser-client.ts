"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getPublicConfig } from "@/platform/config/public";

export function createBrowserSupabaseClient() {
  const config = getPublicConfig();
  return createBrowserClient(
    config.NEXT_PUBLIC_SUPABASE_URL,
    config.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
