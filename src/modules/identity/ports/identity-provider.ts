import type { IdentityUser } from "@/modules/identity/domain/identity-user";

export interface IdentityProvider {
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  getCurrentUser(): Promise<IdentityUser | null>;
  signOut(): Promise<void>;
}
