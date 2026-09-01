import type { TranscriptStrategyResult } from "@/shared/contracts/transcript";

export interface TranscriptStrategy {
  readonly id: "supadata-native-caption";
  /** Provenance for attempt records; taken from the instance that actually ran. */
  readonly provider: "supadata";
  acquire(input: {
    videoId: string;
    signal?: AbortSignal;
  }): Promise<TranscriptStrategyResult>;
}
