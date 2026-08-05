import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  LessonRepository,
  LessonSummary,
  PublishLessonInput,
} from "@/modules/lesson/ports/lesson-repository";
import {
  LESSON_PIPELINE_VERSION,
  LESSON_SCHEMA_VERSION,
  lessonDraftSchema,
  lessonSchema,
  type Lesson,
} from "@/shared/contracts/lesson";

const rawLessonSchema = z.object({
  id: z.string().uuid(),
  job_id: z.string().uuid(),
  cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  prompt_version: z.string(),
  model_id: z.string(),
  transcript_hash: z.string(),
  input_tokens: z.coerce.number(),
  output_tokens: z.coerce.number(),
  draft: z.unknown(),
  citations: z.unknown(),
  created_at: z.string(),
  videos: z.union([
    z.object({ youtube_video_id: z.string(), title: z.string(), channel_name: z.string() }),
    z
      .array(
        z.object({ youtube_video_id: z.string(), title: z.string(), channel_name: z.string() }),
      )
      .length(1),
  ]),
});

export class SupabaseLessonRepository implements LessonRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listPermittedSegments(jobId: string, ownerUserId: string) {
    // The eligibility allowlist is authoritative: a segment the language gate
    // excluded must never reach the model.
    const allowed = await this.client
      .from("language_eligible_segments")
      .select("segment_id,transcript_id")
      .eq("owner_user_id", ownerUserId);
    if (allowed.error) throw allowed.error;

    const job = await this.client
      .from("lesson_jobs")
      .select("canonical_transcript_id")
      .eq("id", jobId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (job.error) throw job.error;
    const transcriptId = job.data?.canonical_transcript_id;
    if (!transcriptId) return [];

    const permittedIds = new Set(
      z
        .array(z.object({ segment_id: z.string(), transcript_id: z.string() }))
        .parse(allowed.data ?? [])
        .filter((row) => row.transcript_id === transcriptId)
        .map((row) => row.segment_id),
    );
    if (permittedIds.size === 0) return [];

    const segments = await this.client
      .from("transcript_segments")
      .select("id,start_ms,end_ms,text")
      .eq("transcript_id", transcriptId)
      .eq("owner_user_id", ownerUserId)
      .order("position", { ascending: true });
    if (segments.error) throw segments.error;

    return z
      .array(
        z.object({
          id: z.string(),
          start_ms: z.coerce.number(),
          end_ms: z.coerce.number(),
          text: z.string(),
        }),
      )
      .parse(segments.data ?? [])
      .filter((segment) => permittedIds.has(segment.id))
      .map((segment) => ({
        id: segment.id,
        startMs: segment.start_ms,
        endMs: segment.end_ms,
        text: segment.text,
      }));
  }

  async publish(
    input: PublishLessonInput,
  ): Promise<{ lessonId: string; created: boolean }> {
    const rpc = await this.client.rpc("publish_lesson", {
      p_owner_user_id: input.ownerUserId,
      p_job_id: input.jobId,
      p_cefr_level: input.cefrLevel,
      p_schema_version: LESSON_SCHEMA_VERSION,
      p_pipeline_version: LESSON_PIPELINE_VERSION,
      p_prompt_version: input.promptVersion,
      p_model_id: input.modelId,
      p_transcript_hash: input.transcriptHash,
      p_input_tokens: input.inputTokens,
      p_output_tokens: input.outputTokens,
      p_draft: input.draft,
      p_citations: input.citations,
    });
    if (rpc.error) throw rpc.error;

    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    const parsed = z
      .object({ lesson_id: z.string().uuid(), created: z.boolean() })
      .strict()
      .parse(row);
    return { lessonId: parsed.lesson_id, created: parsed.created };
  }

  async listOwned(ownerUserId: string): Promise<LessonSummary[]> {
    // Only the fields the library renders. `draft->>titleVi` and the vocabulary
    // length are computed in Postgres so a shelf of lessons never ships every
    // draft over the wire.
    const result = await this.client
      .from("lessons")
      .select(
        `id,job_id,cefr_level,created_at,draft,
         videos!inner (youtube_video_id, title, channel_name)`,
      )
      .eq("owner_user_id", ownerUserId)
      .eq("pipeline_version", LESSON_PIPELINE_VERSION)
      .order("created_at", { ascending: false })
      .limit(100);
    if (result.error) throw result.error;

    return z
      .array(
        z.object({
          id: z.string().uuid(),
          job_id: z.string().uuid(),
          cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
          created_at: z.string(),
          draft: z.object({
            titleVi: z.string(),
            vocabulary: z.array(z.unknown()),
          }),
          videos: z.union([
            z.object({ youtube_video_id: z.string(), title: z.string(), channel_name: z.string() }),
            z
              .array(
                z.object({ youtube_video_id: z.string(), title: z.string(), channel_name: z.string() }),
              )
              .length(1),
          ]),
        }),
      )
      .parse(result.data ?? [])
      .map((row) => {
        const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;
        return {
          id: row.id,
          jobId: row.job_id,
          videoId: video.youtube_video_id,
          videoTitle: video.title,
          channelName: video.channel_name,
          cefrLevel: row.cefr_level,
          titleVi: row.draft.titleVi,
          vocabularyCount: row.draft.vocabulary.length,
          createdAt: row.created_at,
        };
      });
  }

  async findOwnedByJobId(
    jobId: string,
    ownerUserId: string,
  ): Promise<Lesson | null> {
    const result = await this.client
      .from("lessons")
      .select(
        `id,job_id,cefr_level,prompt_version,model_id,transcript_hash,
         input_tokens,output_tokens,draft,citations,created_at,
         videos!inner (youtube_video_id, title, channel_name)`,
      )
      .eq("job_id", jobId)
      .eq("owner_user_id", ownerUserId)
      .eq("pipeline_version", LESSON_PIPELINE_VERSION)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;

    const row = rawLessonSchema.parse(result.data);
    const video = Array.isArray(row.videos) ? row.videos[0] : row.videos;

    return lessonSchema.parse({
      id: row.id,
      jobId: row.job_id,
      videoId: video.youtube_video_id,
      videoTitle: video.title,
      channelName: video.channel_name,
      cefrLevel: row.cefr_level,
      draft: lessonDraftSchema.parse(row.draft),
      citations: row.citations,
      provenance: {
        schemaVersion: LESSON_SCHEMA_VERSION,
        pipelineVersion: LESSON_PIPELINE_VERSION,
        promptVersion: row.prompt_version,
        modelId: row.model_id,
        transcriptHash: row.transcript_hash,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        generatedAt: row.created_at,
      },
      createdAt: row.created_at,
    });
  }
}
