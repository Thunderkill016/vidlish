import "server-only";

import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLearningSessionRepository } from "@/adapters/supabase/learning-session-repository";
import type { LearningReviewRepository } from "@/modules/learning/ports/learning-review-repository";
import type { LearningSessionRepository } from "@/modules/learning/ports/learning-session-repository";

type LearningRepositoryGlobal = typeof globalThis & {
  __vidlishFakeLearningSessionRepository?: InMemoryLearningSessionRepository;
  __vidlishSupabaseLearningSessionRepository?: SupabaseLearningSessionRepository;
};

const repositoryGlobal = globalThis as LearningRepositoryGlobal;

function configuredRepository(): "fake" | "supabase" {
  const value =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");
  if (value !== "fake" && value !== "supabase") {
    throw new Error(
      "LEARNING_SESSION_REPOSITORY must be either fake or supabase.",
    );
  }
  const isCi = process.env.CI === "true" || process.env.CI === "1";
  if (process.env.NODE_ENV === "production" && !isCi && value === "fake") {
    throw new Error(
      "The fake learning session repository cannot run in production.",
    );
  }
  return value;
}

function fakeRepository(): InMemoryLearningSessionRepository {
  repositoryGlobal.__vidlishFakeLearningSessionRepository ??=
    new InMemoryLearningSessionRepository();
  return repositoryGlobal.__vidlishFakeLearningSessionRepository;
}

function supabaseRepository(): SupabaseLearningSessionRepository {
  repositoryGlobal.__vidlishSupabaseLearningSessionRepository ??=
    new SupabaseLearningSessionRepository(getAdminSupabaseClient());
  return repositoryGlobal.__vidlishSupabaseLearningSessionRepository;
}

export function createLearningSessionRepository(): LearningSessionRepository {
  return configuredRepository() === "fake" ? fakeRepository() : supabaseRepository();
}

export function createLearningReviewRepository(): LearningReviewRepository {
  return configuredRepository() === "fake" ? fakeRepository() : supabaseRepository();
}