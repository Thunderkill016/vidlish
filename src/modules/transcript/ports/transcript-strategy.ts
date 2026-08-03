import type { TranscriptStrategyResult } from "@/shared/contracts/transcript";

export interface TranscriptStrategy {
  readonly id: "supadata-native-caption";
  acquire(input: {
    videoId: string;
    signal?: AbortSignal;
  }): Promise<TranscriptStrategyResult>;
}
