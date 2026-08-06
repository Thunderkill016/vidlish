import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import {
  evaluateLearningActivity,
  LearningActivityEvaluationError,
} from "@/modules/learning/application/evaluate-learning-activity";

function activity(type: string) {
  const found = createFixtureLearningBlueprint().activities.find(
    (candidate) => candidate.activityType === type,
  );
  if (!found) throw new Error(`Missing fixture activity: ${type}`);
  return found;
}

describe("evaluateLearningActivity", () => {
  it("scores a closed gist task from the published answer contract", () => {
    const result = evaluateLearningActivity(activity("gist_choice"), {
      kind: "choice",
      optionId: "option_embedded_player",
    });

    expect(result.verdict).toBe("correct");
    expect(result.evidenceRefs).toHaveLength(1);
    if (result.verdict === "correct") {
      expect(result.reveal?.answer).toMatch(/tùy chỉnh trình phát youtube/i);
    }
  });

  it("returns evidence-specific next-step feedback for a wrong answer", () => {
    const result = evaluateLearningActivity(activity("meaning_in_context"), {
      kind: "choice",
      optionId: "option_location",
    });

    expect(result.verdict).toBe("incorrect");
    expect(result.evidenceVi).toMatch(/không phải địa điểm/i);
    expect(result.nextStepVi).toMatch(/giải thích/i);
  });

  it("normalizes harmless punctuation and casing for bounded recall", () => {
    const result = evaluateLearningActivity(activity("chunk_recall"), {
      kind: "text",
      text: "  A MEMBER OF! ",
    });

    expect(result.verdict).toBe("correct");
    if (result.verdict === "correct") {
      expect(result.reveal?.answer).toBe("a member of");
    }
  });

  it("does not fake-grade an open transfer response", () => {
    const result = evaluateLearningActivity(activity("guided_transfer"), {
      kind: "self_check",
      text: "I'm a member of the release team.",
      checkedCriteria: [0, 1, 2],
    });

    expect(result.verdict).toBe("self_check");
    expect(result).not.toHaveProperty("isCorrect");
    if (result.verdict === "self_check") {
      expect(result.checkedCriteria).toEqual([0, 1, 2]);
      expect(result.exemplarAfterAttempt).toMatch(/product design team/i);
    }
  });

  it("rejects a response shape that does not match the activity", () => {
    expect(() =>
      evaluateLearningActivity(activity("gist_choice"), {
        kind: "text",
        text: "I think it is about an embedded player.",
      }),
    ).toThrow(LearningActivityEvaluationError);
  });

  it("treats reflection as self-report, not objective competence", () => {
    const result = evaluateLearningActivity(activity("exit_ticket"), {
      kind: "reflection",
      text: "Tôi cần luyện nhớ lại cụm thêm.",
    });

    expect(result.verdict).toBe("unscored");
    expect(result.evidenceVi).toMatch(/không phải điểm năng lực/i);
  });
});
