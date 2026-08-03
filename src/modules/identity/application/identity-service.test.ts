import { describe, expect, it, vi } from "vitest";

import { IdentityService } from "@/modules/identity/application/identity-service";
import type { BetaAccessRepository } from "@/modules/identity/ports/beta-access-repository";
import type { IdentityProvider } from "@/modules/identity/ports/identity-provider";

function provider(overrides: Partial<IdentityProvider> = {}): IdentityProvider {
  return {
    requestCode: vi.fn(async () => undefined),
    verifyCode: vi.fn(async () => undefined),
    getCurrentUser: vi.fn(async () => ({ id: "user-1", email: "invited@example.com" })),
    signOut: vi.fn(async () => undefined),
    ...overrides,
  };
}

function accessRepository(values: boolean[]): BetaAccessRepository {
  let index = 0;
  return {
    isActive: vi.fn(async () => values[Math.min(index++, values.length - 1)] ?? false),
  };
}

describe("IdentityService", () => {
  it("returns the same public result while skipping the provider for denied email", async () => {
    const deniedProvider = provider();
    const deniedService = new IdentityService(deniedProvider, accessRepository([false]));
    const allowedProvider = provider();
    const allowedService = new IdentityService(allowedProvider, accessRepository([true]));

    const denied = await deniedService.requestLoginCode({ email: "learner@example.com" });
    const allowed = await allowedService.requestLoginCode({ email: "invited@example.com" });

    expect(denied).toEqual(allowed);
    expect(deniedProvider.requestCode).not.toHaveBeenCalled();
    expect(allowedProvider.requestCode).toHaveBeenCalledOnce();
  });

  it("rechecks beta access after verification and signs out a revoked session", async () => {
    const identityProvider = provider();
    const service = new IdentityService(identityProvider, accessRepository([true, false]));

    await expect(
      service.verifyLoginCode({
        email: "invited@example.com",
        code: "123456",
        intendedPath: "/library",
      }),
    ).rejects.toMatchObject({ code: "AUTH_BETA_ACCESS_REVOKED" });
    expect(identityProvider.signOut).toHaveBeenCalledOnce();
  });

  it("returns sanitized redirect for an allowed verified user", async () => {
    const service = new IdentityService(provider(), accessRepository([true, true]));
    await expect(
      service.verifyLoginCode({
        email: "invited@example.com",
        code: "123456",
        intendedPath: "https://evil.example",
      }),
    ).resolves.toEqual({ redirectTo: "/create" });
  });

  it("removes access when the current session email is no longer allowlisted", async () => {
    const identityProvider = provider();
    const service = new IdentityService(identityProvider, accessRepository([false]));

    await expect(service.resolveCurrentAccess()).resolves.toBeNull();
    expect(identityProvider.signOut).toHaveBeenCalledOnce();
  });
});
