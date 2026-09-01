import { describe, expect, it } from "vitest";

import { deriveLearningReviewPlan } from "./derive-learning-review-plan";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

function blueprint(): LessonBlueprintV2 {
  return createGoldenSessionLearningBlueprint();
}

function firstItemKey(source: LessonBlueprintV2): string {
  return source.targetItems[0]!.itemKey;
}

describe("deriveLearningReviewPlan", () => {
  it("builds a review for an item the lesson actually taught", () => {
    // The resolver this replaces knew one hard-coded item, so every other item
    // a learner studied could be scheduled for review and then produce nothing
    // when its turn came.
    const source = blueprint();
    const plan = deriveLearningReviewPlan(source, firstItemKey(source));
    expect(plan).not.toBeNull();
    expect(plan!.itemKey).toBe(firstItemKey(source));
  });

  it("asks for the English from the meaning, never the other way round", () => {
    // Producing the form from memory is the half that decays fastest, and the
    // reason delayed review exists. Showing the phrase and asking for meaning
    // would test recognition instead.
    const source = blueprint();
    const item = source.targetItems[0]!;
    const plan = deriveLearningReviewPlan(source, item.itemKey)!;

    expect(plan.recall.promptVi).toContain(item.contextualMeaningVi);
    expect(plan.recall.promptVi).not.toContain(item.surfaceForm);
    expect(plan.recall.accepted).toContain(item.surfaceForm);
  });

  it("reuses the lesson's own changed-context scenario", () => {
    // A scenario and its success criteria are judgement, not data. Writing new
    // ones here would mean inventing them with nothing to ground them against.
    const source = blueprint();
    const item = source.targetItems[0]!;
    const transfer = source.activities.find(
      (activity) =>
        activity.activityType === "guided_transfer" &&
        activity.targetItemIds.includes(item.id),
    )!;
    if (transfer.activityType !== "guided_transfer") return;

    const plan = deriveLearningReviewPlan(source, item.itemKey)!;
    expect(plan.transfer.scenarioVi).toBe(transfer.scenarioVi);
    expect(plan.transfer.criteriaVi).toEqual(transfer.evaluation.criteriaVi);
  });

  it("always leaves something to self-check against", () => {
    // The exemplar is optional in a blueprint. A self-check with nothing to
    // compare against leaves the learner grading a blank.
    const source = blueprint();
    const plan = deriveLearningReviewPlan(source, firstItemKey(source))!;
    expect(plan.transfer.exemplarAfterAttempt.length).toBeGreaterThan(0);
  });

  it("refuses an item the lesson never taught", () => {
    // Fail closed. A review question nobody grounded is worse than no review,
    // because the learner cannot tell the difference.
    expect(deriveLearningReviewPlan(blueprint(), "never-taught")).toBeNull();
  });

  it("refuses an item with no changed-context activity behind it", () => {
    const source = blueprint();
    const withoutTransfer: LessonBlueprintV2 = {
      ...source,
      activities: source.activities.filter(
        (activity) => activity.activityType !== "guided_transfer",
      ),
    } as LessonBlueprintV2;

    expect(
      deriveLearningReviewPlan(withoutTransfer, firstItemKey(source)),
    ).toBeNull();
  });

  it("names the variant after the blueprint it came from", () => {
    // A republished lesson must not be mistaken for the variant the learner
    // already saw.
    const source = blueprint();
    const plan = deriveLearningReviewPlan(source, firstItemKey(source))!;
    expect(plan.variantId).toContain(source.blueprintId.slice(0, 8));
  });
});
