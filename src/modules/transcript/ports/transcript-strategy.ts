import type {
  TranscriptCostBand,
  TranscriptStrategyId,
  TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

export interface TranscriptStrategy {
  readonly id: TranscriptStrategyId;
  readonly costBand: TranscriptCostBand;
  acquire(input: {
    videoId: string;
    signal?: AbortSignal;
  }): Promise<TranscriptStrategyResult>;
}

export interface PollableTranscriptStrategy extends TranscriptStrategy {
  poll(input: {
    providerJobId: string;
    videoId: string;
    signal?: AbortSignal;
  }): Promise<TranscriptStrategyResult>;
}

export type TranscriptStrategyRegistration = {
  strategy: TranscriptStrategy;
  order: number;
};

export class TranscriptStrategyRegistry {
  private readonly ordered: TranscriptStrategyRegistration[];

  constructor(registrations: TranscriptStrategyRegistration[]) {
    const ids = registrations.map((entry) => entry.strategy.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error("Transcript strategy IDs must be unique.");
    }
    this.ordered = [...registrations].sort(
      (left, right) => left.order - right.order,
    );
  }

  list(): readonly TranscriptStrategyRegistration[] {
    return this.ordered;
  }

  find(id: TranscriptStrategyId): TranscriptStrategy | undefined {
    return this.ordered.find((entry) => entry.strategy.id === id)?.strategy;
  }
}
