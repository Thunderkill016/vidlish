import type { BetaAccessRepository } from "@/modules/identity/ports/beta-access-repository";

export class FakeBetaAccessRepository implements BetaAccessRepository {
  private readonly activeEmails: Set<string>;

  constructor(csv: string) {
    this.activeEmails = new Set(
      csv
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  async isActive(emailNormalized: string): Promise<boolean> {
    return this.activeEmails.has(emailNormalized);
  }
}
