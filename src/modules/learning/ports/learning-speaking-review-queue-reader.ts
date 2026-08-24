import type { LearningSpeakingReviewQueue } from "@/shared/contracts/learning-speaking";

export interface LearningSpeakingReviewQueueReader {
  read(ownerUserId: string, now?: Date): Promise<LearningSpeakingReviewQueue>;
}
