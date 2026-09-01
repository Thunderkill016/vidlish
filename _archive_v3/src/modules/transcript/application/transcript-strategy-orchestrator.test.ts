import { describe, expect, it } from "vitest";

import { TranscriptStrategyOrchestrator } from "@/modules/transcript/application/transcript-strategy-orchestrator";
import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import type { GenerationJob } from "@/shared/contracts/generation";
import {
  NATIVE_CAPTION_STRATEGY_ID,
  type TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

const job = {
  id: "11111111-1111-4111-8111-111111111111",
  ownerUserId: "22222222-2222-4222-8222-222222222222",
} as GenerationJob;

function strategy(id: string): TranscriptStrategy {
  return {
    id: id as TranscriptStrategy["id"],
    provider: "supadata",
    async acquire(): Promise<TranscriptStrategyResult> {
      return { kind: "not_applicable", reason: "NO_USABLE_CAPTIONS" };
    },
  };
}

function orchestrator(
  registrations: Array<{
    strategy: TranscriptStrategy;
    order: number;
    enabled: boolean;
  }>,
  exhausted: string[] = [],
) {
  return new TranscriptStrategyOrchestrator(registrations, {
    async listExhaustedStrategyIds() {
      return exhausted;
    },
  });
}

describe("TranscriptStrategyOrchestrator", () => {
  it("returns the lowest-order enabled strategy first", async () => {
    const result = await orchestrator([
      { strategy: strategy("second"), order: 20, enabled: true },
      { strategy: strategy(NATIVE_CAPTION_STRATEGY_ID), order: 10, enabled: true },
    ]).next(job);

    expect(result.kind).toBe("next");
    if (result.kind !== "next") return;
    expect(result.strategy.id).toBe(NATIVE_CAPTION_STRATEGY_ID);
  });

  it("skips a disabled strategy without treating it as attempted", async () => {
    const result = await orchestrator([
      { strategy: strategy("disabled"), order: 10, enabled: false },
      { strategy: strategy("enabled"), order: 20, enabled: true },
    ]).next(job);

    expect(result.kind).toBe("next");
    if (result.kind !== "next") return;
    expect(result.strategy.id).toBe("enabled");
  });

  it("never returns a strategy that already gave a non-retryable outcome", async () => {
    const result = await orchestrator(
      [
        { strategy: strategy("first"), order: 10, enabled: true },
        { strategy: strategy("second"), order: 20, enabled: true },
      ],
      ["first"],
    ).next(job);

    expect(result.kind).toBe("next");
    if (result.kind !== "next") return;
    expect(result.strategy.id).toBe("second");
  });

  it("reports exhaustion once every enabled strategy has been used", async () => {
    const result = await orchestrator(
      [
        { strategy: strategy("first"), order: 10, enabled: true },
        { strategy: strategy("second"), order: 20, enabled: true },
      ],
      ["first", "second"],
    ).next(job);

    expect(result.kind).toBe("exhausted");
    if (result.kind !== "exhausted") return;
    expect(result.attempted).toEqual(["first", "second"]);
  });

  it("reports exhaustion when every strategy is disabled", async () => {
    const result = await orchestrator([
      { strategy: strategy("only"), order: 10, enabled: false },
    ]).next(job);

    expect(result.kind).toBe("exhausted");
    if (result.kind !== "exhausted") return;
    expect(result.attempted).toEqual([]);
  });

  it("reports exhaustion when nothing is registered", async () => {
    const result = await orchestrator([]).next(job);
    expect(result.kind).toBe("exhausted");
  });

  it("rejects duplicate strategy registrations", () => {
    expect(
      () =>
        new TranscriptStrategyOrchestrator(
          [
            { strategy: strategy("same"), order: 10, enabled: true },
            { strategy: strategy("same"), order: 20, enabled: true },
          ],
          { async listExhaustedStrategyIds() { return []; } },
        ),
    ).toThrow(/unique/i);
  });

  it("reports only enabled strategies as remaining capability", async () => {
    const subject = orchestrator([
      { strategy: strategy("first"), order: 10, enabled: true },
      { strategy: strategy("second"), order: 20, enabled: false },
    ]);

    await expect(subject.hasUntriedStrategy(job)).resolves.toBe(true);

    const used = orchestrator(
      [
        { strategy: strategy("first"), order: 10, enabled: true },
        { strategy: strategy("second"), order: 20, enabled: false },
      ],
      ["first"],
    );
    await expect(used.hasUntriedStrategy(job)).resolves.toBe(false);
  });
});
