import "server-only";

import { FixtureLearningAuthoringProvider } from "@/adapters/fake/fixture-learning-authoring-provider";
import { GeminiLearningAuthoringProvider } from "@/adapters/gemini/gemini-learning-authoring-provider";
import { InMemoryLessonVersionRepository } from "@/adapters/fake/in-memory-lesson-version-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLessonVersionRepository } from "@/adapters/supabase/lesson-version-repository";
import { AuthorLearningLesson } from "@/modules/learning/application/author-learning-lesson";
import type { LearningAuthoringProvider } from "@/modules/learning/ports/learning-authoring-provider";
import type { LessonVersionRepository } from "@/modules/learning/ports/lesson-version-repository";
import { getServerConfig } from "@/platform/config/server";

type AuthoringGlobal = typeof globalThis & {
  __vidlishFakeLessonVersionRepository?: InMemoryLessonVersionRepository;
};

const authoringGlobal = globalThis as AuthoringGlobal;

/**
 * The in-memory repository has to be one instance per process, or a lesson
 * published by one route handler is invisible to the next and publish-once
 * silently stops holding.
 */
function fakeRepository(): InMemoryLessonVersionRepository {
  authoringGlobal.__vidlishFakeLessonVersionRepository ??=
    new InMemoryLessonVersionRepository();
  return authoringGlobal.__vidlishFakeLessonVersionRepository;
}

export function learningAuthoringEnabled(): boolean {
  return getServerConfig().LEARNING_AUTHORING_PROVIDER !== "off";
}

export function createLearningAuthoringProvider(): LearningAuthoringProvider {
  const config = getServerConfig();

  if (config.LEARNING_AUTHORING_PROVIDER === "off") {
    throw new Error("Learning authoring is disabled.");
  }
  if (config.LEARNING_AUTHORING_PROVIDER === "fixture") {
    return new FixtureLearningAuthoringProvider();
  }
  if (!config.GEMINI_API_KEY) {
    // Fail closed. A missing key must not silently fall back to the fixture
    // provider, or production would publish stand-in lessons that look real.
    throw new Error("Learning authoring provider configuration is invalid.");
  }
  return new GeminiLearningAuthoringProvider({
    apiKey: config.GEMINI_API_KEY,
    modelId: config.LESSON_MODEL_ID,
  });
}

export function createLessonVersionRepository(): LessonVersionRepository {
  // Follows the same switch as the session repository, read the same way: v2
  // content and v2 sessions have to live in the same store or a published
  // blueprint is invisible to the session that should run it.
  const configured =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");
  return configured === "fake"
    ? fakeRepository()
    : new SupabaseLessonVersionRepository(getAdminSupabaseClient());
}

export function createAuthorLearningLesson(): AuthorLearningLesson {
  return new AuthorLearningLesson(
    createLearningAuthoringProvider(),
    createLessonVersionRepository(),
  );
}
