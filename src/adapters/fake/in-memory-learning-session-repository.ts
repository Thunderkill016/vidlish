import { randomUUID } from "node:crypto";

import type {
  LearningReviewRepository,
  RecordLearningReviewAttemptInput,
  StartLearningReviewInput,
} from "@/modules/learning/ports/learning-review-repository";
import type {
  LearningSessionRepository,
  RecordLearningAttemptInput,
  RecordLearningSupportEventInput,
  StartLearningSessionInput,
} from "@/modules/learning/ports/learning-session-repository";
import {
  learningReviewItemStateSchema,
  learningReviewSessionSchema,
  privacySafeLearningReviewAttemptSchema,
  type LearningReviewItemState,
  type LearningReviewSession,
  type PrivacySafeLearningReviewAttempt,
} from "@/shared/contracts/learning-review";
import {
  lessonSessionSchema,
  type LessonSession,
} from "@/shared/contracts/lesson-v2";
import {
  privacySafeActivityAttemptSchema,
  privacySafeLearningSupportEventSchema,
  type PersistedLearningSupportStep,
  type PrivacySafeActivityAttempt,
  type PrivacySafeLearningSupportEvent,
} from "@/shared/contracts/privacy-safe-learning-evidence";

const INITIAL_REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;

function addMs(iso: string, delayMs: number): string {
  return new Date(new Date(iso).getTime() + delayMs).toISOString();
}

function earlierIso(left: string, right: string): string {
  return new Date(left).getTime() <= new Date(right).getTime() ? left : right;
}

