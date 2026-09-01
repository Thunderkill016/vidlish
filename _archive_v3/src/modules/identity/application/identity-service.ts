import type { CurrentAccess } from "@/modules/identity/domain/identity-user";
import type { IdentityProvider } from "@/modules/identity/ports/identity-provider";
import {
  emailSchema,
  sanitizeIntendedPath,
  signInWithPasswordSchema,
  signUpWithPasswordSchema,
  type SignInWithPasswordCommand,
  type SignUpWithPasswordCommand,
} from "@/shared/contracts/auth";
import { authErrors, ProductError, toProductError } from "@/shared/errors/product-error";

export type PasswordSignInResult = { redirectTo: string; requiresMfaChallenge: boolean };
export type PasswordSignUpResult =
  | { status: "confirmation_required" }
  | ({ status: "signed_in" } & PasswordSignInResult);

export class IdentityService {
  constructor(private readonly provider: IdentityProvider) {}

  private async bestEffortSignOut(): Promise<void> {
    try {
      await this.provider.signOut();
    } catch {
      // Access is still denied. A writable auth boundary can clear stale cookies later.
    }
  }

  private async verifiedPasswordSession(
    email: string,
    intendedPath: string | undefined,
  ): Promise<PasswordSignInResult> {
    const user = await this.provider.getCurrentUser();
    const currentEmail = user ? emailSchema.safeParse(user.email) : null;

    if (!user || !currentEmail?.success || currentEmail.data !== email) {
      await this.bestEffortSignOut();
      throw authErrors.invalidCredentials();
    }

    return {
      redirectTo: sanitizeIntendedPath(intendedPath),
      requiresMfaChallenge: (await this.provider.requiresMfaChallenge?.()) ?? false,
    };
  }

  async signInWithPassword(command: SignInWithPasswordCommand): Promise<PasswordSignInResult> {
    const parsed = signInWithPasswordSchema.safeParse(command);
    if (!parsed.success) {
      const hasEmailError = parsed.error.issues.some((issue) => issue.path[0] === "email");
      throw hasEmailError ? authErrors.invalidEmail() : authErrors.invalidPassword();
    }

    const { email, password, intendedPath } = parsed.data;

    try {
      await this.provider.signInWithPassword(email, password);
      return await this.verifiedPasswordSession(email, intendedPath);
    } catch (error) {
      if (error instanceof ProductError) throw error;
      throw toProductError(error);
    }
  }

  /**
   * Sends a learner a link to set a password.
   *
   * Deliberately returns nothing and throws nothing for an unknown address: the
   * caller is anonymous, and a different answer for a known address would let
   * anyone test a list of emails against this product.
   */
  async sendPasswordReset(email: string, redirectTo: string): Promise<void> {
    try {
      await this.provider.sendPasswordReset(email, redirectTo);
    } catch (error) {
      const productError = toProductError(error);
      // Rate limiting is real and worth telling the caller about. Everything
      // else is answered as success for the reason above.
      if (productError instanceof ProductError && productError.code === "AUTH_RATE_LIMITED") {
        throw productError;
      }
    }
  }

  async signUpWithPassword(
    command: SignUpWithPasswordCommand,
    emailRedirectTo: string,
  ): Promise<PasswordSignUpResult> {
    const parsed = signUpWithPasswordSchema.safeParse(command);
    if (!parsed.success) {
      const hasEmailError = parsed.error.issues.some((issue) => issue.path[0] === "email");
      throw hasEmailError ? authErrors.invalidEmail() : authErrors.invalidPassword();
    }

    const { email, password, intendedPath } = parsed.data;

    try {
      const outcome = await this.provider.signUpWithPassword(email, password, emailRedirectTo);
      if (!outcome.sessionCreated) return { status: "confirmation_required" };

      return {
        status: "signed_in",
        ...(await this.verifiedPasswordSession(email, intendedPath)),
      };
    } catch (error) {
      if (error instanceof ProductError) throw error;
      throw toProductError(error);
    }
  }

  async resolveCurrentAccess(): Promise<CurrentAccess | null> {
    const user = await this.provider.getCurrentUser();
    if (!user) return null;

    const parsedEmail = emailSchema.safeParse(user.email);
    if (!parsedEmail.success) {
      await this.bestEffortSignOut();
      return null;
    }

    // An AAL1 session after this account has enrolled a factor is not enough to
    // read learner data. Do not sign it out: the sign-in page needs the session
    // to complete its TOTP challenge and upgrade it to AAL2.
    if (await this.requiresMfaChallenge()) return null;

    return {
      userId: user.id,
      email: parsedEmail.data,
    };
  }

  async signOut(): Promise<void> {
    await this.provider.signOut();
  }

  async requiresMfaChallenge(): Promise<boolean> {
    return (await this.provider.requiresMfaChallenge?.()) ?? false;
  }
}
