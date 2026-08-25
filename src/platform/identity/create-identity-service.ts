import "server-only";

import { cookies } from "next/headers";

import { FakeIdentityProvider } from "@/adapters/fake/fake-identity-provider";
import { createServerSupabaseClient } from "@/adapters/supabase/server-client";
import { SupabaseIdentityProvider } from "@/adapters/supabase/supabase-identity-provider";
import { IdentityService } from "@/modules/identity";
import { getServerConfig } from "@/platform/config/server";

export async function createIdentityService(): Promise<IdentityService> {
  const config = getServerConfig();

  if (config.AUTH_ADAPTER === "fake") {
    const cookieStore = await cookies();
    return new IdentityService(new FakeIdentityProvider(cookieStore));
  }

  return new IdentityService(new SupabaseIdentityProvider(await createServerSupabaseClient()));
}
