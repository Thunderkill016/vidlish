import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  CreateGenerationJobRecord,
  GenerationJobRepository,
  GenerationPolicySnapshot,
} from "@/modules/generation/ports/generation-job-repository";
import {
  activeGenerationJobStatuses,
  generationJobSchema,
  generationJobStatusSchema,
  type GenerationJob,
  type GenerationJobStatus,
} from "@/shared/contracts/generation";

const rawJobSchema = z.object({
  id: z.string().uuid(),
  owner_user_id: z.string().uuid(),
  cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  metadata_version: z.string(),
  pipeline_version: z.string(),
  status: generationJobStatusSchema,
  current_stage: z.string(),
  dispatch_status: z.enum(["pending", "sent", "failed"]),
  created_at: z.string(),
  updated_at: z.string(),
  videos: z.object({
    youtube_video_id: z.string(),
    title: z.string(),
    channel_name: z.string(),
    thumbnail_url: z.string().nullable(),
    duration_ms: z.number().nullable(),
  }),
});

function mapJob(raw: unknown): GenerationJob {
  const row = rawJobSchema.parse(raw);
  return generationJobSchema.parse({
    id: row.id,
    ownerUserId: row.owner_user_id,
    videoId: row.videos.youtube_video_id,
    videoTitle: row.videos.title,
    channelName: row.videos.channel_name,
    ...(row.videos.thumbnail_url
      ? { thumbnailUrl: row.videos.thumbnail_url }
      : {}),
    ...(row.videos.duration_ms !== null
      ? { durationMs: row.videos.duration_ms }
      : {}),
    cefrLevel: row.cefr_level,
    metadataVersion: row.metadata_version,
    pipelineVersion: row.pipeline_version,
    status: row.status,
    currentStage: row.current_stage,
    dispatchStatus: row.dispatch_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

const jobSelect = `
  id,
  owner_user_id,
  cefr_level,
  metadata_version,
  pipeline_version,
  status,
  current_stage,
  dispatch_status,
  created_at,
  updated_at,
  videos!inner (
    youtube_video_id,
    title,
    channel_name,
    thumbnail_url,
    duration_ms
  )
`;

export class SupabaseGenerationJobRepository
  implements GenerationJobRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async getPolicySnapshot(ownerUserId: string): Promise<GenerationPolicySnapshot> {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const minuteStart = new Date(now.getTime() - 60_000);

    const [active, daily, minute] = await Promise.all([
      this.client
        .from("lesson_jobs")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", ownerUserId)
        .in("status", [...activeGenerationJobStatuses]),
      this.client
        .from("lesson_jobs")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", ownerUserId)
        .gte("created_at", dayStart.toISOString()),
      this.client
        .from("lesson_jobs")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", ownerUserId)
        .gte("created_at", minuteStart.toISOString()),
    ]);

    if (active.error || daily.error || minute.error) {
      throw active.error ?? daily.error ?? minute.error;
    }

    return {
      activeJobCount: active.count ?? 0,
      jobsCreatedToday: daily.count ?? 0,
      jobsCreatedLastMinute: minute.count ?? 0,
    };
  }

  async createOrReuse(
    input: CreateGenerationJobRecord,
  ): Promise<{ job: GenerationJob; created: boolean }> {
    const existingVideo = await this.client
      .from("videos")
      .select("id")
      .eq("youtube_video_id", input.metadata.videoId)
      .maybeSingle();
    if (existingVideo.error) throw existingVideo.error;

    let existingJobId: string | undefined;
    if (existingVideo.data?.id) {
      const existing = await this.client
        .from("lesson_jobs")
        .select("id")
        .eq("owner_user_id", input.ownerUserId)
        .eq("video_id", existingVideo.data.id)
        .eq("cefr_level", input.cefrLevel)
        .eq("pipeline_version", input.pipelineVersion)
        .in("status", [...activeGenerationJobStatuses])
        .maybeSingle();
      if (existing.error) throw existing.error;
      existingJobId = existing.data?.id;
    }

    const rpc = await this.client.rpc("create_or_reuse_lesson_job", {
      p_owner_user_id: input.ownerUserId,
      p_youtube_video_id: input.metadata.videoId,
      p_title: input.metadata.title,
      p_channel_name: input.metadata.channelName,
      p_thumbnail_url: input.metadata.thumbnailUrl ?? null,
      p_duration_ms: input.metadata.durationMs ?? null,
      p_cefr_level: input.cefrLevel,
      p_metadata_version: input.metadata.metadataVersion,
      p_pipeline_version: input.pipelineVersion,
    });
    if (rpc.error) throw rpc.error;

    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    const jobId = z.object({ id: z.string().uuid() }).parse(row).id;
    const job = await this.findOwnedById(jobId, input.ownerUserId);
    if (!job) throw new Error("Generation job was not readable after commit.");
    return { job, created: existingJobId !== job.id };
  }

  async findOwnedById(
    jobId: string,
    ownerUserId: string,
  ): Promise<GenerationJob | null> {
    const result = await this.client
      .from("lesson_jobs")
      .select(jobSelect)
      .eq("id", jobId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data ? mapJob(result.data) : null;
  }

  async advanceStory21(jobId: string): Promise<GenerationJob | null> {
    const current = await this.client
      .from("lesson_jobs")
      .select("owner_user_id,status")
      .eq("id", jobId)
      .maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return null;
    if (
      current.data.status !== "queued" &&
      current.data.status !== "validating_video"
    ) {
      return this.findOwnedById(jobId, current.data.owner_user_id);
    }

    await this.updateStatus(jobId, "validating_video", "validating_video");
    return this.updateStatus(
      jobId,
      "acquiring_transcript",
      "acquiring_transcript",
    );
  }

  async markDispatch(
    jobId: string,
    status: "sent" | "failed",
  ): Promise<void> {
    const result = await this.client
      .from("lesson_jobs")
      .update({
        dispatch_status: status,
        dispatched_at: status === "sent" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (result.error) throw result.error;
  }

  async updateStatus(
    jobId: string,
    status: GenerationJobStatus,
    currentStage: string,
  ): Promise<GenerationJob | null> {
    const updated = await this.client
      .from("lesson_jobs")
      .update({
        status,
        current_stage: currentStage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("owner_user_id")
      .maybeSingle();
    if (updated.error) throw updated.error;
    return updated.data
      ? this.findOwnedById(jobId, updated.data.owner_user_id)
      : null;
  }
}
