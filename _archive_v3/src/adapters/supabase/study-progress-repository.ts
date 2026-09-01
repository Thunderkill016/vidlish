import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { summarizeStudyProgress } from "@/modules/study/application/score-study-progress";
import type {
  SaveStudyProgressInput,
  StudyProgressRepository,
} from "@/modules/study/ports/study-progress-repository";
import {
  studyProgressSchema,
  studyProgressStateSchema,
  type StudyProgress,
  type StudyProgressSummary,
} from "@/shared/contracts/study";

const rawProgressSchema = z.object({
  job_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  state: z.unknown(),
  completed_at: z.string().nullable(),
  updated_at: z.string(),
});

function toProgress(row: z.infer<typeof rawProgressSchema>): StudyProgress {
  return studyProgressSchema.parse({
    jobId: row.job_id,
    lessonId: row.lesson_id,
    state: studyProgressStateSchema.parse(row.state),
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  });
}

export class SupabaseStudyProgressRepository
  implements StudyProgressRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async findOwnedByJobId(
    jobId: string,
    ownerUserId: string,
  ): Promise<StudyProgress | null> {
    // One row per lesson, and a job can hold more than one lesson once a second
    // pipeline version exists. Take the most recently touched one instead of
    // failing the read the day that happens.
    const result = await this.client
      .from("lesson_progress")
      .select("job_id,lesson_id,state,completed_at,updated_at")
      .eq("job_id", jobId)
      .eq("owner_user_id", ownerUserId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;
    return toProgress(rawProgressSchema.parse(result.data));
  }

  async save(input: SaveStudyProgressInput): Promise<StudyProgress> {
    const rpc = await this.client.rpc("save_lesson_progress", {
      p_owner_user_id: input.ownerUserId,
      p_job_id: input.jobId,
      p_state: input.state,
      p_completed: input.completed,
    });
    if (rpc.error) throw rpc.error;

    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
    return toProgress(rawProgressSchema.parse(row));
  }

  async listOwnedSummaries(
    ownerUserId: string,
  ): Promise<StudyProgressSummary[]> {
    // One row per lesson, and the library itself shows at most 100 lessons, so
    // this stays inside a single Data API response by construction.
    const result = await this.client
      .from("lesson_progress")
      .select("job_id,state,completed_at")
      .eq("owner_user_id", ownerUserId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (result.error) throw result.error;

    const seenJobIds = new Set<string>();
    return z
      .array(
        z.object({
          job_id: z.string().uuid(),
          state: z.unknown(),
          completed_at: z.string().nullable(),
        }),
      )
      .parse(result.data ?? [])
      // Newest first, so the shelf shows the progress on the lesson the learner
      // touched last when a job has more than one.
      .filter((row) => {
        if (seenJobIds.has(row.job_id)) return false;
        seenJobIds.add(row.job_id);
        return true;
      })
      .map((row) =>
        summarizeStudyProgress(
          row.job_id,
          studyProgressStateSchema.parse(row.state),
          row.completed_at,
        ),
      );
  }
}
