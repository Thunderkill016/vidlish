import type { LearningLabAttemptResponse } from "@/shared/contracts/learning-lab";
import {
  activityCompletionBlockers,
  type ActivityCompletionBlocker,
  type ActivityLearningPolicy,
  type ActivityProgressEvidence,
  type SupportStep,
} from "@/shared/contracts/learning-policy-v2";

export type LearningActivityRuntimeProgress = {
  attempts: LearningLabAttemptResponse[];
  openedSupportSteps: SupportStep[];
  playCount: number;
  selfCheckConfirmed: boolean;
  selfCheckCorrectionRequested: boolean;
};

export type LearningRuntimeCompletionBlocker =
  | ActivityCompletionBlocker
  | "SELF_CHECK_REQUIRED";

export type LearningActivityCompletionState = {
  blockers: LearningRuntimeCompletionBlocker[];
  canContinue: boolean;
  assistedCompletion: boolean;
};

export function createEmptyLearningActivityProgress(): LearningActivityRuntimeProgress {
  return {
    attempts: [],
    openedSupportSteps: [],
    playCount: 0,
    selfCheckConfirmed: false,
    selfCheckCorrectionRequested: false,
  };
}

export function latestLearningAttempt(
  progress: LearningActivityRuntimeProgress,
): LearningLabAttemptResponse | undefined {
  return progress.attempts.at(-1);
}

export function appendLearningAttempt(
  progress: LearningActivityRuntimeProgress,
  attempt: LearningLabAttemptResponse,
): LearningActivityRuntimeProgress {
  if (
    progress.attempts.some(
      (candidate) => candidate.idempotencyKey === attempt.idempotencyKey,
    )
  ) {
    return progress;
  }

  return {
    ...progress,
    attempts: [...progress.attempts, attempt],
    selfCheckConfirmed: false,
  };
}

export function openLearningSupportStep(
  progress: LearningActivityRuntimeProgress,
  step: SupportStep,
): LearningActivityRuntimeProgress {
  if (progress.openedSupportSteps.includes(step)) return progress;
  return {
    ...progress,
    openedSupportSteps: [...progress.openedSupportSteps, step],
  };
}

export function recordLearningPlayback(
  progress: LearningActivityRuntimeProgress,
  policy: ActivityLearningPolicy,
): LearningActivityRuntimeProgress {
  const playCount = progress.playCount + 1;
  const shouldRecordReplay =
    playCount >= 2 && policy.support?.steps.includes("replay");

  return {
    ...progress,
    playCount,
    openedSupportSteps:
      shouldRecordReplay && !progress.openedSupportSteps.includes("replay")
        ? [...progress.openedSupportSteps, "replay"]
        : progress.openedSupportSteps,
  };
}

export function confirmLearningSelfCheck(
  progress: LearningActivityRuntimeProgress,
): LearningActivityRuntimeProgress {
  return { ...progress, selfCheckConfirmed: true };
}

export function requestLearningSelfCheckCorrection(
  progress: LearningActivityRuntimeProgress,
): LearningActivityRuntimeProgress {
  return {
    ...progress,
    selfCheckConfirmed: false,
    selfCheckCorrectionRequested: true,
  };
}

export function learningActivityProgressEvidence(
  progress: LearningActivityRuntimeProgress,
): ActivityProgressEvidence {
  const incorrectAttempts = progress.attempts.filter(
    (attempt) => attempt.evaluation.verdict === "incorrect",
  ).length;
  const correctionCount =
    incorrectAttempts + (progress.selfCheckCorrectionRequested ? 1 : 0);

  return {
    attemptCount: progress.attempts.length,
    correctionCount,
    retryAttemptCount:
      correctionCount > 0 ? Math.max(0, progress.attempts.length - 1) : 0,
    transferAttempted: progress.attempts.some(
      (attempt) => attempt.evaluation.verdict === "self_check",
    ),
  };
}

export function learningActivityCompletionState(
  policy: ActivityLearningPolicy,
  progress: LearningActivityRuntimeProgress,
): LearningActivityCompletionState {
  const evidence = learningActivityProgressEvidence(progress);
  const blockers: LearningRuntimeCompletionBlocker[] = [
    ...activityCompletionBlockers(policy, evidence),
  ];
  const latest = latestLearningAttempt(progress);
  const attemptLimitReached =
    evidence.attemptCount >= policy.retry.maxAttemptsPerSession;
  const assistedCompletion =
    attemptLimitReached && latest?.evaluation.verdict === "incorrect";

  if (
    latest?.evaluation.verdict === "incorrect" &&
    !attemptLimitReached &&
    !blockers.includes("RETRY_REQUIRED")
  ) {
    blockers.push("RETRY_REQUIRED");
  }

  if (
    latest?.evaluation.verdict === "self_check" &&
    !progress.selfCheckConfirmed
  ) {
    blockers.push("SELF_CHECK_REQUIRED");
  }

  return {
    blockers,
    canContinue: blockers.length === 0,
    assistedCompletion,
  };
}

export function highestOpenedSupportStep(
  policy: ActivityLearningPolicy,
  progress: LearningActivityRuntimeProgress,
): SupportStep | null {
  if (!policy.support) return null;
  const opened = new Set(progress.openedSupportSteps);
  return (
    [...policy.support.steps].reverse().find((step) => opened.has(step)) ?? null
  );
}
