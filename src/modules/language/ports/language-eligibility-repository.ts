import type {
  LanguageEligibilityPersistResult,
  LanguageEligibilityReport,
} from "@/shared/contracts/language-eligibility";

export interface LanguageEligibilityRepository {
  persistDecision(input: {
    ownerUserId: string;
    jobId: string;
    report: LanguageEligibilityReport;
  }): Promise<LanguageEligibilityPersistResult>;
}
