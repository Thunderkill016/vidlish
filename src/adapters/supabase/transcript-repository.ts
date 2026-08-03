import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  TranscriptAttemptRecord,
  TranscriptRepository,
} from "@/modules/transcript/ports/transcript-repository";
import {
  transcriptPersistResultSchema,
  type TranscriptPersistResult,
} from "@/shared/contracts/transcript";

function failureAttemptKey(input: TranscriptAttemptRecord): string {
  return [
    "transcript-attempt",
    input.jobId,
    input.strategyId,
    input.result.kind,
    input.result.reason,
  ].join(":");
}

export class SupabaseTranscriptRepository implements TranscriptRepository {
  constructor(private readonly client: SupabaseClient) {}

  async recordAttempt(input: TranscriptAttemptRecord): Promise<void> {
    const result = await this.client.rpc(
      "record_transcript_acquisition_attempt",
      {
        p_attempt_key: failureAttemptKey(input),
        p_owner_user_id: input.ownerUserId,
        p_job_id: input.jobId,
        p_strategy_id: input.strategyId,
        p_provider: input.provider,
        p_result_kind: input.result.kind,
        p_reason_code: input.result.reason,
        p_latency_ms: Math.max(0, Math.round(input.latencyMs)),
      },
    );
    if (result.error) throw result.error;
  }

  async persistAndAdvance(input: {
    ownerUserId: string;
    jobId: string;
    transcript: Parameters<TranscriptRepository["persistAndAdvance"]>[0]["transcript"];
    latencyMs: number;
  }): Promise<TranscriptPersistResult> {
    const transcript = input.transcript;
    const attemptKey = [
      "transcript-attempt",
      input.jobId,
      transcript.strategyId,
      "success",
      transcript.normalizedHash,
      transcript.normalizationVersion,
    ].join(":");

    const rpc = await this.client.rpc("persist_canonical_transcript", {
      p_attempt_key: attemptKey,
      p_owner_user_id: input.ownerUserId,
      p_job_id: input.jobId,
      p_youtube_video_id: transcript.videoId,
      p_strategy_id: transcript.strategyId,
      p_provider: transcript.provider,
      p_source_type: transcript.sourceType,
      p_declared_language: transcript.declaredLanguage ?? null,
      p_available_languages: transcript.availableLanguages,
      p_track_kind: transcript.trackKind,
      p_translation_status: transcript.translationStatus,
      p_normalized_hash: transcript.normalizedHash,
      p_normalization_version: transcript.normalizationVersion,
      p_duration_ms: transcript.durationMs,
      p_latency_ms: Math.max(0, Math.round(input.latencyMs)),
      p_segments: transcript.segments,
    });
    if (rpc.error) throw rpc.error;

    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    const parsed = z
      .object({ transcript_id: z.string().uuid(), created: z.boolean() })
      .strict()
      .parse(row);
    return transcriptPersistResultSchema.parse({
      transcriptId: parsed.transcript_id,
      created: parsed.created,
    });
  }
}
