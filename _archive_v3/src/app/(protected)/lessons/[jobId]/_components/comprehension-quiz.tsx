"use client";

import type { Lesson } from "@/shared/contracts/lesson";
import type { StudyProgressState } from "@/shared/contracts/study";
import { cn } from "@/shared/lib/cn";

import { CitationList } from "./citation-list";

/**
 * Comprehension questions the learner answers, not a list with the answers
 * printed underneath.
 *
 * An answer is recorded once. Letting a learner click through options until the
 * page turns green would make the saved score meaningless — and would teach
 * them nothing about what they misheard. After answering, the explanation and
 * the line it came from are both available.
 */
export function ComprehensionQuiz({
  lesson,
  state,
  onAnswer,
  onPlay,
}: {
  lesson: Lesson;
  state: StudyProgressState;
  onAnswer: (index: number, selectedIndex: number) => void;
  onPlay: (startMs: number, endMs: number) => void;
}) {
  return (
    <ol className="space-y-5">
      {lesson.draft.comprehensionQuestions.map((question, index) => {
        const answer = state.comprehensionAnswers.find(
          (candidate) => candidate.index === index,
        );
        const answered = answer !== undefined;
        const isCorrect = answer?.selectedIndex === question.correctIndex;

        return (
          <li key={question.questionVi} className="space-y-2">
            <p className="font-medium">
              {index + 1}. {question.questionVi}
            </p>
            <ul className="space-y-2">
              {question.options.map((option, optionIndex) => {
                const chosen = answer?.selectedIndex === optionIndex;
                const revealCorrect =
                  answered && optionIndex === question.correctIndex;
                return (
                  <li key={option}>
                    <button
                      type="button"
                      disabled={answered}
                      onClick={() => onAnswer(index, optionIndex)}
                      aria-pressed={chosen}
                      className={cn(
                        "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                        answered
                          ? "cursor-default"
                          : "hover:border-[var(--primary)] hover:bg-[var(--muted)]",
                        revealCorrect
                          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
                          : chosen
                            ? "border-[var(--evidence)] bg-[color-mix(in_srgb,var(--evidence)_12%,transparent)]"
                            : "border-[var(--border)]",
                      )}
                    >
                      <span className="font-mono text-xs font-semibold">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span>{option}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {answered ? (
              <div className="space-y-2 rounded-xl bg-[var(--muted)] p-3 text-sm">
                <p className="font-semibold">
                  {isCorrect
                    ? "Chính xác."
                    : `Chưa đúng. Đáp án: ${String.fromCharCode(65 + question.correctIndex)}.`}
                </p>
                <p>{question.explanationVi}</p>
                <CitationList
                  segmentIds={question.sourceSegmentIds}
                  citations={lesson.citations}
                  videoId={lesson.videoId}
                  onPlay={onPlay}
                />
              </div>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">
                Chọn một đáp án để xem giải thích và câu gốc trong video.
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
