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

  async findForJob(input: { ownerUserId: string; jobId: string }) {
    // Joined through `lessons` because a lesson version hangs off a v1 lesson,
    // and the job is what the learner's URL carries.
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

    const rpc = await this.client.rpc("publish_lesson_version", {
      p_owner_user_id: input.ownerUserId,
      p_lesson_id: input.lessonId,
      p_blueprint: blueprint,
    });
    if (rpc.error) throw rpc.error;

    const row = publishRpcRowSchema.parse(firstRow(rpc.data));
    return { lessonVersionId: row.lesson_version_id, created: row.created };
  }
}
