import "server-only";

import { z } from "zod";

const FIXTURE_LESSON_VERSION_ID = "77777777-7777-4777-8777-777777777777";

export function resolveLearningLabLessonVersionId(): string {
  const configured = process.env.LEARNING_LAB_V2_LESSON_VERSION_ID;
  const repository =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");

  if (!configured && repository === "supabase") {
    throw new Error(
      "LEARNING_LAB_V2_LESSON_VERSION_ID is required for Supabase persistence.",
    );
  }

  return z.string().uuid().parse(configured ?? FIXTURE_LESSON_VERSION_ID);
}
