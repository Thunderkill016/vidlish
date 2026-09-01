import type {
  CanonicalTranscript,
  TranscriptPersistResult,
  TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

export type TranscriptAttemptRecord = {
  ownerUserId: string;
  jobId: string;
  strategyId: "supadata-native-caption";
  provider: "supadata";
  result: Exclude<TranscriptStrategyResult, { kind: "success" }>;
  latencyMs: number;
};

export interface TranscriptRepository {
  recordAttempt(input: TranscriptAttemptRecord): Promise<void>;
  persistAndAdvance(input: {
    ownerUserId: string;
    jobId: string;
    transcript: CanonicalTranscript;
    latencyMs: number;
  }): Promise<TranscriptPersistResult>;
  findCanonicalForJob(
    ownerUserId: string,
    jobId: string,
  ): Promise<CanonicalTranscript | null>;
  /**
   * Strategies that already produced a non-retryable outcome for this job.
   * Retryable failures are excluded: the durable workflow retries those, so a
   * strategy is only finished once it reports it cannot help or fails terminally.
   */
  listExhaustedStrategyIds(
    ownerUserId: string,
    jobId: string,
  ): Promise<string[]>;
}
