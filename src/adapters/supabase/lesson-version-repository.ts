import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  LessonVersionRepository,
  PublishLessonVersionInput,
} from "@/modules/learning/ports/lesson-version-repository";
import { lessonBlueprintV2Schema } from "@/shared/contracts/lesson-v2";

const publishRpcRowSchema = z
  .object({
    lesson_version_id: z.string().uuid(),
    created: z.boolean(),
  })
  .strict();

function firstRow(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

export class SupabaseLessonVersionRepository
  implements LessonVersionRepository
{
  constructor(private readonly client: SupabaseClient) {}

  /**
   * Blueprints published before `job_id` existed, reached through the v1 lesson.
   *
   * Kept so nothing already on a learner's account becomes unreachable when the
   * parent changes. Nothing new writes this shape.
   */
  private async findLegacyForJob(input: {
    ownerUserId: string;
    jobId: string;
  }) {
    const lesson = await this.client
      .from("lessons")
      .select("id")
      .eq("owner_user_id", input.ownerUserId)
      .eq("job_id", input.jobId)
      .maybeSingle();
    if (lesson.error) throw lesson.error;
    if (!lesson.data) return null;

    const result = await this.client
      .from("lesson_versions")
      .select("id,blueprint")
      .eq("owner_user_id", input.ownerUserId)
      .eq("lesson_id", (lesson.data as { id: string }).id)
      .eq("schema_version", "lesson:v2")
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data ?? null;
  }

  async findForJob(input: { ownerUserId: string; jobId: string }) {
    // Read straight off the job. Blueprints published before this column
    // existed still hang off a v1 lesson, so those are found through the
    // fallback below rather than left unreachable.
    const result = await this.client
      .from("lesson_versions")
      .select("id,blueprint")
      .eq("owner_user_id", input.ownerUserId)
      .eq("job_id", input.jobId)
      .eq("schema_version", "lesson:v2")
      .maybeSingle();
    if (result.error) throw result.error;
    const found = result.data ?? (await this.findLegacyForJob(input));
    if (!found) return null;

    const row = found as { id: string; blueprint: unknown };
    return {
      lessonVersionId: row.id,
      blueprint: lessonBlueprintV2Schema.parse(row.blueprint),
    };
  }

  async findByIdForOwner(input: {
    ownerUserId: string;
    lessonVersionId: string;
  }) {
    const result = await this.client
      .from("lesson_versions")
      .select("id,blueprint")
      .eq("owner_user_id", input.ownerUserId)
      .eq("id", input.lessonVersionId)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;

    const row = result.data as { id: string; blueprint: unknown };
    return {
      lessonVersionId: row.id,
      blueprint: lessonBlueprintV2Schema.parse(row.blueprint),
    };
  }

  async publish(input: PublishLessonVersionInput) {
    // Parsed here rather than trusted from the caller. The database refuses a
    // blueprint whose schemaVersion is wrong, but it cannot check the rest of
    // the shape, and a blueprint that parses only at read time would fail in
    // front of a learner mid-session instead of at publish time.
    const blueprint = lessonBlueprintV2Schema.parse(input.blueprint);

    const rpc = await this.client.rpc("publish_lesson_version_for_job", {
      p_owner_user_id: input.ownerUserId,
      p_job_id: input.jobId,
      p_blueprint: blueprint,
    });
    if (rpc.error) throw rpc.error;

    const row = publishRpcRowSchema.parse(firstRow(rpc.data));
    return { lessonVersionId: row.lesson_version_id, created: row.created };
  }
}
