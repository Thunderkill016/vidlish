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
