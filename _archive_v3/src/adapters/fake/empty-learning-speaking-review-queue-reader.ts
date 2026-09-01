import type { LearningSpeakingReviewQueueReader } from "@/modules/learning/ports/learning-speaking-review-queue-reader";
import { learningSpeakingReviewQueueSchema } from "@/shared/contracts/learning-speaking";

/**
 * Fake learning sessions do not persist trustworthy completion timestamps plus
 * speaking receipts across the same durable store. Returning an explicit empty
 * queue is safer than fabricating delayed-independent eligibility in product
 * fixtures.
 */
export class EmptyLearningSpeakingReviewQueueReader
  implements LearningSpeakingReviewQueueReader
{
  async read() {
    // A seam for proving the dashboard survives a broken panel, and only a
    // seam: it lives inside the fake adapter, which production never
    // constructs — `LEARNING_SESSION_REPOSITORY` selects the Supabase reader
    // there. So the fault cannot be injected into a running product even if
    // the variable were set.
    //
    // It exists because the failure it simulates was real: the speaking
    // attempts table had never been migrated to production, this read threw,
    // and the learner's whole home page returned 500.
    if (process.env.FAKE_SPEAKING_QUEUE_FAULT === "missing_table") {
      throw new Error(
        "Could not find the table 'public.learning_speaking_attempts' in the schema cache",
      );
    }
    return learningSpeakingReviewQueueSchema.parse({ due: [], upcoming: null });
  }
}
