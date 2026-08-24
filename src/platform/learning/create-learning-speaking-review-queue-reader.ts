import "server-only";

import { EmptyLearningSpeakingReviewQueueReader } from "@/adapters/fake/empty-learning-speaking-review-queue-reader";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLearningSpeakingReviewQueueReader } from "@/adapters/supabase/learning-speaking-review-queue-reader";
import type { LearningSpeakingReviewQueueReader } from "@/modules/learning/ports/learning-speaking-review-queue-reader";

export function createLearningSpeakingReviewQueueReader(): LearningSpeakingReviewQueueReader {
  const configured =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");

  if (configured === "fake") return new EmptyLearningSpeakingReviewQueueReader();
  if (configured === "supabase") {
    return new SupabaseLearningSpeakingReviewQueueReader(getAdminSupabaseClient());
  }

  throw new Error("LEARNING_SESSION_REPOSITORY must be either fake or supabase.");
}
