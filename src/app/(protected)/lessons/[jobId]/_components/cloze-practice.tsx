"use client";

import { useState } from "react";

import {
  isTypedAnswerCorrect,
  splitClozeSentence,
} from "@/modules/study/application/answer-matching";
import type { Lesson } from "@/shared/contracts/lesson";
import type { StudyProgressState } from "@/shared/contracts/study";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import { CitationList } from "./citation-list";

/**
 * Fill-in-the-blank the learner actually fills in.
 *
 * Each item can be heard before it is answered, which is the point: the blank
 * is a listening exercise first and a reading exercise second. A wrong attempt
 * says so and lets them try again; revealing the answer is recorded separately,
 * so progress never claims a word was recalled when it was shown.
 */
export function ClozePractice({
  lesson,
  state,
  onAttempt,
  onPlay,
}: {
  lesson: Lesson;
  state: StudyProgressState;
  onAttempt: (index: number, result: { solved: boolean; revealed: boolean }) => void;
  onPlay: (startMs: number, endMs: number) => void;
}) {
  const [typed, setTyped] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, "wrong" | null>>({});

  return (
    <ol className="space-y-5">
      {lesson.draft.clozeItems.map((item, index) => {
        const attempt = state.clozeAttempts.find(
          (candidate) => candidate.index === index,
        );
        const settled = attempt?.solved || attempt?.revealed;
        const { before, after, hasBlank } = splitClozeSentence(item.sentence);
        const value = typed[index] ?? "";

        const check = () => {
          const correct = isTypedAnswerCorrect(value, item.answer);
          if (correct) {
            setFeedback((current) => ({ ...current, [index]: null }));
            onAttempt(index, { solved: true, revealed: false });
            return;
          }
          setFeedback((current) => ({ ...current, [index]: "wrong" }));
        };

        return (
          <li key={item.sentence} className="space-y-2">
            <p className="text-sm">
              {before}
              {hasBlank ? (
                <span className="font-semibold text-[var(--accent)]">
                  {/* Once settled the sentence shows the lesson's answer, not
                      what is still in the box — a reopened lesson has an empty
                      box and must still read as a complete sentence. */}
                  {settled ? item.answer : "____"}
                </span>
              ) : null}
              {after}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Gợi ý: {item.hintVi}
            </p>

            {settled ? (
              // Solving it and revealing it are different learner outcomes, so
              // they read differently at a glance. The wording still carries the
              // state on its own — colour is never the only signal.
              <p
                className={
                  attempt?.solved
                    ? "rounded-[var(--radius-sm)] bg-[var(--solved-wash)] px-3 py-2 text-sm font-semibold text-[var(--solved)]"
                    : "rounded-[var(--radius-sm)] bg-[var(--revealed-wash)] px-3 py-2 text-sm font-semibold text-[var(--revealed)]"
                }
                data-testid={`cloze-result-${index}`}
              >
                {attempt?.solved
                  ? "Chính xác."
                  : `Đáp án: ${item.answer}. Hãy nghe lại câu gốc rồi tự nói lại.`}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`cloze-${index}`}>
                    Điền từ còn thiếu cho câu {index + 1}
                  </label>
                  <Input
                    id={`cloze-${index}`}
                    className="max-w-xs"
                    value={value}
                    autoComplete="off"
                    placeholder="Nghe rồi điền từ"
                    onChange={(event) => {
                      const next = event.target.value;
                      setTyped((current) => ({ ...current, [index]: next }));
                      setFeedback((current) => ({ ...current, [index]: null }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        check();
                      }
                    }}
                  />
                  <Button onClick={check} disabled={value.trim().length === 0}>
                    Kiểm tra
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => onAttempt(index, { solved: false, revealed: true })}
                  >
                    Xem đáp án
                  </Button>
                </div>
                {feedback[index] === "wrong" ? (
                  <p
                    className="text-sm font-semibold text-[var(--evidence)]"
                    data-testid={`cloze-feedback-${index}`}
                  >
                    Chưa đúng. Nghe lại câu gốc rồi thử lần nữa.
                  </p>
                ) : null}
              </div>
            )}

            <CitationList
              segmentIds={item.sourceSegmentIds}
              citations={lesson.citations}
              videoId={lesson.videoId}
              onPlay={onPlay}
            />
          </li>
        );
      })}
    </ol>
  );
}
