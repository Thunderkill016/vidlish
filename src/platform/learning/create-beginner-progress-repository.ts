import "server-only";

import { InMemoryBeginnerProgressRepository } from "@/adapters/fake/in-memory-beginner-progress-repository";
import { SupabaseBeginnerProgressRepository } from "@/adapters/supabase/beginner-progress-repository";
import { createServerSupabaseClient } from "@/adapters/supabase/server-client";
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

export async function createBeginnerProgressRepository(): Promise<BeginnerProgressRepository> {
  // The learner's own server-side Supabase client carries their verified
  // session into the RPC. Using a service client here would make `auth.uid()`
  // unavailable to the database policy and turn an ownership invariant into
  // a promise made only by application code.
  const value =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");

  if (value === "supabase") {
    return new SupabaseBeginnerProgressRepository(await createServerSupabaseClient());
  }

  const isCi = process.env.CI === "true" || process.env.CI === "1";
  if (process.env.NODE_ENV === "production" && !isCi) {
    throw new Error(
      "The fake beginner progress repository cannot run in production.",
    );
  }
  return fakeRepository();
}
