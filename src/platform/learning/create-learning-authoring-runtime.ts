import "server-only";

import { FixtureLearningAuthoringProvider } from "@/adapters/fake/fixture-learning-authoring-provider";
import { GeminiLearningAuthoringProvider } from "@/adapters/gemini/gemini-learning-authoring-provider";
import { InMemoryLearningAuthoringBriefRepository } from "@/adapters/fake/in-memory-learning-authoring-brief-repository";
import { InMemoryLessonVersionRepository } from "@/adapters/fake/in-memory-lesson-version-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLearningAuthoringBriefRepository } from "@/adapters/supabase/learning-authoring-brief-repository";
import { SupabaseLessonVersionRepository } from "@/adapters/supabase/lesson-version-repository";
import {
  AuthorLearningLesson,
  DiagnoseLearningLesson,
} from "@/modules/learning/application/author-learning-lesson";
import type { LearningAuthoringProvider } from "@/modules/learning/ports/learning-authoring-provider";
import type { LearningAuthoringBriefRepository } from "@/modules/learning/ports/learning-authoring-brief-repository";
import type { LessonVersionRepository } from "@/modules/learning/ports/lesson-version-repository";
import { getServerConfig } from "@/platform/config/server";

type AuthoringGlobal = typeof globalThis & {
  __vidlishFakeLessonVersionRepository?: InMemoryLessonVersionRepository;
  __vidlishFakeAuthoringBriefRepository?: InMemoryLearningAuthoringBriefRepository;
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
  return usesFakeStore()
    ? fakeRepository()
    : new SupabaseLessonVersionRepository(getAdminSupabaseClient());
}

function usesFakeStore(): boolean {
  const configured =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");
  return configured === "fake";
}

export function createAuthoringBriefRepository(): LearningAuthoringBriefRepository {
  if (!usesFakeStore()) {
    return new SupabaseLearningAuthoringBriefRepository(getAdminSupabaseClient());
  }
  // One instance per process, or the brief saved by the diagnosis step is
  // invisible to the authoring step that has to read it back.
  authoringGlobal.__vidlishFakeAuthoringBriefRepository ??=
    new InMemoryLearningAuthoringBriefRepository();
  return authoringGlobal.__vidlishFakeAuthoringBriefRepository;
}

export function createDiagnoseLearningLesson(): DiagnoseLearningLesson {
  return new DiagnoseLearningLesson(
    createLearningAuthoringProvider(),
    createAuthoringBriefRepository(),
  );
}

export function createAuthorLearningLesson(): AuthorLearningLesson {
  return new AuthorLearningLesson(
    createLearningAuthoringProvider(),
    createLessonVersionRepository(),
    createAuthoringBriefRepository(),
  );
}
