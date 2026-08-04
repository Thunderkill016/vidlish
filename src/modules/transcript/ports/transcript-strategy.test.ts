import { describe, expect, it } from "vitest";

import { FixtureGeneratedTranscriptStrategy } from "@/adapters/fake/fixture-generated-transcript-strategy";
import { FixtureNativeCaptionStrategy } from "@/adapters/fake/fixture-native-caption-strategy";
import { TranscriptStrategyRegistry } from "@/modules/transcript/ports/transcript-strategy";

describe("TranscriptStrategyRegistry", () => {
  it("orders native captions before hosted generation", () => {
    const registry = new TranscriptStrategyRegistry([
      { strategy: new FixtureGeneratedTranscriptStrategy(), order: 20 },
      { strategy: new FixtureNativeCaptionStrategy(), order: 10 },
    ]);

    expect(registry.list().map((entry) => entry.strategy.id)).toEqual([
      "supadata-native-caption",
      "supadata-generated-transcript",
    ]);
  });

  it("rejects duplicate strategy IDs", () => {
    expect(
      () =>
        new TranscriptStrategyRegistry([
          { strategy: new FixtureNativeCaptionStrategy(), order: 10 },
          { strategy: new FixtureNativeCaptionStrategy(), order: 20 },
        ]),
    ).toThrow("unique");
  });
});