export class InMemoryLearningSessionRepository
  implements LearningSessionRepository, LearningReviewRepository
{
  private readonly sessions = new Map<string, LessonSession>();
  private readonly attempts = new Map<string, PrivacySafeActivityAttempt>();
  private readonly attemptIdsByIdempotency = new Map<string, string>();
  private readonly supportEvents = new Map<
    string,
    PrivacySafeLearningSupportEvent
  >();
  private readonly supportEventIdsByIdempotency = new Map<string, string>();
  private readonly supportEventIdsBySemanticKey = new Map<string, string>();
  private readonly reviewItems = new Map<string, LearningReviewItemState>();
  private readonly reviewSessions = new Map<string, LearningReviewSession>();
  private readonly reviewAttempts = new Map<
    string,
    PrivacySafeLearningReviewAttempt
  >();
  private readonly reviewAttemptIdsByIdempotency = new Map<string, string>();

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

  async countActivityAttempts(input: {
    ownerUserId: string;
    sessionId: string;
    activityId: string;
  }) {
    return this.countAttempts(
      input.sessionId,
      input.activityId,
      input.ownerUserId,
    );
  }

  async findSessionProgress(input: {
    ownerUserId: string;
    sessionId: string;
  }) {
    const session = this.sessions.get(input.sessionId);
    if (!session || session.ownerUserId !== input.ownerUserId) return [];

    const byActivity = new Map<
      string,
      {
        playbackCount: number;
        attemptCount: number;
        openedSupportSteps: PersistedLearningSupportStep[];
      }
    >();
    const entry = (activityId: string) => {
      const existing = byActivity.get(activityId);
      if (existing) return existing;
      const created = {
        playbackCount: 0,
        attemptCount: 0,
        openedSupportSteps: [] as PersistedLearningSupportStep[],
      };
      byActivity.set(activityId, created);
      return created;
    };

    for (const attempt of this.attempts.values()) {
      if (attempt.sessionId !== input.sessionId) continue;
      entry(attempt.activityId).attemptCount += 1;
    }

    // Ordered by when they happened, so the restored ladder reads the way the
    // learner walked it rather than in map insertion order.
    const events = [...this.supportEvents.values()]
      .filter((event) => event.sessionId === input.sessionId)
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    for (const event of events) {
      const record = entry(event.activityId);
      if (event.eventKind === "playback" || event.supportStep === null) {
        record.playbackCount += event.eventKind === "playback" ? 1 : 0;
        continue;
      }
      if (!record.openedSupportSteps.includes(event.supportStep)) {
        record.openedSupportSteps.push(event.supportStep);
      }
    }

    return [...byActivity.entries()].map(([activityId, record]) => ({
      activityId,
      playbackCount: record.playbackCount,
      attemptCount: record.attemptCount,
      openedSupportSteps: record.openedSupportSteps,
    }));
  }

  async countAttempts(
    sessionId: string,
    activityId: string,
    ownerUserId: string,
  ) {
    const session = this.sessions.get(sessionId);
    if (!session || session.ownerUserId !== ownerUserId) return 0;
    return [...this.attempts.values()].filter(
      (attempt) =>
        attempt.sessionId === sessionId && attempt.activityId === activityId,
    ).length;
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
    if (input.complete) {
      this.scheduleReviewItems(
        input.ownerUserId,
        advanced.lessonVersionId,
        input.reviewItemKeys,
        now,
      );
    }
    return { attempt, session: advanced, created: true };
  }

  private scheduleReviewItems(
    ownerUserId: string,
    lessonVersionId: string,
    itemKeys: string[],
    now: string,
  ) {
    const nextReviewAt = addMs(now, INITIAL_REVIEW_DELAY_MS);
    for (const itemKey of new Set(itemKeys)) {
      const mapKey = `${ownerUserId}:${itemKey}`;
      const existing = this.reviewItems.get(mapKey);
      const item = learningReviewItemStateSchema.parse({
        ownerUserId,
        itemKey,
        sourceLessonVersionId: lessonVersionId,
        exposureCount: (existing?.exposureCount ?? 0) + 1,
        attemptCount: existing?.attemptCount ?? 0,
        successfulRetrievals: existing?.successfulRetrievals ?? 0,
        lastOutcome: existing?.lastOutcome ?? null,
        lastSeenAt: now,
        nextReviewAt: existing?.nextReviewAt
          ? earlierIso(existing.nextReviewAt, nextReviewAt)
          : nextReviewAt,
        reviewState: existing?.reviewState ?? null,
        lastDelayedTransferAt: existing?.lastDelayedTransferAt ?? null,
      });
      this.reviewItems.set(mapKey, item);
    }
  }

  async recordSupportEvent(input: RecordLearningSupportEventInput) {
    const idempotencyLookup = `${input.ownerUserId}:${input.idempotencyKey}`;
    const existingEventId =
      this.supportEventIdsByIdempotency.get(idempotencyLookup);
    if (existingEventId) {
      const event = this.supportEvents.get(existingEventId);
      const session = this.sessions.get(input.sessionId);
      if (
        !event ||
        !session ||
        session.ownerUserId !== input.ownerUserId ||
        event.sessionId !== input.sessionId ||
        event.activityId !== input.activityId ||
        event.eventKind !== input.eventKind ||
        (input.eventKind === "support_opened" &&
          event.supportStep !== input.supportStep)
      ) {
        throw new Error("Idempotency key belongs to another support event.");
      }
      return { event, created: false };
    }

    if (input.eventKind === "support_opened") {
      const semanticKey = `${input.ownerUserId}:${input.sessionId}:${input.activityId}:${input.supportStep}`;
      const semanticEventId =
        this.supportEventIdsBySemanticKey.get(semanticKey);
      if (semanticEventId) {
        const event = this.supportEvents.get(semanticEventId);
        if (!event) throw new Error("Persisted support event disappeared.");
        return { event, created: false };
      }
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

    const playbackOrdinal =
      input.eventKind === "playback"
        ? [...this.supportEvents.values()].filter(
            (event) =>
              event.sessionId === input.sessionId &&
              event.activityId === input.activityId &&
              event.eventKind === "playback",
          ).length + 1
        : null;
    const event = privacySafeLearningSupportEventSchema.parse({
      id: randomUUID(),
      sessionId: input.sessionId,
      activityId: input.activityId,
      idempotencyKey: input.idempotencyKey,
      eventKind: input.eventKind,
      supportStep:
        input.eventKind === "support_opened" ? input.supportStep : null,
      playbackOrdinal,
      occurredAt: new Date().toISOString(),
    });

    this.supportEvents.set(event.id, event);
    this.supportEventIdsByIdempotency.set(idempotencyLookup, event.id);
    if (input.eventKind === "support_opened") {
      const semanticKey = `${input.ownerUserId}:${input.sessionId}:${input.activityId}:${input.supportStep}`;
      this.supportEventIdsBySemanticKey.set(semanticKey, event.id);
    }
    return { event, created: true };
  }

  async findItemState(ownerUserId: string, itemKey: string) {
    return (
      [...this.reviewItems.values()].find(
        (item) => item.ownerUserId === ownerUserId && item.itemKey === itemKey,
      ) ?? null
    );
  }

  async listScheduled(ownerUserId: string) {
    return [...this.reviewItems.values()]
      .filter((item) => item.ownerUserId === ownerUserId)
      .sort((left, right) => {
        if (left.nextReviewAt === null) return 1;
        if (right.nextReviewAt === null) return -1;
        return (
          new Date(left.nextReviewAt).getTime() -
          new Date(right.nextReviewAt).getTime()
        );
      });
  }

  async startDue(input: StartLearningReviewInput) {
    const item = this.reviewItems.get(`${input.ownerUserId}:${input.itemKey}`);
    if (!item || !item.nextReviewAt) {
      throw new Error("Owned scheduled review item not found.");
    }
    if (new Date(item.nextReviewAt).getTime() > Date.now()) {
      throw new Error("Learning review item is not due yet.");
    }

    const existing = [...this.reviewSessions.values()].find(
      (session) =>
        session.ownerUserId === input.ownerUserId &&
        session.itemKey === input.itemKey &&
        session.status === "in_progress",
    );
    if (existing) {
      if (existing.variantId !== input.variantId) {
        throw new Error("Active review session belongs to another variant.");
      }
      return { session: existing, created: false };
    }

    const now = new Date().toISOString();
    const session = learningReviewSessionSchema.parse({
      id: randomUUID(),
      ownerUserId: input.ownerUserId,
      itemKey: input.itemKey,
      sourceLessonVersionId: item.sourceLessonVersionId,
      scheduledFor: item.nextReviewAt,
      variantId: input.variantId,
      status: "in_progress",
      currentStep: "recall",
      startedAt: now,
      completedAt: null,
      updatedAt: now,
    });
    this.reviewSessions.set(session.id, session);
    return { session, created: true };
  }

  async findOwnedReviewSession(reviewSessionId: string, ownerUserId: string) {
    const session = this.reviewSessions.get(reviewSessionId);
    return session?.ownerUserId === ownerUserId ? session : null;
  }

  async countReviewAttempts(
    reviewSessionId: string,
    step: "recall" | "transfer",
    ownerUserId: string,
  ) {
    const session = this.reviewSessions.get(reviewSessionId);
    if (!session || session.ownerUserId !== ownerUserId) return 0;
    return [...this.reviewAttempts.values()].filter(
      (attempt) =>
        attempt.reviewSessionId === reviewSessionId && attempt.step === step,
    ).length;
  }

  async recordReviewAttempt(input: RecordLearningReviewAttemptInput) {
    const idempotencyLookup = `${input.ownerUserId}:${input.idempotencyKey}`;
    const existingAttemptId =
      this.reviewAttemptIdsByIdempotency.get(idempotencyLookup);
    if (existingAttemptId) {
      const attempt = this.reviewAttempts.get(existingAttemptId);
      const session = this.reviewSessions.get(input.reviewSessionId);
      const item = session
        ? this.reviewItems.get(`${input.ownerUserId}:${session.itemKey}`)
        : undefined;
      if (
        !attempt ||
        !session ||
        !item ||
        session.ownerUserId !== input.ownerUserId ||
        attempt.reviewSessionId !== input.reviewSessionId ||
        attempt.step !== input.step
      ) {
        throw new Error("Idempotency key belongs to another review attempt.");
      }
      return { attempt, session, itemState: item, created: false };
    }

    const session = this.reviewSessions.get(input.reviewSessionId);
    if (!session || session.ownerUserId !== input.ownerUserId) {
      throw new Error("Owned learning review session not found.");
    }
    if (session.status !== "in_progress") {
      throw new Error("Learning review session is not active.");
    }
    if (session.currentStep !== input.step) {
      throw new Error("Review step is not current for this session.");
    }

    if (input.step === "recall") {
      if (input.evaluation.step !== "recall") {
        throw new Error("Review evaluation does not match delayed recall.");
      }
      const shouldAdvance = input.evaluation.verdict === "correct";
      if (
        input.advance !== shouldAdvance ||
        input.complete ||
        input.outcome !== null
      ) {
        throw new Error("Invalid delayed recall progression.");
      }
    } else {
      if (input.evaluation.step !== "transfer") {
        throw new Error("Review evaluation does not match delayed transfer.");
      }
      if (input.advance) {
        throw new Error("Transfer does not use the recall advance flag.");
      }
      if (input.complete !== input.evaluation.confirmed) {
        throw new Error("Transfer completion must match confirmed criteria.");
      }
      if (
        input.complete &&
        input.outcome !== "good" &&
        input.outcome !== "hard"
      ) {
        throw new Error("Completed delayed transfer requires hard or good.");
      }
      if (!input.complete && input.outcome !== null) {
        throw new Error("Incomplete delayed transfer cannot set an outcome.");
      }
    }

    const itemKey = `${input.ownerUserId}:${session.itemKey}`;
    const currentItem = this.reviewItems.get(itemKey);
    if (!currentItem) {
      throw new Error("Scheduled review item disappeared.");
    }

    const attemptNumber =
      [...this.reviewAttempts.values()].filter(
        (attempt) =>
          attempt.reviewSessionId === input.reviewSessionId &&
          attempt.step === input.step,
      ).length + 1;
    const now = new Date().toISOString();
    const attempt = privacySafeLearningReviewAttemptSchema.parse({
      id: randomUUID(),
      reviewSessionId: input.reviewSessionId,
      step: input.step,
      attemptNumber,
      idempotencyKey: input.idempotencyKey,
      responseEvidence: input.responseEvidence,
      evaluation: input.evaluation,
      submittedAt: now,
    });

    const successfulRecall =
      input.step === "recall" &&
      input.evaluation.step === "recall" &&
      input.evaluation.verdict === "correct";
    const item = learningReviewItemStateSchema.parse({
      ...currentItem,
      attemptCount: currentItem.attemptCount + 1,
      successfulRetrievals:
        currentItem.successfulRetrievals + (successfulRecall ? 1 : 0),
      lastSeenAt: now,
      lastOutcome: input.complete ? input.outcome : currentItem.lastOutcome,
      // The schedule arrives already computed. This fake used to hold its own
      // copy of the three-day/one-day constants, which meant the tests agreed
      // with themselves rather than with what the product actually schedules.
      nextReviewAt: input.complete
        ? (input.nextReviewAt ?? currentItem.nextReviewAt)
        : currentItem.nextReviewAt,
      reviewState: input.complete
        ? (input.reviewState ?? currentItem.reviewState)
        : currentItem.reviewState,
      lastDelayedTransferAt: input.complete
        ? now
        : currentItem.lastDelayedTransferAt,
    });
    const advanced = learningReviewSessionSchema.parse({
      ...session,
      status: input.complete ? "completed" : "in_progress",
      currentStep: input.complete
        ? "completed"
        : input.step === "recall" && input.advance
          ? "transfer"
          : input.step,
      completedAt: input.complete ? now : null,
      updatedAt: now,
    });

    this.reviewAttempts.set(attempt.id, attempt);
    this.reviewAttemptIdsByIdempotency.set(idempotencyLookup, attempt.id);
    this.reviewItems.set(itemKey, item);
    this.reviewSessions.set(advanced.id, advanced);
    return { attempt, session: advanced, itemState: item, created: true };
  }
}
