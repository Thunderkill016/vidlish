import "server-only";

import { InMemoryBeginnerProgressRepository } from "@/adapters/fake/in-memory-beginner-progress-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseBeginnerProgressRepository } from "@/adapters/supabase/beginner-progress-repository";
import type { BeginnerProgressRepository } from "@/modules/learning/ports/beginner-progress-repository";

type BeginnerProgressGlobal = typeof globalThis & {
  __vidlishFakeBeginnerProgressRepository?: InMemoryBeginnerProgressRepository;
};

const progressGlobal = globalThis as BeginnerProgressGlobal;

/**
 * One instance per process, or a word recorded by one route handler is
 * invisible to the next and the learner's known set resets between requests.
 */
function fakeRepository(): InMemoryBeginnerProgressRepository {
  progressGlobal.__vidlishFakeBeginnerProgressRepository ??=
    new InMemoryBeginnerProgressRepository();
  return progressGlobal.__vidlishFakeBeginnerProgressRepository;
}

export function createBeginnerProgressRepository(): BeginnerProgressRepository {
  // Deliberately the same switch the learning session repository uses, so a
  // deployment cannot end up with real sessions writing to a fake evidence
  // store — which would lose exactly the evidence the product is built on.
  const value =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");

  if (value === "supabase") {
    return new SupabaseBeginnerProgressRepository(getAdminSupabaseClient());
  }

  const isCi = process.env.CI === "true" || process.env.CI === "1";
  if (process.env.NODE_ENV === "production" && !isCi) {
    throw new Error(
      "The fake beginner progress repository cannot run in production.",
    );
  }
  return fakeRepository();
}
