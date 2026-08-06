import { describe, expect, it } from "vitest";

import {
  evaluateLearningActivity,
  LearningActivityEvaluationError,
} from "@/modules/learning/application/evaluate-learning-activity";
import { validLearningBlueprint } from "@/shared/contracts/lesson-v2.test";

function activity(type: string) {
  const found = validLearningBlueprint().activities.find(
    (candidate) => candidate.activityType === type,
  );
  if (!found) throw new Error(`Missing fixture activity: ${type}`);
  return found;
}

describe("evaluateLearningActivity", () => {
  it("scores a closed gist task from the published answer contract", () => {
    const result = evaluateLearningActivity(activity("gist_choice"), {
      kind: "choice",
      optionId: "option_whole_message",
    });

    expect(result.verdict).toBe("correct");
    expect(result.evidenceRefs).toHaveLength(1);
    expect(result.reveal?.answer).toMatch(/toàn bộ thông điệp/i);
  });

  it("returns evidence-specific next-step feedback for a wrong answer", () => {
    const result = evaluateLearningActivity(activity("meaning_in_context"), {
      kind: "choice",
      optionId: "option_translate",
    });

    expect(result.verdict).toBe("incorrect");
    expect(result.evidenceVi).toMatch(/không nói.*dịch hết/i);
    expect(result.nextStepVi).toMatch(/giải thích/i);
  });

  it("normalizes harmless punctuation and casing for bounded recall", () => {
    const result = evaluateLearningActivity(activity("chunk_recall"), {
      kind: "text",
      text: "  Pay ATTENTION to! ",
    });

    expect(result.verdict).toBe("correct");
    expect(result.reveal?.answer).toBe("pay attention to");
  });

  it("does not fake-grade an open transfer response", () => {
    const result = evaluateLearningActivity(activity("guided_transfer"), {
      kind: "self_check",
      text: "Pay attention to the order of the ingredients.",
      checkedCriteria: [0, 1, 2],
    });

    expect(result.verdict).toBe("self_check");
    expect(result).not.toHaveProperty("isCorrect");
    if (result.verdict === "self_check") {
      expect(result.checkedCriteria).toEqual([0, 1, 2]);
      expect(result.exemplarAfterAttempt).toMatch(/order of the steps/i);
    }
  });

  it("rejects a response shape that does not match the activity", () => {
    expect(() =>
      evaluateLearningActivity(activity("gist_choice"), {
        kind: "text",
        text: "I think it is about the whole message.",
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
