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
    return learningSpeakingReviewQueueSchema.parse({ due: [], upcoming: null });
  }
}
