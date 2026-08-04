import type {
  CanonicalTranscript,
  TranscriptCostBand,
  TranscriptPersistResult,
  TranscriptProvider,
  TranscriptStrategyId,
  TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

export type TranscriptAttemptRecord = {
  ownerUserId: string;
  jobId: string;
  strategyId: TranscriptStrategyId;
  provider: TranscriptProvider;
  costBand: TranscriptCostBand;
  result: Exclude<TranscriptStrategyResult, { kind: "success" }>;
  latencyMs: number;
  providerJobId?: string;
  providerRequestId?: string;
};

export interface TranscriptRepository {
  recordAttempt(input: TranscriptAttemptRecord): Promise<void>;
  persistAndAdvance(input: {
    ownerUserId: string;
    jobId: string;
    transcript: CanonicalTranscript;
    latencyMs: number;
    costBand?: TranscriptCostBand;
    providerJobId?: string;
  }): Promise<TranscriptPersistResult>;
  findCanonicalForJob(
    ownerUserId: string,
    jobId: string,
  ): Promise<CanonicalTranscript | null>;
}
