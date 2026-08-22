import type { LearningActivityDurableProgress } from "@/modules/learning/ports/learning-session-repository";
import type { LessonBlueprintV2, LessonSession } from "@/shared/contracts/lesson-v2";
import {
  learningMeasurementSummarySchema,
  type LearningMeasurementSummary,
} from "@/shared/contracts/learning-measurement";
import type { PrivacySafeLearningProductEvent } from "@/shared/contracts/learning-product-events";
import type { PrivacySafeActivityAttempt } from "@/shared/contracts/privacy-safe-learning-evidence";

type MeasurementEvidence = {
  session: LessonSession;
  attempts: readonly PrivacySafeActivityAttempt[];
  progress: readonly LearningActivityDurableProgress[];
  productEvents: readonly PrivacySafeLearningProductEvent[];
};

function attemptsFor(
  attempts: readonly PrivacySafeActivityAttempt[],
  activityId: string | null,
) {
  if (!activityId) return [];
  return attempts
    .filter((attempt) => attempt.activityId === activityId)
    .sort((left, right) => left.attemptNumber - right.attemptNumber);
}

function attemptMetric(
  attempts: readonly PrivacySafeActivityAttempt[],
  activityId: string | null,
) {
  const matching = attemptsFor(attempts, activityId);
  return {
    activityId,
    attemptCount: matching.length,
    latestVerdict: matching.at(-1)?.evaluation.verdict ?? null,
    correctCount: matching.filter(
      (attempt) => attempt.evaluation.verdict === "correct",
    ).length,
  };
}

export function summariseLearningProductMeasurement(
  blueprint: LessonBlueprintV2,
  evidence: MeasurementEvidence,
): LearningMeasurementSummary {
  const firstSourceActivity =
    blueprint.activities.find((activity) => activity.evidence.length > 0) ?? null;
  const noticeActivity =
    blueprint.activities.find(
      (activity) => activity.activityType === "meaning_in_context",
    ) ?? null;
  const retrievalActivity =
    blueprint.activities.find(
      (activity) => activity.activityType === "chunk_recall",
    ) ?? null;
  const transferActivity =
    blueprint.activities.find(
      (activity) => activity.activityType === "guided_transfer",
    ) ?? null;
  const afterListenActivity =
    blueprint.activities.find(
      (activity) => activity.activityType === "exit_ticket",
    ) ?? null;

  const firstSourceProgress = firstSourceActivity
    ? evidence.progress.find(
        (progress) => progress.activityId === firstSourceActivity.id,
      )
    : undefined;
  const incorrectAttemptCount = evidence.attempts.filter(
    (attempt) => attempt.evaluation.verdict === "incorrect",
  ).length;
  const correctionShownCount = evidence.productEvents.filter(
    (event) => event.eventKind === "correction_shown",
  ).length;
  const runtimeErrors = evidence.productEvents.flatMap((event) =>
    event.eventKind === "runtime_error" && event.detailKind
      ? [event.detailKind]
      : [],
  );
  const completed = evidence.session.status === "completed";
  const sessionViewed = evidence.session.startedAt !== null;

  return learningMeasurementSummarySchema.parse({
    sessionId: evidence.session.id,
    status: evidence.session.status,
    sessionViewed,
    completed,
    lastKnownActivityId: evidence.session.currentActivityId,
    incompleteAtLastKnownActivity:
      sessionViewed && !completed ? evidence.session.currentActivityId : null,
    firstSource: {
      activityId: firstSourceActivity?.id ?? null,
      playStarted: (firstSourceProgress?.playbackCount ?? 0) >= 1,
      playCompleted: Boolean(
        firstSourceActivity &&
          evidence.productEvents.some(
            (event) =>
              event.activityId === firstSourceActivity.id &&
              event.eventKind === "source_play_completed",
          ),
      ),
      replayed: (firstSourceProgress?.playbackCount ?? 0) >= 2,
    },
    targetNotice: {
      activityId: noticeActivity?.id ?? null,
      attempted: attemptsFor(
        evidence.attempts,
        noticeActivity?.id ?? null,
      ).length > 0,
    },
    correction: {
      incorrectAttemptCount,
      shownCount: correctionShownCount,
    },
    retrieval: attemptMetric(
      evidence.attempts,
      retrievalActivity?.id ?? null,
    ),
    transfer: attemptMetric(evidence.attempts, transferActivity?.id ?? null),
    afterListen: attemptMetric(
      evidence.attempts,
      afterListenActivity?.id ?? null,
    ),
    totalSupportStepsOpened: evidence.progress.reduce(
      (total, activity) => total + activity.openedSupportSteps.length,
      0,
    ),
    runtimeErrors,
  });
}
