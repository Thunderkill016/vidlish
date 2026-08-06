import { randomUUID } from "node:crypto";

import type {
  LearningSessionRepository,
  RecordLearningAttemptInput,
  StartLearningSessionInput,
} from "@/modules/learning/ports/learning-session-repository";
import {
  lessonSessionSchema,
  type LessonSession,
} from "@/shared/contracts/lesson-v2";
import {
  privacySafeActivityAttemptSchema,
  type PrivacySafeActivityAttempt,
} from "@/shared/contracts/privacy-safe-learning-evidence";

export class InMemoryLearningSessionRepository
  implements LearningSessionRepository
{
  private readonly sessions = new Map<string, LessonSession>();
  private readonly attempts = new Map<string, PrivacySafeActivityAttempt>();
  private readonly attemptIdsByIdempotency = new Map<string, string>();

  async start(input: StartLearningSessionInput) {
    const existing = [...this.sessions.values()].find(
      (session) =>
        session.ownerUserId === input.ownerUserId &&
        session.lessonVersionId === input.lessonVersionId &&
        (session.status === "not_started" || session.status === "in_progress"),
    );
    if (existing) return { session: existing, created: false };

    const now = new Date().toISOString();
    const session = lessonSessionSchema.parse({
      id: randomUUID(),
      ownerUserId: input.ownerUserId,
      lessonVersionId: input.lessonVersionId,
      status: "in_progress",
      currentPhase: input.initialPhase,
      currentActivityId: input.initialActivityId,
      startedAt: now,
      completedAt: null,
      updatedAt: now,
    });
    this.sessions.set(session.id, session);
    return { session, created: true };
  }

  async findOwnedSession(sessionId: string, ownerUserId: string) {
    const session = this.sessions.get(sessionId);
    return session?.ownerUserId === ownerUserId ? session : null;
  }

  async recordAttempt(input: RecordLearningAttemptInput) {
    const idempotencyLookup = `${input.ownerUserId}:${input.idempotencyKey}`;
    const existingAttemptId = this.attemptIdsByIdempotency.get(idempotencyLookup);
    if (existingAttemptId) {
      const attempt = this.attempts.get(existingAttemptId);
      const session = this.sessions.get(input.sessionId);
      if (
        !attempt ||
        !session ||
        attempt.sessionId !== input.sessionId ||
        attempt.activityId !== input.activityId ||
        session.ownerUserId !== input.ownerUserId
      ) {
        throw new Error("Idempotency key belongs to another learning attempt.");
      }
      return { attempt, session, created: false };
    }

    const session = this.sessions.get(input.sessionId);
    if (!session || session.ownerUserId !== input.ownerUserId) {
      throw new Error("Owned learning session not found.");
    }
    if (session.status !== "not_started" && session.status !== "in_progress") {
      throw new Error("Learning session is not active.");
    }
    if (session.currentActivityId !== input.activityId) {
      throw new Error("Activity is not current for this session.");
    }

    const attemptNumber =
      [...this.attempts.values()].filter(
        (attempt) =>
          attempt.sessionId === input.sessionId &&
          attempt.activityId === input.activityId,
      ).length + 1;
    const now = new Date().toISOString();
    const attempt = privacySafeActivityAttemptSchema.parse({
      id: randomUUID(),
      sessionId: input.sessionId,
      activityId: input.activityId,
      attemptNumber,
      idempotencyKey: input.idempotencyKey,
      responseEvidence: input.responseEvidence,
      evaluation: input.evaluation,
      submittedAt: now,
    });
    const advanced = lessonSessionSchema.parse({
      ...session,
      status: input.complete ? "completed" : "in_progress",
      currentPhase: input.complete ? "completed" : input.nextPhase,
      currentActivityId: input.nextActivityId,
      completedAt: input.complete ? now : null,
      updatedAt: now,
    });

    this.attempts.set(attempt.id, attempt);
    this.attemptIdsByIdempotency.set(idempotencyLookup, attempt.id);
    this.sessions.set(advanced.id, advanced);
    return { attempt, session: advanced, created: true };
  }
}
