import type { LearningSpeakingAttemptRepository } from "@/modules/learning/ports/learning-speaking-attempt-repository";
import {
  recordLearningSpeakingAttemptInputSchema,
  type RecordLearningSpeakingAttemptInput,
} from "@/shared/contracts/learning-speaking";

/**
 * Persist one privacy-safe receipt for a real microphone capture.
 *
 * Raw audio is deliberately outside this boundary. The HTTP layer may inspect
 * the uploaded Blob to obtain byte count/MIME type, but only bounded metadata
 * reaches the repository. The receipt is speaking participation evidence, not
 * a pronunciation score or proof of intelligibility.
 */
export class RecordLearningSpeakingAttempt {
  constructor(private readonly repository: LearningSpeakingAttemptRepository) {}

  execute(input: RecordLearningSpeakingAttemptInput) {
    return this.repository.record(recordLearningSpeakingAttemptInputSchema.parse(input));
  }
}
