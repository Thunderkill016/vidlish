import {
  latestLearningAttempt,
  type LearningActivityRuntimeProgress,
} from "./learning-runtime-progress";

/**
 * Only what the summary reads. Stated structurally so this works on the learner
 * view as well as the full blueprint — the learner view strips reveal content,
 * and the closing screen must never need a field a learner may not see.
 */
export type SummarisableLesson = {
  activities: readonly {
    id: string;
    activityType: string;
    evidence: readonly unknown[];
  }[];
};

/**
 * What the end of a session may honestly say about it.
 *
 * VLR-104 asks the closing screen to show the learner what changed between the
 * first listen and the last one, and to stop short of calling that mastery.
 *
 * It is also where a fixture dependency survived: the screen read
 * `progressByActivity.activity_recall` and `.activity_transfer` by name, which
 * only exist in the demo lesson. On a learner's own lesson both were always
 * undefined, so it told every learner they had not recalled the item and had
 * not met the transfer criteria — regardless of what they had just done.
 */

export type ListeningEncounter = {
  activityId: string;
  plays: number;
  supportSteps: number;
};

export type LearningSessionSummary = {
  totalAttempts: number;
  totalSupportSteps: number;
  /** `null` when the lesson has no such activity, which is not the same as failing it. */
  recalledUnaided: boolean | null;
  transferSelfChecked: boolean | null;
  firstListen: ListeningEncounter | null;
  finalListen: ListeningEncounter | null;
  /**
   * Support steps at the final listen minus the first, negative meaning less
   * help was needed. `null` when there is only one listening encounter to
   * compare, because a difference of nothing is not a difference.
   */
  supportDelta: number | null;
};

function encounter(
  activityId: string,
  progress: LearningActivityRuntimeProgress | undefined,
): ListeningEncounter {
  return {
    activityId,
    plays: progress?.playCount ?? 0,
    supportSteps: progress?.openedSupportSteps.length ?? 0,
  };
}

export function summariseLearningSession(
  blueprint: SummarisableLesson,
  progressByActivity: Record<string, LearningActivityRuntimeProgress>,
): LearningSessionSummary {
  const progresses = Object.values(progressByActivity);
  const totalAttempts = progresses.reduce(
    (sum, progress) => sum + progress.attempts.length,
    0,
  );
  const totalSupportSteps = progresses.reduce(
    (sum, progress) => sum + progress.openedSupportSteps.length,
    0,
  );

  // Found by what the activity is, not by what the demo lesson happened to call
  // it. Every id here belongs to the lesson in front of this learner.
  const recall = blueprint.activities.find(
    (activity) => activity.activityType === "chunk_recall",
  );
  const transfer = blueprint.activities.find(
    (activity) => activity.activityType === "guided_transfer",
  );

  const listening = blueprint.activities.filter(
    (activity) => activity.evidence.length > 0,
  );
  const first = listening[0];
  const last = listening.length > 1 ? listening[listening.length - 1] : undefined;

  const firstListen = first ? encounter(first.id, progressByActivity[first.id]) : null;
  const finalListen = last ? encounter(last.id, progressByActivity[last.id]) : null;

  const recallProgress = recall ? progressByActivity[recall.id] : undefined;
  const recallAttempt = recallProgress
    ? latestLearningAttempt(recallProgress)
    : undefined;

  return {
    totalAttempts,
    totalSupportSteps,
    // `null` rather than `false` when the lesson has no recall activity or the
    // learner never reached it: "did not recall it" is a claim about them, and
    // an absent activity is not evidence for it.
    recalledUnaided: recall ? (recallAttempt
      ? recallAttempt.evaluation.verdict === "correct"
      : null) : null,
    transferSelfChecked: transfer
      ? (progressByActivity[transfer.id]?.attempts.length
        ? Boolean(progressByActivity[transfer.id]?.selfCheckConfirmed)
        : null)
      : null,
    firstListen,
    finalListen,
    supportDelta:
      firstListen && finalListen
        ? finalListen.supportSteps - firstListen.supportSteps
        : null,
  };
}
