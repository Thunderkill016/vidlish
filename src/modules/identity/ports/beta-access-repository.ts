export interface BetaAccessRepository {
  isActive(emailNormalized: string): Promise<boolean>;
}
