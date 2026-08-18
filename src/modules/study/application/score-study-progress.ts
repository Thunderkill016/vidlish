import type { LessonDraft } from "@/shared/contracts/lesson";
import type {
  StudyProgressState,
  StudyProgressSummary,
} from "@/shared/contracts/study";

export type StudyScore = {
  /** Comprehension questions plus cloze items. */
  totalActivities: number;
  answeredActivities: number;
  correctActivities: number;
  vocabularyTotal: number;
  masteredVocabularyCount: number;
  /** 0–100, over activities and vocabulary together. */
  percent: number;
  /** Every activity answered and every word reviewed. */
  isFinished: boolean;
};

/**
 * Scores a learner's progress against the lesson it belongs to.
 *
 * Answers are addressed by position, so anything pointing past the end of the
 * draft — an old payload, a hand-written request — is ignored rather than
 * counted. A revealed cloze answer is progress, not a correct answer.
 */
export function scoreStudyProgress(
  draft: LessonDraft,
  state: StudyProgressState,
): StudyScore {
  const questions = draft.comprehensionQuestions;
  const clozeItems = draft.clozeItems;

  const answers = state.comprehensionAnswers.filter(
    (answer) => answer.index < questions.length,
  );
  const attempts = state.clozeAttempts.filter(
    (attempt) => attempt.index < clozeItems.length,
  );
  const mastered = state.masteredVocabulary.filter(
    (index) => index < draft.vocabulary.length,
  );

  const correctAnswers = answers.filter(
    (answer) => questions[answer.index]!.correctIndex === answer.selectedIndex,
  ).length;
  const solvedCloze = attempts.filter((attempt) => attempt.solved).length;

  const totalActivities = questions.length + clozeItems.length;
  const answeredActivities = answers.length + attempts.length;
  const correctActivities = correctAnswers + solvedCloze;
  const vocabularyTotal = draft.vocabulary.length;

  const totalSteps = totalActivities + vocabularyTotal;
  const doneSteps = answeredActivities + mastered.length;

  return {
    totalActivities,
    answeredActivities,
    correctActivities,
    vocabularyTotal,
    masteredVocabularyCount: mastered.length,
    percent: totalSteps === 0 ? 0 : Math.round((doneSteps / totalSteps) * 100),
    isFinished: totalSteps > 0 && doneSteps >= totalSteps,
  };
}

/**
 * The library card view. It never claims a score, because a shelf listing does
 * not hold the lesson drafts needed to know which answers were right — only how
 * much of the lesson the learner has worked through.
 */
export function summarizeStudyProgress(
  jobId: string,
  state: StudyProgressState,
  completedAt: string | null,
): StudyProgressSummary {
  return {
    jobId,
    answeredActivities:
      state.comprehensionAnswers.length + state.clozeAttempts.length,
    masteredVocabularyCount: state.masteredVocabulary.length,
    completedAt,
  };
}

/** How far through a lesson a learner is, from the counts the library holds. */
export function studyCompletionPercent(
  totals: { activityCount: number; vocabularyCount: number },
  summary: Pick<
    StudyProgressSummary,
    "answeredActivities" | "masteredVocabularyCount"
  >,
): number {
  const totalSteps = totals.activityCount + totals.vocabularyCount;
  if (totalSteps === 0) return 0;
  const doneSteps = Math.min(
    summary.answeredActivities + summary.masteredVocabularyCount,
    totalSteps,
  );
  return Math.round((doneSteps / totalSteps) * 100);
}
