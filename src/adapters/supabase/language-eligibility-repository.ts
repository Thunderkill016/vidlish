import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { LanguageEligibilityRepository } from "@/modules/language/ports/language-eligibility-repository";
import {
  languageEligibilityPersistResultSchema,
  type LanguageEligibilityPersistResult,
  type LanguageEligibilityReport,
} from "@/shared/contracts/language-eligibility";

export class SupabaseLanguageEligibilityRepository
  implements LanguageEligibilityRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async persistDecision(input: {
    ownerUserId: string;
    jobId: string;
    report: LanguageEligibilityReport;
  }): Promise<LanguageEligibilityPersistResult> {
    const report = input.report;
    const rpc = await this.client.rpc("persist_language_eligibility", {
      p_owner_user_id: input.ownerUserId,
      p_job_id: input.jobId,
      p_transcript_hash: report.transcriptHash,
      p_detector_id: report.detectorId,
      p_detector_version: report.detectorVersion,
      p_policy_version: report.policyVersion,
      p_status: report.status,
      p_reason_code: report.reason,
      p_english_share: report.englishShare,
      p_reliable_coverage: report.reliableCoverage,
      p_coherent_english_duration_ms: report.coherentEnglishDurationMs,
      p_reliable_english_word_count: report.reliableEnglishWordCount,
      p_reliable_analyzed_word_count: report.reliableAnalyzedWordCount,
      p_confidence_band: report.confidenceBand,
      p_detected_languages: report.detectedLanguages,
      p_english_segment_ids: report.englishSegmentIds,
      p_permitted_segment_ids: report.permittedSegmentIds,
      p_excluded_segment_ids: report.excludedSegmentIds,
    });
    if (rpc.error) throw rpc.error;

    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    const parsed = z
      .object({
        report_id: z.string().uuid(),
        created: z.boolean(),
        report_status: z.enum([
          "eligible",
          "ineligible",
          "insufficient_evidence",
        ]),
      })
      .strict()
      .parse(row);

    return languageEligibilityPersistResultSchema.parse({
      reportId: parsed.report_id,
      created: parsed.created,
      status: parsed.report_status,
    });
  }
}
