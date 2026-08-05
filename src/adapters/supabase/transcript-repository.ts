import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  TranscriptAttemptRecord,
  TranscriptRepository,
} from "@/modules/transcript/ports/transcript-repository";
import {
  canonicalTranscriptSchema,
  transcriptPersistResultSchema,
  type CanonicalTranscript,
  type TranscriptPersistResult,
} from "@/shared/contracts/transcript";

const rawTranscriptSchema = z.object({
  strategy_id: z.literal("supadata-native-caption"),
  provider: z.literal("supadata"),
  source_type: z.literal("native_caption"),
  declared_language: z.string().nullable(),
  available_languages: z.array(z.string()),
  track_kind: z.enum(["unknown", "manual", "auto"]),
  translation_status: z.enum(["unknown", "original"]),
  normalized_hash: z.string(),
  normalization_version: z.literal("transcript-normalization:v1"),
  duration_ms: z.coerce.number(),
  videos: z.union([
    z.object({ youtube_video_id: z.string() }),
    z.array(z.object({ youtube_video_id: z.string() })).length(1),
  ]),
});

const rawSegmentSchema = z.object({
  id: z.string(),
  position: z.number().int(),
  start_ms: z.coerce.number(),
  end_ms: z.coerce.number(),
  text: z.string(),
  confidence: z.number().nullable(),
  detected_language: z.string().nullable(),
});

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
    transcript: CanonicalTranscript;
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

  async listExhaustedStrategyIds(
    ownerUserId: string,
    jobId: string,
  ): Promise<string[]> {
    const rpc = await this.client.rpc(
      "list_exhausted_transcript_strategies",
      { p_job_id: jobId, p_owner_user_id: ownerUserId },
    );
    if (rpc.error) throw rpc.error;
    return z
      .array(z.object({ strategy_id: z.string() }).strict())
      .parse(rpc.data ?? [])
      .map((row) => row.strategy_id);
  }

  async findCanonicalForJob(
    ownerUserId: string,
    jobId: string,
  ): Promise<CanonicalTranscript | null> {
    const job = await this.client
      .from("lesson_jobs")
      .select("canonical_transcript_id")
      .eq("id", jobId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (job.error) throw job.error;
    if (!job.data?.canonical_transcript_id) return null;

    const [transcriptResult, segmentsResult] = await Promise.all([
      this.client
        .from("transcripts")
        .select(
          `
            strategy_id,
            provider,
            source_type,
            declared_language,
            available_languages,
            track_kind,
            translation_status,
            normalized_hash,
            normalization_version,
            duration_ms,
            videos!inner (youtube_video_id)
          `,
        )
        .eq("id", job.data.canonical_transcript_id)
        .eq("owner_user_id", ownerUserId)
        .maybeSingle(),
      this.client
        .from("transcript_segments")
        .select(
          "id,position,start_ms,end_ms,text,confidence,detected_language",
        )
        .eq("transcript_id", job.data.canonical_transcript_id)
        .eq("owner_user_id", ownerUserId)
        .order("position", { ascending: true }),
    ]);
    if (transcriptResult.error || segmentsResult.error) {
      throw transcriptResult.error ?? segmentsResult.error;
    }
    if (!transcriptResult.data) return null;

    const transcript = rawTranscriptSchema.parse(transcriptResult.data);
    const video = Array.isArray(transcript.videos)
      ? transcript.videos[0]
      : transcript.videos;
    const segments = z.array(rawSegmentSchema).parse(segmentsResult.data ?? []);

    return canonicalTranscriptSchema.parse({
      videoId: video.youtube_video_id,
      strategyId: transcript.strategy_id,
      provider: transcript.provider,
      sourceType: transcript.source_type,
      ...(transcript.declared_language
        ? { declaredLanguage: transcript.declared_language }
        : {}),
      availableLanguages: transcript.available_languages,
      trackKind: transcript.track_kind,
      translationStatus: transcript.translation_status,
      normalizedHash: transcript.normalized_hash,
      normalizationVersion: transcript.normalization_version,
      durationMs: transcript.duration_ms,
      segments: segments.map((segment) => ({
        id: segment.id,
        position: segment.position,
        startMs: segment.start_ms,
        endMs: segment.end_ms,
        text: segment.text,
        ...(segment.confidence !== null
          ? { confidence: segment.confidence }
          : {}),
        ...(segment.detected_language
          ? { detectedLanguage: segment.detected_language }
          : {}),
      })),
    });
  }
}
