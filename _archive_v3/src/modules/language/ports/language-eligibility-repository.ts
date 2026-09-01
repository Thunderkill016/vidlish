import type {
  LanguageEligibilityPersistResult,
  LanguageEligibilityReport,
} from "@/shared/contracts/language-eligibility";

export interface LanguageEligibilityRepository {
  /**
   * The decision already made for this job.
   *
   * The v2 authoring chain needs it to know which segments may be quoted — the
   * report *is* the allowlist that keeps a lesson grounded. Until this existed
   * the decision could only be written, never read back, so nothing downstream
   * could enforce it.
   */
  findForJob(input: {
    ownerUserId: string;
    jobId: string;
  }): Promise<LanguageEligibilityReport | null>;

  persistDecision(input: {
    ownerUserId: string;
    jobId: string;
    report: LanguageEligibilityReport;
  }): Promise<LanguageEligibilityPersistResult>;
}
