import { describe, expect, it } from "vitest";

import { createFixtureLearningRuntimePolicy } from "@/adapters/fake/fixture-learning-runtime-policy";
import {
  appendLearningAttempt,
  confirmLearningSelfCheck,
  createEmptyLearningActivityProgress,
  learningActivityCompletionState,
  openLearningSupportStep,
  recordLearningPlayback,
  requestLearningSelfCheckCorrection,
} from "@/modules/learning/application/learning-runtime-progress";
import { learningLabAttemptResponseSchema } from "@/shared/contracts/learning-lab";

function attempt(
  activityId: string,
  verdict: "correct" | "incorrect" | "self_check" | "unscored",
  idempotencyKey: string,
) {
  const evaluation =
    verdict === "self_check"
      ? {
          verdict,
          goalVi: "Use the language in a changed context.",
          evidenceVi: "Self-check after attempting.",
          nextStepVi: "Compare against criteria.",
          evidenceRefs: [],
          checkedCriteria: [],
          exemplarAfterAttempt: "I'm a member of the product team.",
        }
      : verdict === "unscored"
        ? {
            verdict,
            goalVi: "Reflect on the next review need.",
            evidenceVi: "Reflection is not an objective score.",
            nextStepVi: "Schedule a later review.",
            evidenceRefs: [],
          }
        : {
            verdict,
            goalVi: "Retrieve the target.",
            evidenceVi: verdict === "correct" ? "Correct." : "Not correct yet.",
            nextStepVi: "Try again.",
            evidenceRefs: [],
            reveal: { answer: "a member of" },
          };

  return learningLabAttemptResponseSchema.parse({
    activityId,
    idempotencyKey,
    evaluation,
    hydratedEvidence: [],
    ...(verdict === "self_check"
      ? {
          selfCheckCriteriaVi: [
            "Uses the complete target chunk",
            "Names a specific team",
          ],
        }
      : {}),
    postAttemptSupport: {
      targetItem: null,
      chunkBoundaryText: null,
    },
  });
}

function activityPolicy(activityId: string) {
  const found = createFixtureLearningRuntimePolicy().activityPolicies.find(
    (policy) => policy.activityId === activityId,
  );
  if (!found) throw new Error(`Missing fixture policy: ${activityId}`);
  return found;
}

describe("learning runtime progress", () => {
  it("does not allow an incorrect closed task to continue before a retry", () => {
    const policy = activityPolicy("activity_recall");
    let progress = createEmptyLearningActivityProgress();
    progress = appendLearningAttempt(
      progress,
      attempt(
        "activity_recall",
        "incorrect",
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ),
    );

    expect(learningActivityCompletionState(policy, progress)).toMatchObject({
      canContinue: false,
      blockers: expect.arrayContaining(["RETRY_REQUIRED"]),
    });

    progress = appendLearningAttempt(
      progress,
      attempt(
        "activity_recall",
        "correct",
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      ),
    );
    expect(learningActivityCompletionState(policy, progress)).toMatchObject({
      canContinue: true,
      assistedCompletion: false,
    });
  });

  it("records replay only after the learner plays the source again", () => {
    const policy = activityPolicy("activity_gist");
    let progress = createEmptyLearningActivityProgress();

    progress = recordLearningPlayback(progress, policy);
    expect(progress.playCount).toBe(1);
    expect(progress.openedSupportSteps).not.toContain("replay");

    progress = recordLearningPlayback(progress, policy);
    expect(progress.playCount).toBe(2);
    expect(progress.openedSupportSteps).toContain("replay");
  });

  it("keeps support usage ordered and idempotent in runtime state", () => {
    let progress = createEmptyLearningActivityProgress();
    progress = openLearningSupportStep(progress, "context_hint");
    progress = openLearningSupportStep(progress, "context_hint");
    progress = openLearningSupportStep(progress, "keyword_hint");

    expect(progress.openedSupportSteps).toEqual([
      "context_hint",
      "keyword_hint",
    ]);
  });

  it("blocks transfer until the learner confirms every self-check criterion", () => {
    const policy = activityPolicy("activity_transfer");
    let progress = createEmptyLearningActivityProgress();
    progress = appendLearningAttempt(
      progress,
      attempt(
        "activity_transfer",
        "self_check",
        "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      ),
    );

    expect(learningActivityCompletionState(policy, progress)).toMatchObject({
      canContinue: false,
      blockers: expect.arrayContaining(["SELF_CHECK_REQUIRED"]),
    });

    progress = confirmLearningSelfCheck(progress);
    expect(learningActivityCompletionState(policy, progress)).toMatchObject({
      canContinue: true,
    });
  });

  it("requires a full transfer retry after the learner requests correction", () => {
    const policy = activityPolicy("activity_transfer");
    let progress = createEmptyLearningActivityProgress();
    progress = appendLearningAttempt(
      progress,
      attempt(
        "activity_transfer",
        "self_check",
        "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      ),
    );
    progress = requestLearningSelfCheckCorrection(progress);

    expect(learningActivityCompletionState(policy, progress)).toMatchObject({
      canContinue: false,
      blockers: expect.arrayContaining(["RETRY_REQUIRED"]),
    });

    progress = appendLearningAttempt(
      progress,
      attempt(
        "activity_transfer",
        "self_check",
        "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      ),
    );
    progress = confirmLearningSelfCheck(progress);
    expect(learningActivityCompletionState(policy, progress)).toMatchObject({
      canContinue: true,
    });
  });
});
