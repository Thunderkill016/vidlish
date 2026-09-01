import "server-only";

import { FixtureLessonProvider } from "@/adapters/fake/fixture-lesson-provider";
import { getInMemoryLessonRepository } from "@/adapters/fake/in-memory-lesson-repository";
import { GeminiLessonProvider } from "@/adapters/gemini/gemini-lesson-provider";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLessonRepository } from "@/adapters/supabase/lesson-repository";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { GenerateLesson } from "@/modules/lesson/application/generate-lesson";
import type { LessonRepository } from "@/modules/lesson/ports/lesson-repository";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import { getServerConfig } from "@/platform/config/server";

export function createLessonRepository(
  generationRepository: GenerationJobRepository,
  transcriptRepository: TranscriptRepository,
): LessonRepository {
  return getServerConfig().TRANSCRIPT_REPOSITORY === "fake"
    ? getInMemoryLessonRepository(generationRepository, transcriptRepository)
    : new SupabaseLessonRepository(getAdminSupabaseClient());
}

export function createGenerateLesson(
  generationRepository: GenerationJobRepository,
  transcriptRepository: TranscriptRepository,
): GenerateLesson {
  const config = getServerConfig();

  if (config.LESSON_PROVIDER === "gemini" && !config.GEMINI_API_KEY) {
    throw new Error("Lesson provider configuration is invalid.");
  }

  const provider =
    config.LESSON_PROVIDER === "fixture"
      ? new FixtureLessonProvider()
      : new GeminiLessonProvider({
          apiKey: config.GEMINI_API_KEY!,
          modelId: config.LESSON_MODEL_ID,
        });

  return new GenerateLesson(
    createLessonRepository(generationRepository, transcriptRepository),
    provider,
  );
}
