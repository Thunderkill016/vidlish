"use client";

import { useState } from "react";

import { cn } from "@/shared/lib/cn";

import { formatTimestamp } from "./format-timestamp";

export type TranscriptLine = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

/**
 * The whole eligible transcript, line by line, playable one line at a time.
 *
 * Hiding the text is the exercise: the learner replays a line until they can
 * hear it, then reveals it to check. Only lines the original-English gate
 * permitted are here, so nothing on this screen is speech Vidlish could not
 * verify as English from the video itself.
 */
export function ListeningLab({
  lines,
  onPlay,
}: {
  lines: readonly TranscriptLine[];
  onPlay: (startMs: number, endMs: number) => void;
}) {
  const [hideText, setHideText] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  if (lines.length === 0) {
    return (
      <p className="text-sm text-[var(--muted-foreground)]">
        Bài học này chưa có lời thoại chi tiết để luyện nghe.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={hideText}
          onClick={() => {
            setHideText((value) => !value);
            setRevealed(new Set());
          }}
          className={cn(
            "min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            hideText
              ? "border-[var(--primary)] bg-[var(--primary)] text-white"
              : "border-[var(--border)] hover:bg-[var(--muted)]",
          )}
        >
          {hideText ? "Đang ẩn lời thoại" : "Ẩn lời thoại để nghe trước"}
        </button>
        <p className="text-xs text-[var(--muted-foreground)]">
          {lines.length} câu · bấm ▶ để nghe đúng một câu
        </p>
      </div>

      <ol className="max-h-[28rem] space-y-1 overflow-y-auto pr-1" data-testid="transcript-lines">
        {lines.map((line) => {
          const isRevealed = !hideText || revealed.has(line.id);
          return (
            <li
              key={line.id}
              className="flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-[var(--muted)]"
            >
              <button
                type="button"
                onClick={() => onPlay(line.startMs, line.endMs)}
                aria-label={`Nghe câu tại ${formatTimestamp(line.startMs)}`}
                className="mt-0.5 inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2 font-mono text-xs font-semibold text-[var(--accent)] hover:bg-[var(--card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <span aria-hidden="true">▶</span>
                {formatTimestamp(line.startMs)}
              </button>
              {isRevealed ? (
                <p className="text-sm">{line.text}</p>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setRevealed((current) => new Set(current).add(line.id))
                  }
                  className="text-left text-sm text-[var(--muted-foreground)] underline decoration-dotted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Hiện lời thoại
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
