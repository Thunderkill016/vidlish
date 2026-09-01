"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { cn } from "@/shared/lib/cn";

export type LessonPlayerHandle = {
  /** Plays from `startMs` and stops at `endMs` when one is given. */
  playSegment: (startMs: number, endMs?: number) => void;
};

export const PLAYBACK_RATES = [0.5, 0.75, 1] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/**
 * The embedded video, driven from the lesson.
 *
 * Commands go to the IFrame API over `postMessage`, which needs no script tag
 * and no third-party bundle. Stopping at the end of a segment is a timer rather
 * than a polled `currentTime`: the player is told when to stop at the moment it
 * is told to start, so a slow message never leaves the video running past the
 * line the learner asked to hear.
 */
export const LessonPlayer = forwardRef<
  LessonPlayerHandle,
  { videoId: string; title: string }
>(function LessonPlayer({ videoId, title }, ref) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rate, setRate] = useState<PlaybackRate>(1);
  const [hidden, setHidden] = useState(false);

  const command = useCallback((func: string, args: unknown[] = []) => {
    const target = frameRef.current?.contentWindow;
    if (!target) return;
    target.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "https://www.youtube.com",
    );
  }, []);

  const clearStopTimer = useCallback(() => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = null;
  }, []);

  useEffect(() => clearStopTimer, [clearStopTimer]);

  useImperativeHandle(
    ref,
    () => ({
      playSegment(startMs, endMs) {
        clearStopTimer();
        // Hiding the video is for listening practice, not for muting it; a
        // replay must still work with the picture off.
        command("seekTo", [startMs / 1000, true]);
        command("setPlaybackRate", [rate]);
        command("playVideo");
        if (typeof endMs === "number" && endMs > startMs) {
          // A little slack so the last word is not cut off by rounding.
          const durationMs = (endMs - startMs) / rate + 250;
          stopTimer.current = setTimeout(
            () => command("pauseVideo"),
            Math.min(durationMs, 600_000),
          );
        }
      },
    }),
    [clearStopTimer, command, rate],
  );

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-[var(--border)] bg-black",
          hidden ? "h-0 border-0" : "aspect-video",
        )}
      >
        <iframe
          ref={frameRef}
          className="h-full w-full"
          // `enablejsapi` is what makes the buttons in this lesson able to
          // drive the video; `rel=0` keeps the end screen inside the channel.
          src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">
          Tốc độ
        </span>
        {PLAYBACK_RATES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={rate === option}
            onClick={() => {
              setRate(option);
              command("setPlaybackRate", [option]);
            }}
            className={cn(
              "min-h-9 rounded-lg border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              rate === option
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--border)] hover:bg-[var(--muted)]",
            )}
          >
            {option}x
          </button>
        ))}
        <button
          type="button"
          onClick={() => setHidden((value) => !value)}
          className="ml-auto min-h-9 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {hidden ? "Hiện video" : "Ẩn video (luyện nghe)"}
        </button>
      </div>
    </div>
  );
});
