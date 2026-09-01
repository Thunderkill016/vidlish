import { evaluateLearningActivity } from "@/modules/learning/application/evaluate-learning-activity";
import { isAssistedCompletion } from "@/modules/learning/application/learning-runtime-progress";
import type { LearningSessionRepository } from "@/modules/learning/ports/learning-session-repository";
import type { LearningRuntimePolicyV2 } from "@/shared/contracts/learning-policy-v2";
import type {
  ActivityResponse,
  LessonBlueprintV2,
} from "@/shared/contracts/lesson-v2";
import { createPrivacySafeActivityResponse } from "@/shared/contracts/privacy-safe-learning-evidence";

export class LearningSessionProgressError extends Error {
  readonly name = "LearningSessionProgressError";
}

function canAdvanceAfterAttempt(input: {
  activity: LessonBlueprintV2["activities"][number];
  response: ActivityResponse;
  verdict: "correct" | "incorrect" | "self_check" | "unscored";
}): boolean {
  if (input.verdict === "correct" || input.verdict === "unscored") {
    return true;
  }
  if (
    input.verdict === "self_check" &&
    input.activity.activityType === "guided_transfer" &&
    input.response.kind === "self_check"
  ) {
    const requiredCriteria = input.activity.evaluation.criteriaVi.length;
    return (
      requiredCriteria > 0 &&
      new Set(input.response.checkedCriteria).size === requiredCriteria &&
      input.response.checkedCriteria.every(
        (criterion) => criterion >= 0 && criterion < requiredCriteria,
      )
    );
  }
  return false;
}

export class SubmitLearningActivityAttempt {
  constructor(private readonly repository: LearningSessionRepository) {}

  async execute(input: {
    ownerUserId: string;
    sessionId: string;
    blueprint: LessonBlueprintV2;
    /** The lesson's own rules, so the limit matches the one shown to the learner. */
    policy: LearningRuntimePolicyV2;
    activityId: string;
    idempotencyKey: string;
    response: ActivityResponse;
  }) {
    const session = await this.repository.findOwnedSession(
      input.sessionId,
      input.ownerUserId,
    );
    if (!session) {
      throw new LearningSessionProgressError("Learning session was not found.");
    }

    const activityIndex = input.blueprint.activities.findIndex(
      (activity) => activity.id === input.activityId,
    );
    const activity = input.blueprint.activities[activityIndex];
    if (!activity) {
      throw new LearningSessionProgressError(
        "Activity does not belong to this lesson blueprint.",
      );
    }

    const evaluation = evaluateLearningActivity(activity, input.response);
    const responseEvidence = createPrivacySafeActivityResponse(input.response);
    const nextActivity = input.blueprint.activities[activityIndex + 1];
    const canAdvance = canAdvanceAfterAttempt({
      activity,
      response: input.response,
      verdict: evaluation.verdict,
    });
    // VLR-005. The browser offers Continue once attempts run out on a wrong
    // answer; the server used to refuse, leaving the learner stuck on a screen
    // that told them they could move on. Same rule, one function.
    const activityPolicy = input.policy.activityPolicies.find(
      (entry) => entry.activityId === activity.id,
    );
    const priorAttempts = await this.repository.countActivityAttempts({
      ownerUserId: input.ownerUserId,
      sessionId: input.sessionId,
      activityId: activity.id,
    });
    const assisted = activityPolicy
      ? isAssistedCompletion({
          attemptCount: priorAttempts + 1,
          latestVerdict: evaluation.verdict,
          maxAttemptsPerSession: activityPolicy.retry.maxAttemptsPerSession,
        })
      : false;

    // Advancing is not mastery. Every wrong answer and every attempt spent is
    // still persisted, and capability evidence is read from those.
    const advance = canAdvance || assisted;
    const complete = advance && !nextActivity;

    // The repository resolves an owned idempotency key before checking the
    // current activity. A network retry may arrive after the first request has
    // already advanced the session and must still return the original attempt.
    return this.repository.recordAttempt({
      ownerUserId: input.ownerUserId,
      sessionId: input.sessionId,
      activityId: activity.id,
      idempotencyKey: input.idempotencyKey,
      responseEvidence,
      evaluation,
      nextPhase: advance ? (nextActivity?.phase ?? "completed") : activity.phase,
      nextActivityId: advance ? (nextActivity?.id ?? activity.id) : activity.id,
      complete,
      reviewItemKeys: complete
        ? [...new Set(input.blueprint.targetItems.map((item) => item.itemKey))]
        : [],
    });
  }
}