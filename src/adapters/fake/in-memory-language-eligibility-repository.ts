import "server-only";

import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import type { LanguageEligibilityRepository } from "@/modules/language/ports/language-eligibility-repository";
import type {
  LanguageEligibilityPersistResult,
  LanguageEligibilityReport,
} from "@/shared/contracts/language-eligibility";

export class InMemoryLanguageEligibilityRepository
  implements LanguageEligibilityRepository
{
  private readonly reports = new Map<
    string,
    { id: string; report: LanguageEligibilityReport }
  >();

  constructor(private readonly generationRepository: GenerationJobRepository) {}

  async persistDecision(input: {
    ownerUserId: string;
    jobId: string;
    report: LanguageEligibilityReport;
  }): Promise<LanguageEligibilityPersistResult> {
    const ownedJob = await this.generationRepository.findOwnedById(
      input.jobId,
      input.ownerUserId,
    );
    if (!ownedJob) throw new Error("Generation job not found at language gate.");

    const key = [
      input.ownerUserId,
      input.jobId,
      input.report.transcriptHash,
      input.report.detectorVersion,
      input.report.policyVersion,
    ].join(":");
    const existing = this.reports.get(key);
    const id = existing?.id ?? crypto.randomUUID();
    if (!existing) this.reports.set(key, { id, report: input.report });
    const effectiveReport = existing?.report ?? input.report;

    if (effectiveReport.status === "eligible") {
      await this.generationRepository.updateStatus(
        input.jobId,
        "analyzing_video",
        "analyzing_video",
        null,
      );
    } else if (effectiveReport.status === "ineligible") {
      await this.generationRepository.updateStatus(
        input.jobId,
        "failed",
        "checking_language",
        "VIDEO_LANGUAGE_UNSUPPORTED",
      );
    } else {
      await this.generationRepository.updateStatus(
        input.jobId,
        "acquiring_transcript",
        "acquiring_transcript",
        null,
      );
    }

    return {
      reportId: id,
      created: !existing,
      status: effectiveReport.status,
    };
  }

  getReportCount(): number {
    return this.reports.size;
  }
}

declare global {
  var __vidlishLanguageEligibilityRepository:
    | InMemoryLanguageEligibilityRepository
    | undefined;
}

export function getInMemoryLanguageEligibilityRepository(
  generationRepository: GenerationJobRepository,
): InMemoryLanguageEligibilityRepository {
  globalThis.__vidlishLanguageEligibilityRepository ??=
    new InMemoryLanguageEligibilityRepository(generationRepository);
  return globalThis.__vidlishLanguageEligibilityRepository;
}
