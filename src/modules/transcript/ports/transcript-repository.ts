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
}
