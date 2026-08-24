import { selectSpeakingPractice } from "./select-speaking-practice";

import {
  learningSpeakingReviewQueueSchema,
  type LearningSpeakingReviewQueue,
} from "@/shared/contracts/learning-speaking";

const INDEPENDENT_DELAY_MS = 24 * 60 * 60 * 1000;

export type SpeakingReviewSessionCandidate = {
  id: string;
  lessonVersionId: string;
  completedAt: string;
};

export type SpeakingReviewAttemptRef = {
  sessionId: string;
  activityId: string;
};

/**
 * Derive reachability for Feature 024 without inventing a second scheduler.
 *
 * A session is actionable only while the exact guided-transfer activity has no
 * speaking receipt. Once the learner speaks immediately after the lesson, that
 * session can no longer produce a first delayed independent observation and is
 * therefore removed rather than misleadingly shown as "due" later.
 */
export function deriveSpeakingReviewQueue(input: {
  sessions: readonly SpeakingReviewSessionCandidate[];
  blueprintsByVersion: ReadonlyMap<string, unknown>;
  attempts: readonly SpeakingReviewAttemptRef[];
  now: Date;
}): LearningSpeakingReviewQueue {
  const attempted = new Set(
    input.attempts.map(
      (attempt) => `${attempt.sessionId}\u0000${attempt.activityId}`,
    ),
  );

  const candidates = input.sessions.flatMap((session) => {
    const practice = selectSpeakingPractice({
      sessions: [
        { id: session.id, lessonVersionId: session.lessonVersionId },
      ],
      blueprintsByVersion: input.blueprintsByVersion,
      requestedSessionId: session.id,
    });
    if (!practice) return [];
    if (attempted.has(`${session.id}\u0000${practice.activity.id}`)) return [];

    const completedAtMs = Date.parse(session.completedAt);
    if (!Number.isFinite(completedAtMs)) return [];

    return [
      {
        sessionId: session.id,
        activityId: practice.activity.id,
        dueAt: new Date(completedAtMs + INDEPENDENT_DELAY_MS).toISOString(),
      },
    ];
  });

  candidates.sort((left, right) => Date.parse(left.dueAt) - Date.parse(right.dueAt));
  const nowMs = input.now.getTime();
  const due = candidates.filter((candidate) => Date.parse(candidate.dueAt) <= nowMs);
  const upcoming =
    candidates.find((candidate) => Date.parse(candidate.dueAt) > nowMs) ?? null;

  return learningSpeakingReviewQueueSchema.parse({ due, upcoming });
}
