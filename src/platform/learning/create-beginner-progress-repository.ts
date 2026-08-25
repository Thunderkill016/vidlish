import "server-only";

import { InMemoryBeginnerProgressRepository } from "@/adapters/fake/in-memory-beginner-progress-repository";
import { SupabaseBeginnerProgressRepository } from "@/adapters/supabase/beginner-progress-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
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
  // The Nếp branch changed this to the learner's own session client, reasoning
  // that `auth.uid()` should reach the database so ownership is a policy rather
  // than a promise made by application code. That reasoning is right, and the
  // change cannot ship as it stands: `record_beginner_challenge_evidence`,
  // `record_beginner_challenge_evidence` and the newer evidence functions are
  // `grant execute ... to service_role` only, and the review-schedule write goes
  // straight at `learning_item_states`, where `authenticated` has select and
  // nothing else. With a session client every evidence write in the beginner
  // track would be denied in production — and CI would not notice, because it
  // runs the fake repository.
  //
  // Moving to the session client is real work with its own migration and pgTAP:
  // widen the grants, prove the policies, prove a learner cannot write another
  // learner's row. Until then the admin client stays, and the ownership check
  // stays where it already is — the server-owned challenge, which the browser
  // cannot choose.
  //
  // The async signature is kept so the call sites do not have to change twice.
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
