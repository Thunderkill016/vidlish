import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

describe("createLearnerBlueprintView", () => {
  it("removes every authoritative answer, reveal and target-explanation field", () => {
    const view = createLearnerBlueprintView(createFixtureLearningBlueprint());
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain("correctOptionId");
    expect(serialized).not.toContain("normalized_text_set");
    expect(serialized).not.toContain("accepted");
    expect(serialized).not.toContain("exemplarAfterAttempt");
    expect(serialized).not.toContain("criteriaVi");
    expect(serialized).not.toContain('"reveal"');
    expect(serialized).not.toContain('"feedback"');
    expect(serialized).not.toContain("contextualMeaningVi");
    expect(serialized).not.toContain("communicativeFunctionVi");
    expect(serialized).not.toContain("pronunciationNoteVi");
    expect(view.targetItems).toEqual([
      { id: "item_member_of", itemKey: "a-member-of" },
    ]);
  });

  it("keeps learner-facing prompts, options and grounded ranges", () => {
    const view = createLearnerBlueprintView(createFixtureLearningBlueprint());
    const gist = view.activities[0];

    expect(gist.activityType).toBe("gist_choice");
    if (gist.activityType === "gist_choice") {
      expect(gist.options).toHaveLength(3);
      expect(gist.evidence[0].sourceSegmentIds[0]).toMatch(/^seg_/);
    }
  });

  it("injects canonical source text only into the lexical reading prompt", () => {
    const blueprint = createFixtureLearningBlueprint();
    const view = createLearnerBlueprintView(blueprint);
    const sourceText = "I'm a member of the Developer Relations team.";
    const gist = view.activities.find(
      (activity) => activity.activityType === "gist_choice",
    );
    const meaning = view.activities.find(
      (activity) => activity.activityType === "meaning_in_context",
    );

    expect(gist?.promptVi).not.toContain(sourceText);
    expect(meaning?.promptVi).toContain(`“${sourceText}”`);
    expect(meaning?.promptVi).toContain(
      "Trong đoạn này, a member of dùng để làm gì?",
    );
    // The catalog itself stays server-side; only the exact reading stimulus is
    // projected into this one learner activity.
    expect("evidenceCatalog" in view).toBe(false);
  });

  it("shows canonical passage text before a shown gist but never before hidden-first listening", () => {
    const blueprint = createFixtureLearningBlueprint();
    const hidden = blueprint.activities.find(
      (activity) => activity.activityType === "gist_choice",
    );
    expect(hidden?.activityType).toBe("gist_choice");
    if (!hidden || hidden.activityType !== "gist_choice") return;

    const passage = {
      ...hidden,
      id: "activity_passage_reading",
      evidence: hidden.evidence.map((range) => ({
        ...range,
        captionPolicy: "shown" as const,
      })),
      promptVi: "Theo đoạn đọc, ý chính phù hợp nhất là gì?",
    };
    const withPassage = {
      ...blueprint,
      activities: [hidden, passage, ...blueprint.activities.slice(1)],
    } as LessonBlueprintV2;
    const view = createLearnerBlueprintView(withPassage);
    const sourceText = "I'm a member of the Developer Relations team.";
    const listeningView = view.activities[0];
    const readingView = view.activities[1];

    expect(listeningView?.promptVi).not.toContain(sourceText);
    expect(readingView?.activityType).toBe("gist_choice");
    expect(readingView?.promptVi).toContain(sourceText);
    expect(readingView?.promptVi).toContain(
      "Theo đoạn đọc, ý chính phù hợp nhất là gì?",
    );
  });
});
