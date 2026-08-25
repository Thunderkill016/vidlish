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
  getCurrentUser(): Promise<IdentityUser | null>;
  requiresMfaChallenge?(): Promise<boolean>;
  signOut(): Promise<void>;
}
