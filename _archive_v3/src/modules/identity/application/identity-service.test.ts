import { describe, expect, it, vi } from "vitest";

import { IdentityService } from "@/modules/identity/application/identity-service";
import type { IdentityProvider } from "@/modules/identity/ports/identity-provider";

function provider(overrides: Partial<IdentityProvider> = {}): IdentityProvider {
  return {
    signInWithPassword: vi.fn(async () => undefined),
    signUpWithPassword: vi.fn(async () => ({ sessionCreated: true })),
    sendPasswordReset: async () => {},
  getCurrentUser: vi.fn(async () => ({ id: "user-1", email: "invited@example.com" })),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("IdentityService", () => {
  it("authenticates a valid email and password", async () => {
    const identityProvider = provider();
    const service = new IdentityService(identityProvider);

    await expect(
      service.signInWithPassword({
        email: "invited@example.com",
        password: "a long enough password",
      }),
    ).resolves.toEqual({ redirectTo: "/start", requiresMfaChallenge: false });
    expect(identityProvider.signInWithPassword).toHaveBeenCalledWith(
      "invited@example.com",
      "a long enough password",
    );
  });

  it("signs out when a password-authenticated session belongs to another email", async () => {
    const identityProvider = provider({
      getCurrentUser: vi.fn(async () => ({ id: "user-1", email: "other@example.com" })),
    });
    const service = new IdentityService(identityProvider);

    await expect(
      service.signInWithPassword({
        email: "learner@example.com",
        password: "a long enough password",
        intendedPath: "/library",
      }),
    ).rejects.toMatchObject({ code: "AUTH_CREDENTIALS_INVALID" });
    expect(identityProvider.signOut).toHaveBeenCalledOnce();
  });

  it("returns a sanitized redirect for a password-authenticated user", async () => {
    const service = new IdentityService(provider());
    await expect(
      service.signInWithPassword({
        email: "invited@example.com",
        password: "a long enough password",
        intendedPath: "https://evil.example",
      }),
    ).resolves.toEqual({ redirectTo: "/start", requiresMfaChallenge: false });
  });

  it("requires a second factor only when the provider reports an AAL2 upgrade", async () => {
    const service = new IdentityService(provider({ requiresMfaChallenge: vi.fn(async () => true) }));
    await expect(
      service.signInWithPassword({
        email: "invited@example.com",
        password: "a long enough password",
      }),
    ).resolves.toEqual({ redirectTo: "/start", requiresMfaChallenge: true });
  });

  it("does not disclose whether an email already has an account during sign-up", async () => {
    const service = new IdentityService(
      provider({ signUpWithPassword: vi.fn(async () => ({ sessionCreated: false })) }),
    );

    await expect(
      service.signUpWithPassword(
        {
          email: "learner@example.com",
          password: "a long enough password",
          passwordConfirmation: "a long enough password",
        },
        "https://nep.example/auth/callback?next=/start",
      ),
    ).resolves.toEqual({ status: "confirmation_required" });
  });

  it("removes access when the current session has no valid email", async () => {
    const identityProvider = provider({
      getCurrentUser: vi.fn(async () => ({ id: "user-1", email: "not-an-email" })),
    });
    const service = new IdentityService(identityProvider);

    await expect(service.resolveCurrentAccess()).resolves.toBeNull();
    expect(identityProvider.signOut).toHaveBeenCalledOnce();
  });

  it("denies protected access until an enrolled factor has raised the session to AAL2", async () => {
    const service = new IdentityService(provider({ requiresMfaChallenge: vi.fn(async () => true) }));
    await expect(service.resolveCurrentAccess()).resolves.toBeNull();
  });
});
