import "server-only";

import type { IdentityUser } from "@/modules/identity/domain/identity-user";
import type { IdentityProvider } from "@/modules/identity/ports/identity-provider";
import { authErrors } from "@/shared/errors/product-error";
import type { CookieStoreLike } from "@/adapters/fake/cookie-store";

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
      return { id: `fake-${email}`, email };
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
