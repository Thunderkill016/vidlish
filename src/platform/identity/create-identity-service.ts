import "server-only";

import { cookies } from "next/headers";

import { FakeBetaAccessRepository } from "@/adapters/fake/fake-beta-access-repository";
import { FakeIdentityProvider } from "@/adapters/fake/fake-identity-provider";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseBetaAccessRepository } from "@/adapters/supabase/beta-access-repository";
import { createServerSupabaseClient } from "@/adapters/supabase/server-client";
import { SupabaseIdentityProvider } from "@/adapters/supabase/supabase-identity-provider";
import { IdentityService } from "@/modules/identity";
import { getServerConfig } from "@/platform/config/server";

export async function createIdentityService(): Promise<IdentityService> {
  const config = getServerConfig();

  if (config.AUTH_ADAPTER === "fake") {
    const cookieStore = await cookies();
    return new IdentityService(
      new FakeIdentityProvider(cookieStore, config.AUTH_FAKE_CODE),
      new FakeBetaAccessRepository(config.TEST_BETA_EMAILS),
    );
  }

  return new IdentityService(
    new SupabaseIdentityProvider(await createServerSupabaseClient()),
    new SupabaseBetaAccessRepository(getAdminSupabaseClient()),
  );
}
