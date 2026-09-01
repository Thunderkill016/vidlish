import "server-only";

import { getInMemoryStudyProgressRepository } from "@/adapters/fake/in-memory-study-progress-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseStudyProgressRepository } from "@/adapters/supabase/study-progress-repository";
import type { LessonRepository } from "@/modules/lesson/ports/lesson-repository";
import type { StudyProgressRepository } from "@/modules/study/ports/study-progress-repository";
import { getServerConfig } from "@/platform/config/server";

export function createStudyProgressRepository(
  lessonRepository: LessonRepository,
): StudyProgressRepository {
  // Same switch as the lesson repository: progress lives in the same store as
  // the lessons it belongs to, never split across a fake and Supabase.
  return getServerConfig().TRANSCRIPT_REPOSITORY === "fake"
    ? getInMemoryStudyProgressRepository(lessonRepository)
    : new SupabaseStudyProgressRepository(getAdminSupabaseClient());
}
