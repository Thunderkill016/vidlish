import "server-only";

import { SupabaseLearningSpeakingAttemptRepository } from "@/adapters/supabase/learning-speaking-attempt-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import type { LearningSpeakingAttemptRepository } from "@/modules/learning/ports/learning-speaking-attempt-repository";

export function createLearningSpeakingAttemptRepository(): LearningSpeakingAttemptRepository {
  return new SupabaseLearningSpeakingAttemptRepository(getAdminSupabaseClient());
}
