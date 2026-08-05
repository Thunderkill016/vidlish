import "server-only";

import { createHash } from "node:crypto";

import type { IdentityUser } from "@/modules/identity/domain/identity-user";
import type { IdentityProvider } from "@/modules/identity/ports/identity-provider";
import { authErrors } from "@/shared/errors/product-error";
import type { CookieStoreLike } from "@/adapters/fake/cookie-store";

/**
 * A UUID derived from the email, not a `fake-<email>` string.
 *
 * The Supabase schema types `owner_user_id` as `uuid references auth.users(id)`,
 * so a non-UUID id makes it impossible to run the fake auth adapter against the
 * real database — which is exactly the configuration used to verify the durable
 * flow locally. Deriving it from the email keeps it stable across restarts, so
 * one matching row in `auth.users` is enough.
 */
export function fakeUserId(email: string): string {
  const h = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    `${variant}${h.slice(17, 20)}`,
    h.slice(20, 32),
  ].join("-");
}

export const fakeSessionCookieName = "vidlish_test_session";

export class FakeIdentityProvider implements IdentityProvider {
  constructor(
    private readonly cookieStore: CookieStoreLike,
    private readonly validCode: string,
  ) {}

  async requestCode(): Promise<void> {
    return undefined;
  }

  async verifyCode(email: string, code: string): Promise<void> {
    if (code !== this.validCode) throw authErrors.invalidCode();

    this.cookieStore.set(fakeSessionCookieName, encodeURIComponent(email), {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 60 * 60,
    });
  }

  async getCurrentUser(): Promise<IdentityUser | null> {
    const value = this.cookieStore.get(fakeSessionCookieName)?.value;
    if (!value) return null;

    try {
      const email = decodeURIComponent(value);
      return { id: fakeUserId(email), email };
    } catch {
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      this.cookieStore.delete(fakeSessionCookieName);
    } catch {
      // A read-only Server Component can discover a revoked fake session;
      // Proxy/Route Handler will clear it at the next writable boundary.
    }
  }
}
