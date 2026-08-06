import "server-only";

import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLearningSessionRepository } from "@/adapters/supabase/learning-session-repository";
import type { LearningSessionRepository } from "@/modules/learning/ports/learning-session-repository";

let fakeRepository: InMemoryLearningSessionRepository | undefined;
let supabaseRepository: SupabaseLearningSessionRepository | undefined;

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

export function createLearningSessionRepository(): LearningSessionRepository {
  if (configuredRepository() === "fake") {
    fakeRepository ??= new InMemoryLearningSessionRepository();
    return fakeRepository;
  }

  supabaseRepository ??= new SupabaseLearningSessionRepository(
    getAdminSupabaseClient(),
  );
  return supabaseRepository;
}
