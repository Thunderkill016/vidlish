import type { IdentityUser } from "@/modules/identity/domain/identity-user";

export type PasswordSignUpOutcome = {
  sessionCreated: boolean;
};

export interface IdentityProvider {
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(
    email: string,
    password: string,
    emailRedirectTo: string,
  ): Promise<PasswordSignUpOutcome>;
  /**
   * Sends the learner a link that lets them set a password.
   *
   * Required, not optional. Every account that existed before the password
   * flow was created by a one-time code and therefore has no password at all.
   * Without this route those learners cannot sign in and cannot sign up either
   * — the address is already taken. This is the only way back in for them.
   */
  sendPasswordReset(email: string, redirectTo: string): Promise<void>;
  getCurrentUser(): Promise<IdentityUser | null>;
  requiresMfaChallenge?(): Promise<boolean>;
  signOut(): Promise<void>;
}
