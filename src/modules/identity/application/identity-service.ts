import type { CurrentAccess } from "@/modules/identity/domain/identity-user";
import type { BetaAccessRepository } from "@/modules/identity/ports/beta-access-repository";
import type { IdentityProvider } from "@/modules/identity/ports/identity-provider";
import {
  emailSchema,
  requestLoginCodeSchema,
  sanitizeIntendedPath,
  verifyLoginCodeSchema,
  type RequestLoginCodeCommand,
  type VerifyLoginCodeCommand,
} from "@/shared/contracts/auth";
import { authErrors, ProductError, toProductError } from "@/shared/errors/product-error";

export type RequestLoginCodeResult = { status: "accepted" };
export type VerifyLoginCodeResult = { redirectTo: string };

export class IdentityService {
  constructor(
    private readonly provider: IdentityProvider,
    private readonly betaAccess: BetaAccessRepository,
  ) {}

  private async bestEffortSignOut(): Promise<void> {
    try {
      await this.provider.signOut();
    } catch {
      // Access is still denied. A writable auth boundary can clear stale cookies later.
    }
  }

  async requestLoginCode(command: RequestLoginCodeCommand): Promise<RequestLoginCodeResult> {
    const parsed = requestLoginCodeSchema.safeParse(command);
    if (!parsed.success) throw authErrors.invalidEmail();

    const { email } = parsed.data;
    const isAllowed = await this.betaAccess.isActive(email);

    if (!isAllowed) {
      return { status: "accepted" };
    }

    try {
      await this.provider.requestCode(email);
      return { status: "accepted" };
    } catch (error) {
      throw toProductError(error);
    }
  }

  async verifyLoginCode(command: VerifyLoginCodeCommand): Promise<VerifyLoginCodeResult> {
    const parsed = verifyLoginCodeSchema.safeParse(command);
    if (!parsed.success) throw authErrors.invalidCode();

    const { email, code, intendedPath } = parsed.data;
    if (!(await this.betaAccess.isActive(email))) throw authErrors.invalidCode();

    try {
      await this.provider.verifyCode(email, code);
      const user = await this.provider.getCurrentUser();
      const currentEmail = user ? emailSchema.safeParse(user.email) : null;

      if (!user || !currentEmail?.success || currentEmail.data !== email) {
        await this.bestEffortSignOut();
        throw authErrors.invalidCode();
      }

      if (!(await this.betaAccess.isActive(email))) {
        await this.bestEffortSignOut();
        throw authErrors.revoked();
      }

      return { redirectTo: sanitizeIntendedPath(intendedPath) };
    } catch (error) {
      if (error instanceof ProductError) throw error;
      throw toProductError(error);
    }
  }

  async resolveCurrentAccess(): Promise<CurrentAccess | null> {
    const user = await this.provider.getCurrentUser();
    if (!user) return null;

    const parsedEmail = emailSchema.safeParse(user.email);
    if (!parsedEmail.success || !(await this.betaAccess.isActive(parsedEmail.data))) {
      await this.bestEffortSignOut();
      return null;
    }

    return {
      userId: user.id,
      email: parsedEmail.data,
      betaAccess: "active",
    };
  }

  async signOut(): Promise<void> {
    await this.provider.signOut();
  }
}
