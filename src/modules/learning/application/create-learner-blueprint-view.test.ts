import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";

describe("createLearnerBlueprintView", () => {
  it("removes every authoritative answer and reveal field", () => {
    const view = createLearnerBlueprintView(createFixtureLearningBlueprint());
    const serialized = JSON.stringify(view);

    expect(serialized).not.toContain("correctOptionId");
    expect(serialized).not.toContain("normalized_text_set");
    expect(serialized).not.toContain("accepted");
    expect(serialized).not.toContain("exemplarAfterAttempt");
    expect(serialized).not.toContain("criteriaVi");
    expect(serialized).not.toContain('"reveal"');
    expect(serialized).not.toContain('"feedback"');
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
});
