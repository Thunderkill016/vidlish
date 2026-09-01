import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import {
  lessonBlueprintV2Schema,
  sourceEvidenceSchema,
  type LessonBlueprintV2,
} from "@/shared/contracts/lesson-v2";

const segA = `seg_${"a".repeat(32)}`;

export function validLearningBlueprint(): LessonBlueprintV2 {
  return createFixtureLearningBlueprint();
}

describe("lessonBlueprintV2Schema", () => {
  it("accepts a short learning sequence without vocabulary or grammar quotas", () => {
    const blueprint = validLearningBlueprint();

    expect(blueprint.targetItems).toHaveLength(1);
    expect(blueprint.activities.map((activity) => activity.phase)).toEqual([
      "gist",
      "practice",
      "retrieve",
      "transfer",
      "reflect",
    ]);
  });

  it("rejects activity evidence that is outside the server-hydrated catalog", () => {
    const blueprint = validLearningBlueprint();
    const forged = `seg_${"c".repeat(32)}`;
    const raw = structuredClone(blueprint);
    raw.activities[0].evidence[0].sourceSegmentIds = [forged];

    expect(() => lessonBlueprintV2Schema.parse(raw)).toThrow(
      /outside the catalog/i,
    );
  });

  it("rejects a sequence that reveals transfer before retrieval", () => {
    const blueprint = validLearningBlueprint();
    const raw = structuredClone(blueprint);
    [raw.activities[2], raw.activities[3]] = [
      raw.activities[3],
      raw.activities[2],
    ];

    expect(() => lessonBlueprintV2Schema.parse(raw)).toThrow(/phase order/i);
  });

  it("rejects an activity plan that overruns the learner time budget", () => {
    const blueprint = validLearningBlueprint();
    const raw = structuredClone(blueprint);
    raw.activities = raw.activities.map((activity) => ({
      ...activity,
      estimatedSeconds: 600,
    }));

    expect(() => lessonBlueprintV2Schema.parse(raw)).toThrow(/time budget/i);
  });

  it("keeps source quotes in a strict server-hydrated provenance type", () => {
    expect(() =>
      sourceEvidenceSchema.parse({
        origin: "transfer_example",
        segmentId: segA,
        startMs: 0,
        endMs: 1_000,
        text: "This is newly authored, not a source quote.",
      }),
    ).toThrow();
  });
});
