import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { LanguageEligibilityRepository } from "@/modules/language/ports/language-eligibility-repository";
import {
  languageEligibilityPersistResultSchema,
  languageEligibilityReportSchema,
  type LanguageEligibilityPersistResult,
  type LanguageEligibilityReport,
} from "@/shared/contracts/language-eligibility";

const eligibilityRowSchema = z
  .object({
    transcript_hash: z.string(),
    detector_id: z.string(),
    detector_version: z.string(),
    policy_version: z.string(),
    status: z.string(),
    reason_code: z.string(),
    english_share: z.number(),
    reliable_coverage: z.number(),
    coherent_english_duration_ms: z.union([z.number(), z.string()]),
    reliable_english_word_count: z.number(),
    reliable_analyzed_word_count: z.number(),
    confidence_band: z.string(),
    detected_languages: z.array(z.string()),
    window_evidence: z.unknown(),
    english_segment_ids: z.array(z.string()),
    permitted_segment_ids: z.array(z.string()),
    excluded_segment_ids: z.array(z.string()),
  })
  .strict();

export class SupabaseLanguageEligibilityRepository
  implements LanguageEligibilityRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async findForJob(input: { ownerUserId: string; jobId: string }) {
    const result = await this.client
      .from("language_eligibility_reports")
      .select(
        "transcript_hash,detector_id,detector_version,policy_version,status,reason_code,english_share,reliable_coverage,coherent_english_duration_ms,reliable_english_word_count,reliable_analyzed_word_count,confidence_band,detected_languages,window_evidence,english_segment_ids,permitted_segment_ids,excluded_segment_ids",
      )
      .eq("owner_user_id", input.ownerUserId)
      .eq("job_id", input.jobId)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;

    const row = eligibilityRowSchema.parse(result.data);
    // Parsed through the contract rather than cast. A row that no longer
    // satisfies the report schema must fail here, not halfway through building
    // a lesson from an allowlist nobody validated.
    return languageEligibilityReportSchema.parse({
      transcriptHash: row.transcript_hash,
      detectorId: row.detector_id,
      detectorVersion: row.detector_version,
      policyVersion: row.policy_version,
      status: row.status,
      reason: row.reason_code,
      englishShare: row.english_share,
      reliableCoverage: row.reliable_coverage,
      coherentEnglishDurationMs: Number(row.coherent_english_duration_ms),
      reliableEnglishWordCount: row.reliable_english_word_count,
      reliableAnalyzedWordCount: row.reliable_analyzed_word_count,
      confidenceBand: row.confidence_band,
      detectedLanguages: row.detected_languages,
      windowEvidence: row.window_evidence,
      englishSegmentIds: row.english_segment_ids,
      permittedSegmentIds: row.permitted_segment_ids,
      excludedSegmentIds: row.excluded_segment_ids,
    });
  }

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
      p_window_evidence: report.windowEvidence,
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
