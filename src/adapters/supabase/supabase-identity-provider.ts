import "server-only";

import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import type { IdentityUser } from "@/modules/identity/domain/identity-user";
import type { IdentityProvider } from "@/modules/identity/ports/identity-provider";
import { authErrors } from "@/shared/errors/product-error";

function mapOtpError(error: AuthError) {
  if (error.status === 429) return authErrors.cooldown();
  if (typeof error.status === "number" && error.status >= 500) {
    return authErrors.unavailable();
  }
  return authErrors.invalidCode();
}

export class SupabaseIdentityProvider implements IdentityProvider {
  constructor(private readonly client: SupabaseClient) {}

  async requestCode(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (!error) return;
    if (error.status === 429) throw authErrors.cooldown();
    throw authErrors.unavailable();
  }

  async verifyCode(email: string, code: string): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (error) throw mapOtpError(error);
  }

  async getCurrentUser(): Promise<IdentityUser | null> {
    const { data, error } = await this.client.auth.getClaims();
    if (error || !data?.claims) return null;

    const claims = data.claims as { sub?: unknown; email?: unknown };
    if (typeof claims.sub !== "string" || typeof claims.email !== "string") {
      return null;
    }

    return { id: claims.sub, email: claims.email };
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw authErrors.unavailable();
  }
}
