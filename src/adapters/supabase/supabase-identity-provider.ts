import "server-only";

import type { AuthError, SupabaseClient } from "@supabase/supabase-js";

import type { IdentityUser } from "@/modules/identity/domain/identity-user";
import type {
  IdentityProvider,
  PasswordSignUpOutcome,
} from "@/modules/identity/ports/identity-provider";
import { authErrors } from "@/shared/errors/product-error";

function mapPasswordError(error: AuthError, operation: "sign-in" | "sign-up") {
  if (error.status === 429) return authErrors.rateLimited();
  if (typeof error.status === "number" && error.status >= 500) {
    return authErrors.unavailable();
  }
  return operation === "sign-in" ? authErrors.invalidCredentials() : authErrors.invalidPassword();
}

export class SupabaseIdentityProvider implements IdentityProvider {
  constructor(private readonly client: SupabaseClient) {}

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw mapPasswordError(error, "sign-in");
  }

  async signUpWithPassword(
    email: string,
    password: string,
    emailRedirectTo: string,
  ): Promise<PasswordSignUpOutcome> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });
    if (error) throw mapPasswordError(error, "sign-up");
    return { sessionCreated: Boolean(data.session) };
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

  async requiresMfaChallenge(): Promise<boolean> {
    const { data, error } = await this.client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) throw authErrors.unavailable();
    return data.currentLevel !== "aal2" && data.nextLevel === "aal2";
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw authErrors.unavailable();
  }
}
