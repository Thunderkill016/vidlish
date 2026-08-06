import { evaluateLearningActivity } from "@/modules/learning/application/evaluate-learning-activity";
import type { LearningSessionRepository } from "@/modules/learning/ports/learning-session-repository";
import type {
  ActivityResponse,
  LessonBlueprintV2,
} from "@/shared/contracts/lesson-v2";
import { createPrivacySafeActivityResponse } from "@/shared/contracts/privacy-safe-learning-evidence";

export class LearningSessionProgressError extends Error {
  readonly name = "LearningSessionProgressError";
}

export class SubmitLearningActivityAttempt {
  constructor(private readonly repository: LearningSessionRepository) {}

  async execute(input: {
    ownerUserId: string;
    sessionId: string;
    blueprint: LessonBlueprintV2;
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
    const complete = !nextActivity;

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
      nextPhase: nextActivity?.phase ?? "completed",
      nextActivityId: nextActivity?.id ?? activity.id,
      complete,
    });
  }
}
