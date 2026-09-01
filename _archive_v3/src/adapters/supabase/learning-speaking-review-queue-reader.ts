import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { fetchAllRows } from "@/adapters/supabase/fetch-all-rows";
import { deriveSpeakingReviewQueue } from "@/modules/learning/application/derive-speaking-review-queue";
import type { LearningSpeakingReviewQueueReader } from "@/modules/learning/ports/learning-speaking-review-queue-reader";

const sessionRowSchema = z
  .object({
    id: z.string().uuid(),
    lesson_version_id: z.string().uuid(),
    completed_at: z.string().datetime({ offset: true }),
  })
  .strict();

const versionRowSchema = z
  .object({
    id: z.string().uuid(),
    blueprint: z.unknown(),
  })
  .strict();

const attemptRowSchema = z
  .object({
    session_id: z.string().uuid(),
    activity_id: z.string(),
  })
  .strict();

/**
 * Rebuild the speaking-review queue from durable owner-scoped evidence.
 *
 * This is intentionally a read model, not a scheduler. Feature 024's 24-hour
 * boundary is derived from completed lesson sessions; an existing speaking
 * receipt suppresses that exact session/activity because it can no longer be a
 * first delayed independent capture.
 */
export class SupabaseLearningSpeakingReviewQueueReader
  implements LearningSpeakingReviewQueueReader
{
  constructor(private readonly client: SupabaseClient) {}

  async read(ownerUserId: string, now = new Date()) {
    const [sessionRows, versionRows, attemptRows] = await Promise.all([
      fetchAllRows((from, to) =>
        this.client
          .from("lesson_sessions")
          .select("id,lesson_version_id,completed_at", { count: "exact" })
          .eq("owner_user_id", ownerUserId)
          .eq("status", "completed")
          .not("completed_at", "is", null)
          .order("completed_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows((from, to) =>
        this.client
          .from("lesson_versions")
          .select("id,blueprint", { count: "exact" })
          .eq("owner_user_id", ownerUserId)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows((from, to) =>
        this.client
          .from("learning_speaking_attempts")
          .select("session_id,activity_id", { count: "exact" })
          .eq("owner_user_id", ownerUserId)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);

    const sessions = sessionRows.map((candidate) => sessionRowSchema.parse(candidate));
    const versions = versionRows.map((candidate) => versionRowSchema.parse(candidate));
    const attempts = attemptRows.map((candidate) => attemptRowSchema.parse(candidate));

    return deriveSpeakingReviewQueue({
      sessions: sessions.map((session) => ({
        id: session.id,
        lessonVersionId: session.lesson_version_id,
        completedAt: session.completed_at,
      })),
      blueprintsByVersion: new Map(
        versions.map((version) => [version.id, version.blueprint] as const),
      ),
      attempts: attempts.map((attempt) => ({
        sessionId: attempt.session_id,
        activityId: attempt.activity_id,
      })),
      now,
    });
  }
}
