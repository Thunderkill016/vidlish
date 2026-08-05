import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import type { GenerationJob } from "@/shared/contracts/generation";

export type TranscriptStrategyRegistration = {
  strategy: TranscriptStrategy;
  /** Lower runs first. Ordering is a routing decision, not a workflow detail. */
  order: number;
  /** Configuration or policy may switch a strategy off for this environment. */
  enabled: boolean;
};

export type NextTranscriptStrategy =
  | { kind: "next"; strategy: TranscriptStrategy }
  | { kind: "exhausted"; attempted: string[] };

type ExhaustedStrategyReader = {
  listExhaustedStrategyIds(
    ownerUserId: string,
    jobId: string,
  ): Promise<string[]>;
};

/**
 * Decides which transcript strategy runs next for a job, and when none is left.
 *
 * This lives in `application/` rather than `ports/` on purpose: ordering and
 * exhaustion are policy, not a transport contract. The durable workflow keeps
 * step boundaries, retries and polling; it must not branch on a specific
 * strategy ID.
 */
export class TranscriptStrategyOrchestrator {
  private readonly ordered: TranscriptStrategyRegistration[];

  constructor(
    registrations: TranscriptStrategyRegistration[],
    private readonly attempts: ExhaustedStrategyReader,
  ) {
    const ids = registrations.map((entry) => entry.strategy.id);
    if (new Set(ids).size !== ids.length) {
      throw new Error("Transcript strategy IDs must be unique.");
    }
    this.ordered = [...registrations].sort(
      (left, right) => left.order - right.order,
    );
  }

  private async remaining(
    job: GenerationJob,
  ): Promise<{
    candidates: TranscriptStrategyRegistration[];
    attempted: string[];
  }> {
    const attempted = await this.attempts.listExhaustedStrategyIds(
      job.ownerUserId,
      job.id,
    );
    const used = new Set(attempted);
    return {
      candidates: this.ordered.filter(
        (entry) => entry.enabled && !used.has(entry.strategy.id),
      ),
      attempted,
    };
  }

  async next(job: GenerationJob): Promise<NextTranscriptStrategy> {
    const { candidates, attempted } = await this.remaining(job);
    const first = candidates[0];
    return first
      ? { kind: "next", strategy: first.strategy }
      : { kind: "exhausted", attempted };
  }

  async hasUntriedStrategy(job: GenerationJob): Promise<boolean> {
    return (await this.remaining(job)).candidates.length > 0;
  }
}
