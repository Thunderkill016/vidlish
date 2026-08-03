import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { BetaAccessRepository } from "@/modules/identity/ports/beta-access-repository";
import { authErrors } from "@/shared/errors/product-error";

export class SupabaseBetaAccessRepository implements BetaAccessRepository {
  constructor(private readonly client: SupabaseClient) {}

  async isActive(emailNormalized: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("beta_access")
      .select("is_active")
      .eq("email_normalized", emailNormalized)
      .maybeSingle<{ is_active: boolean }>();

    if (error) throw authErrors.unavailable();
    return data?.is_active === true;
  }
}
