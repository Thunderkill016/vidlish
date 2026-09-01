import { describe, expect, it } from "vitest";

import {
  scoreStudyProgress,
  studyCompletionPercent,
  summarizeStudyProgress,
} from "@/modules/study/application/score-study-progress";
import type { LessonDraft } from "@/shared/contracts/lesson";
import {
  STUDY_PROGRESS_VERSION,
  type StudyProgressState,
} from "@/shared/contracts/study";

const draft = {
  comprehensionQuestions: [
    { correctIndex: 0 },
    { correctIndex: 2 },
    { correctIndex: 1 },
  ],
  clozeItems: [{ answer: "a" }, { answer: "b" }],
  vocabulary: [{ term: "one" }, { term: "two" }],
} as unknown as LessonDraft;

function state(partial: Partial<StudyProgressState> = {}): StudyProgressState {
  return {
    version: STUDY_PROGRESS_VERSION,
    comprehensionAnswers: [],
    clozeAttempts: [],
    masteredVocabulary: [],
    ...partial,
  };
}

describe("scoreStudyProgress", () => {
  it("counts only answers that match the lesson's key", () => {
    const score = scoreStudyProgress(
      draft,
      state({
        comprehensionAnswers: [
          { index: 0, selectedIndex: 0 },
          { index: 1, selectedIndex: 3 },
        ],
      }),
    );

    expect(score.answeredActivities).toBe(2);
    expect(score.correctActivities).toBe(1);
    expect(score.totalActivities).toBe(5);
  });

  it("does not count a revealed cloze answer as recalled", () => {
    const score = scoreStudyProgress(
      draft,
      state({
        clozeAttempts: [
          { index: 0, solved: true, revealed: false },
          { index: 1, solved: false, revealed: true },
        ],
      }),
    );

    expect(score.answeredActivities).toBe(2);
    expect(score.correctActivities).toBe(1);
  });

  it("ignores answers pointing past the end of the lesson", () => {
    const score = scoreStudyProgress(
      draft,
      state({
        comprehensionAnswers: [{ index: 5, selectedIndex: 0 }],
        masteredVocabulary: [0, 9],
      }),
    );

    expect(score.answeredActivities).toBe(0);
    expect(score.masteredVocabularyCount).toBe(1);
  });

  it("reaches 100% only when every activity and word is done", () => {
    const finished = scoreStudyProgress(
      draft,
      state({
        comprehensionAnswers: [
          { index: 0, selectedIndex: 0 },
          { index: 1, selectedIndex: 2 },
          { index: 2, selectedIndex: 1 },
        ],
        clozeAttempts: [
          { index: 0, solved: true, revealed: false },
          { index: 1, solved: false, revealed: true },
        ],
        masteredVocabulary: [0, 1],
      }),
    );

    expect(finished.percent).toBe(100);
    expect(finished.isFinished).toBe(true);
  });
});

describe("library summary", () => {
  it("reports how much was worked through without claiming a score", () => {
    const summary = summarizeStudyProgress(
      "11111111-1111-4111-8111-111111111111",
      state({
        comprehensionAnswers: [{ index: 0, selectedIndex: 1 }],
        clozeAttempts: [{ index: 0, solved: false, revealed: true }],
        masteredVocabulary: [1],
      }),
      null,
    );

    expect(summary).toEqual({
      jobId: "11111111-1111-4111-8111-111111111111",
      answeredActivities: 2,
      masteredVocabularyCount: 1,
      completedAt: null,
    });
  });

  it("never reports more than 100% or divides by an empty lesson", () => {
    expect(
      studyCompletionPercent(
        { activityCount: 2, vocabularyCount: 2 },
        { answeredActivities: 9, masteredVocabularyCount: 9 },
      ),
    ).toBe(100);
    expect(
      studyCompletionPercent(
        { activityCount: 0, vocabularyCount: 0 },
        { answeredActivities: 0, masteredVocabularyCount: 0 },
      ),
    ).toBe(0);
  });
});
