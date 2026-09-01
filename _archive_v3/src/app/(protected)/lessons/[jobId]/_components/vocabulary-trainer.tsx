"use client";

import { useState } from "react";

import type { Lesson } from "@/shared/contracts/lesson";
import type { StudyProgressState } from "@/shared/contracts/study";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";

import { CitationList } from "./citation-list";

/**
 * Vocabulary in two shapes: a reference list, and a flashcard drill over the
 * words the learner has not marked as learned yet.
 *
 * The drill shows the English side first and hides the Vietnamese meaning until
 * asked. Recall before recognition is the whole reason the card is a card and
 * not a row in a table.
 */
export function VocabularyTrainer({
  lesson,
  state,
  onToggleMastered,
  onPlay,
}: {
  lesson: Lesson;
  state: StudyProgressState;
  onToggleMastered: (index: number) => void;
  onPlay: (startMs: number, endMs: number) => void;
}) {
  const [mode, setMode] = useState<"list" | "flashcards">("list");
  const mastered = new Set(state.masteredVocabulary);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ModeButton
          active={mode === "list"}
          onClick={() => setMode("list")}
          label="Danh sách"
        />
        <ModeButton
          active={mode === "flashcards"}
          onClick={() => setMode("flashcards")}
          label="Flashcard"
        />
        <p className="ml-auto text-xs text-[var(--muted-foreground)]">
          Đã thuộc {mastered.size}/{lesson.draft.vocabulary.length}
        </p>
      </div>

      {mode === "list" ? (
        <ul className="space-y-4">
          {lesson.draft.vocabulary.map((item, index) => (
            <li key={item.term} className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <p className="font-semibold">{item.term}</p>
                <span className="text-sm text-[var(--muted-foreground)]">
                  ({item.partOfSpeech}) — {item.meaningVi}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleMastered(index)}
                  aria-pressed={mastered.has(index)}
                  className={cn(
                    "ml-auto min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                    mastered.has(index)
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-[var(--border)] hover:bg-[var(--muted)]",
                  )}
                >
                  {mastered.has(index) ? "Đã thuộc" : "Đánh dấu đã thuộc"}
                </button>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">
                {item.definitionEn}
              </p>
              <p className="text-sm">Ví dụ mới: {item.exampleEn}</p>
              <CitationList
                segmentIds={item.sourceSegmentIds}
                citations={lesson.citations}
                videoId={lesson.videoId}
                onPlay={onPlay}
              />
            </li>
          ))}
        </ul>
      ) : (
        <FlashcardDrill
          lesson={lesson}
          masteredIndexes={mastered}
          onToggleMastered={onToggleMastered}
          onPlay={onPlay}
        />
      )}
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--border)] hover:bg-[var(--muted)]",
      )}
    >
      {label}
    </button>
  );
}

function FlashcardDrill({
  lesson,
  masteredIndexes,
  onToggleMastered,
  onPlay,
}: {
  lesson: Lesson;
  masteredIndexes: Set<number>;
  onToggleMastered: (index: number) => void;
  onPlay: (startMs: number, endMs: number) => void;
}) {
  // The deck is fixed when the drill opens: marking a card learned must not
  // reshuffle it under the learner's hands mid-review.
  const [queue] = useState(() =>
    lesson.draft.vocabulary
      .map((item, index) => ({ item, index }))
      .filter((entry) => !masteredIndexes.has(entry.index)),
  );
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState(false);

  if (queue.length === 0) {
    return (
      <p className="rounded-xl bg-[var(--muted)] p-4 text-sm">
        Bạn đã đánh dấu thuộc toàn bộ từ vựng của bài này. Quay lại danh sách để
        bỏ đánh dấu nếu muốn ôn lại.
      </p>
    );
  }

  const current = queue[Math.min(position, queue.length - 1)]!;
  const next = () => {
    setRevealed(false);
    setPosition((value) => (value + 1) % queue.length);
  };

  return (
    <div className="space-y-3" data-testid="flashcard-drill">
      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-xs font-semibold text-[var(--muted-foreground)]">
          Thẻ {Math.min(position, queue.length - 1) + 1}/{queue.length}
        </p>
        <p className="text-2xl font-bold">{current.item.term}</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          {current.item.definitionEn}
        </p>

        {revealed ? (
          <div className="space-y-2 rounded-xl bg-[var(--muted)] p-3 text-sm">
            <p className="font-semibold">{current.item.meaningVi}</p>
            <p>Ví dụ: {current.item.exampleEn}</p>
            <CitationList
              segmentIds={current.item.sourceSegmentIds}
              citations={lesson.citations}
              videoId={lesson.videoId}
              onPlay={onPlay}
            />
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setRevealed(true)}>
            Hiện nghĩa
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            onToggleMastered(current.index);
            next();
          }}
        >
          Đã thuộc
        </Button>
        <Button variant="secondary" onClick={next}>
          Ôn lại sau
        </Button>
      </div>
    </div>
  );
}
