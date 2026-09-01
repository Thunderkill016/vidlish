import type {
  LearningSpeakingAttempt,
  RecordLearningSpeakingAttemptInput,
} from "@/shared/contracts/learning-speaking";

export interface LearningSpeakingAttemptRepository {
  record(
    input: RecordLearningSpeakingAttemptInput,
  ): Promise<{ attempt: LearningSpeakingAttempt; created: boolean }>;
}
