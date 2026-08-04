import { buildLanguageWindows } from "@/modules/language/application/build-language-windows";
import { evaluateLanguageEligibility } from "@/modules/language/application/evaluate-language-eligibility";
import type { LanguageAnalysisPort } from "@/modules/language/ports/language-analysis-port";
import type { LanguageEligibilityRepository } from "@/modules/language/ports/language-eligibility-repository";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import type { GenerationJob } from "@/shared/contracts/generation";
import type {
  LanguageEligibilityPersistResult,
  LanguageEligibilityPolicy,
} from "@/shared/contracts/language-eligibility";

export class CheckOriginalEnglish {
  constructor(
    private readonly transcriptRepository: TranscriptRepository,
    private readonly analyzer: LanguageAnalysisPort,
    private readonly eligibilityRepository: LanguageEligibilityRepository,
    private readonly policy: LanguageEligibilityPolicy,
  ) {}

  async execute(job: GenerationJob): Promise<LanguageEligibilityPersistResult> {
    const transcript = await this.transcriptRepository.findCanonicalForJob(
      job.ownerUserId,
      job.id,
    );
    if (!transcript) {
      throw new Error("Canonical transcript is missing at language gate.");
    }

    const windows = buildLanguageWindows(transcript, this.policy);
    const analysis = await this.analyzer.analyze(windows);
    const report = evaluateLanguageEligibility({
      transcriptHash: transcript.normalizedHash,
      allSegmentIds: transcript.segments.map((segment) => segment.id),
      analysis,
      policy: this.policy,
    });

    return this.eligibilityRepository.persistDecision({
      ownerUserId: job.ownerUserId,
      jobId: job.id,
      report,
    });
  }
}
