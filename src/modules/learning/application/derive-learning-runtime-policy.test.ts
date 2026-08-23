import { describe, expect, it } from "vitest";

import { deriveLearningRuntimePolicy } from "./derive-learning-runtime-policy";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { validateLearningRuntimePolicyAgainstBlueprint } from "@/shared/contracts/learning-policy-v2";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

describe("deriveLearningRuntimePolicy", () => {
  it("produces a policy the runtime accepts for any blueprint", () => {
    // The hand-written fixture policy is pinned to one blueprintId, so every
    // generated lesson would otherwise have no rules to run under.
    for (const blueprint of [
      createFixtureLearningBlueprint(),
      createGoldenSessionLearningBlueprint(),
    ]) {
      const policy = deriveLearningRuntimePolicy(blueprint);
      expect(
        validateLearningRuntimePolicyAgainstBlueprint(policy, blueprint),
      ).toEqual([]);
    }
  });

  it("keeps the first listening attempt caption-free", () => {
    // This is the only moment in a lesson that measures listening rather than
    // reading, and it does not come back.
    const blueprint = createGoldenSessionLearningBlueprint();
    const policy = deriveLearningRuntimePolicy(blueprint);
    const gist = blueprint.activities.find(
      (activity) => activity.activityType === "gist_choice",
    );
    if (!gist) return;

    const gistPolicy = policy.activityPolicies.find(
      (entry) => entry.activityId === gist.id,
    )!;
    expect(gistPolicy.support?.minimumAttemptsBeforeFullReveal).toBeGreaterThan(0);
    expect(gistPolicy.support?.steps[0]).toBe("replay");
  });

  it("treats shown passage reading as capability work with no listening support ladder", () => {
    const blueprint = createFixtureLearningBlueprint();
    const gist = blueprint.activities.find(
      (activity) => activity.activityType === "gist_choice",
    );
    expect(gist?.activityType).toBe("gist_choice");
    if (!gist || gist.activityType !== "gist_choice") return;

    const reading = {
      ...gist,
      id: "activity_passage_reading",
      evidence: gist.evidence.map((range) => ({
        ...range,
        captionPolicy: "shown" as const,
      })),
    };
    const withReading = {
      ...blueprint,
      activities: [gist, reading, ...blueprint.activities.slice(1)],
    } as LessonBlueprintV2;
    const policy = deriveLearningRuntimePolicy(withReading);
    const readingPolicy = policy.activityPolicies.find(
      (entry) => entry.activityId === reading.id,
    );

    expect(readingPolicy?.taskScope).toBe("capability");
    expect(readingPolicy?.support).toBeNull();
    expect(readingPolicy?.retry.requiredAfterCorrection).toBe(true);
  });

  it("never offers a translation on a gist question", () => {
    // Handing over the Vietnamese meaning ends a gist task outright.
    const blueprint = createGoldenSessionLearningBlueprint();
    const policy = deriveLearningRuntimePolicy(blueprint);
    for (const activity of blueprint.activities) {
      if (activity.activityType !== "gist_choice") continue;
      const entry = policy.activityPolicies.find(
        (candidate) => candidate.activityId === activity.id,
      )!;
      expect(entry.support?.steps).not.toContain("vietnamese_meaning");
    }
  });

  it("requires a full retry after a corrected transfer task", () => {
    // Patching one phrase of a changed-context task is not doing it again.
    const blueprint = createGoldenSessionLearningBlueprint();
    const policy = deriveLearningRuntimePolicy(blueprint);
    for (const activity of blueprint.activities) {
      if (activity.activityType !== "guided_transfer") continue;
      const entry = policy.activityPolicies.find(
        (candidate) => candidate.activityId === activity.id,
      )!;
      expect(entry.taskScope).toBe("capability");
      expect(entry.retry.retryScope).toBe("full_task");
      expect(entry.transfer?.unseenInput).toBe(true);
    }
  });

  it("belongs to the blueprint it was derived from", () => {
    const blueprint = createGoldenSessionLearningBlueprint();
    expect(deriveLearningRuntimePolicy(blueprint).blueprintId).toBe(
      blueprint.blueprintId,
    );
  });
});
