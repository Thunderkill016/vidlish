"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  studyProgressStateSchema,
  type StudyProgressState,
} from "@/shared/contracts/study";

export type StudySaveStatus = "idle" | "saving" | "saved" | "error";

/** Long enough that typing an answer is one save, short enough that closing the
 *  tab right after answering still lands. */
const SAVE_DEBOUNCE_MS = 800;

const savedProgressSchema = z.object({
  progress: z.object({ completedAt: z.string().nullable() }),
});

/**
 * Holds the learner's answers and mirrors them to the server.
 *
 * The screen is the source of truth while the lesson is open: a failed save
 * leaves every answer exactly where it is and reports itself, and the next
 * change retries with the complete state, so one dropped request cannot leave
 * the stored progress half-written.
 */
export function useStudyProgress({
  jobId,
  initialState,
  initialCompletedAt,
}: {
  jobId: string;
  initialState: StudyProgressState;
  initialCompletedAt: string | null;
}) {
  const [state, setState] = useState<StudyProgressState>(initialState);
  const [completedAt, setCompletedAt] = useState<string | null>(
    initialCompletedAt,
  );
  const [status, setStatus] = useState<StudySaveStatus>("idle");

  // The pending payload, kept outside React state so a save always sends the
  // whole progress rather than whichever half a render happened to see.
  const pending = useRef({
    state: initialState,
    completed: initialCompletedAt !== null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async () => {
    setStatus("saving");
    try {
      const response = await fetch(`/api/lessons/${jobId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      if (!response.ok) throw new Error("study progress save rejected");
      const parsed = savedProgressSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("study progress response invalid");
      setCompletedAt(parsed.data.progress.completedAt);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }, [jobId]);

  const schedule = useCallback(
    (next: StudyProgressState, completed: boolean) => {
      pending.current = { state: next, completed };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void persist(), SAVE_DEBOUNCE_MS);
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const update = useCallback(
    (change: (current: StudyProgressState) => StudyProgressState) => {
      // Parsing here keeps an impossible state — a duplicate answer, an index
      // past the end — from ever reaching the server or the score.
      const next = studyProgressStateSchema.parse(change(pending.current.state));
      setState(next);
      schedule(next, pending.current.completed);
    },
    [schedule],
  );

  const setCompleted = useCallback(
    (completed: boolean) => {
      setCompletedAt((current) =>
        completed ? (current ?? new Date().toISOString()) : null,
      );
      schedule(pending.current.state, completed);
    },
    [schedule],
  );

  return { state, completedAt, status, update, setCompleted };
}
