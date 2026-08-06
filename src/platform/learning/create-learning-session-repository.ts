import "server-only";

import { InMemoryLearningSessionRepository } from "@/adapters/fake/in-memory-learning-session-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLearningSessionRepository } from "@/adapters/supabase/learning-session-repository";
import type { LearningSessionRepository } from "@/modules/learning/ports/learning-session-repository";
import { getServerConfig } from "@/platform/config/server";

let fakeRepository: InMemoryLearningSessionRepository | undefined;
let supabaseRepository: SupabaseLearningSessionRepository | undefined;

export function createLearningSessionRepository(): LearningSessionRepository {
  const config = getServerConfig();

  if (config.LEARNING_SESSION_REPOSITORY === "fake") {
    fakeRepository ??= new InMemoryLearningSessionRepository();
    return fakeRepository;
  }

  supabaseRepository ??= new SupabaseLearningSessionRepository(
    getAdminSupabaseClient(),
  );
  return supabaseRepository;
}
