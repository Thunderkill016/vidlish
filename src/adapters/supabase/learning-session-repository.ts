import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

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
  learningReviewAttemptEvaluationSchema,
  learningReviewItemStateSchema,
  learningReviewOutcomeSchema,
  persistedReviewStateSchema,
  learningReviewSessionSchema,
  learningReviewStepSchema,
  privacySafeLearningReviewAttemptSchema,
  type LearningReviewItemState,
  type LearningReviewSession,
} from "@/shared/contracts/learning-review";
import {
  activityEvaluationSchema,
  learningPhaseSchema,
  lessonSessionSchema,
  type LessonSession,
} from "@/shared/contracts/lesson-v2";
import {
  persistedLearningSupportStepSchema,
  privacySafeActivityAttemptSchema,
  privacySafeActivityResponseSchema,
  privacySafeLearningSupportEventSchema,
  type PersistedLearningSupportStep,
} from "@/shared/contracts/privacy-safe-learning-evidence";

const sessionRowSchema = z
  .object({
    id: z.string().uuid(),
    lesson_version_id: z.string().uuid(),
    owner_user_id: z.string().uuid(),
    status: z.enum(["not_started", "in_progress", "completed", "abandoned"]),
    current_phase: learningPhaseSchema,
    current_activity_id: z.string(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    updated_at: z.string(),
  })
  .strict();

const startRpcRowSchema = z
  .object({
    session_id: z.string().uuid(),
    session_status: z.enum([
      "not_started",
      "in_progress",
      "completed",
      "abandoned",
    ]),
    current_phase: learningPhaseSchema,
    current_activity_id: z.string(),
    started_at: z.string().nullable(),
    completed_at: z.string().nullable(),
    updated_at: z.string(),
    created: z.boolean(),
  })
  .strict();

const attemptRpcRowSchema = z
  .object({
    attempt_id: z.string().uuid(),
    attempt_number: z.coerce.number().int().positive(),
    session_status: z.enum([
      "not_started",
      "in_progress",
      "completed",
      "abandoned",
    ]),
    current_phase: learningPhaseSchema,
    current_activity_id: z.string(),
    completed_at: z.string().nullable(),
    created: z.boolean(),
  })
  .strict();

const attemptRowSchema = z
  .object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    activity_id: z.string(),
    attempt_number: z.coerce.number().int().positive(),
    idempotency_key: z.string().uuid(),
    response: privacySafeActivityResponseSchema,
    evaluation: activityEvaluationSchema,
    submitted_at: z.string(),
  })
  .strict();

const supportEventRpcRowSchema = z
  .object({
    event_id: z.string().uuid(),
    idempotency_key: z.string().uuid(),
    event_kind: z.enum(["playback", "support_opened"]),
    support_step: persistedLearningSupportStepSchema.nullable(),
    playback_ordinal: z.coerce.number().int().positive().nullable(),
    occurred_at: z.string(),
    created: z.boolean(),
  })
  .strict();

const reviewItemRowSchema = z
  .object({
    owner_user_id: z.string().uuid(),
    item_key: z.string().min(1).max(160),
    source_lesson_version_id: z.string().uuid(),
    exposure_count: z.coerce.number().int().nonnegative(),
    attempt_count: z.coerce.number().int().nonnegative(),
    successful_retrievals: z.coerce.number().int().nonnegative(),
    last_outcome: learningReviewOutcomeSchema.nullable(),
    last_seen_at: z.string(),
    next_review_at: z.string().nullable(),
    last_delayed_transfer_at: z.string().nullable(),
    last_independent_at: z.string().nullable(),
    transfer_succeeded_at: z.string().nullable(),
    review_state: persistedReviewStateSchema.nullable(),
  })
  .strict();

const reviewSessionRowSchema = z
  .object({
    id: z.string().uuid(),
    owner_user_id: z.string().uuid(),
    item_key: z.string().min(1).max(160),
    source_lesson_version_id: z.string().uuid(),
    scheduled_for: z.string(),
    variant_id: z.string(),
    status: z.enum(["in_progress", "completed", "abandoned"]),
    current_step: learningReviewStepSchema,
    started_at: z.string(),
    completed_at: z.string().nullable(),
    updated_at: z.string(),
  })
  .strict();

const reviewStartRpcRowSchema = z
  .object({
    review_session_id: z.string().uuid(),
    session_status: z.enum(["in_progress", "completed", "abandoned"]),
    current_step: learningReviewStepSchema,
    scheduled_for: z.string(),
    variant_id: z.string(),
    started_at: z.string(),
    completed_at: z.string().nullable(),
    updated_at: z.string(),
    created: z.boolean(),
  })
  .strict();

const reviewAttemptRpcRowSchema = z
  .object({
    review_attempt_id: z.string().uuid(),
    attempt_number: z.coerce.number().int().positive(),
    session_status: z.enum(["in_progress", "completed", "abandoned"]),
    current_step: learningReviewStepSchema,
    completed_at: z.string().nullable(),
    created: z.boolean(),
  })
  .strict();

const reviewAttemptRowSchema = z
  .object({
    id: z.string().uuid(),
    review_session_id: z.string().uuid(),
    step: z.enum(["recall", "transfer"]),
    attempt_number: z.coerce.number().int().positive(),
    idempotency_key: z.string().uuid(),
    response: privacySafeActivityResponseSchema,
    evaluation: learningReviewAttemptEvaluationSchema,
    submitted_at: z.string(),
  })
  .strict();

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function mapSession(row: z.infer<typeof sessionRowSchema>): LessonSession {
  return lessonSessionSchema.parse({
    id: row.id,
    lessonVersionId: row.lesson_version_id,
    ownerUserId: row.owner_user_id,
    status: row.status,
    currentPhase: row.current_phase,
    currentActivityId: row.current_activity_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  });
}

function mapReviewItem(
  row: z.infer<typeof reviewItemRowSchema>,
): LearningReviewItemState {
  return learningReviewItemStateSchema.parse({
    ownerUserId: row.owner_user_id,
    itemKey: row.item_key,
    sourceLessonVersionId: row.source_lesson_version_id,
    exposureCount: row.exposure_count,
    attemptCount: row.attempt_count,
    successfulRetrievals: row.successful_retrievals,
    lastOutcome: row.last_outcome,
    lastSeenAt: row.last_seen_at,
    nextReviewAt: row.next_review_at,
    lastDelayedTransferAt: row.last_delayed_transfer_at,
    lastIndependentAt: row.last_independent_at ?? null,
    transferSucceededAt: row.transfer_succeeded_at ?? null,
    reviewState: row.review_state,
  });
}

function mapReviewSession(
  row: z.infer<typeof reviewSessionRowSchema>,
): LearningReviewSession {
  return learningReviewSessionSchema.parse({
    id: row.id,
    ownerUserId: row.owner_user_id,
    itemKey: row.item_key,
    sourceLessonVersionId: row.source_lesson_version_id,
    scheduledFor: row.scheduled_for,
    variantId: row.variant_id,
    status: row.status,
    currentStep: row.current_step,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  });
}

export class SupabaseLearningSessionRepository
  implements LearningSessionRepository, LearningReviewRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async start(input: StartLearningSessionInput) {
    const rpc = await this.client.rpc("start_lesson_v2_session", {
      p_owner_user_id: input.ownerUserId,
      p_lesson_version_id: input.lessonVersionId,
      p_initial_phase: input.initialPhase,
      p_initial_activity_id: input.initialActivityId,
    });
    if (rpc.error) throw rpc.error;

    const row = startRpcRowSchema.parse(firstRow(rpc.data));
    const session = lessonSessionSchema.parse({
      id: row.session_id,
      ownerUserId: input.ownerUserId,
      lessonVersionId: input.lessonVersionId,
      status: row.session_status,
      currentPhase: row.current_phase,
      currentActivityId: row.current_activity_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    });

    return { session, created: row.created };
  }

  async findOwnedSession(sessionId: string, ownerUserId: string) {
    const result = await this.client
      .from("lesson_sessions")
      .select(
        "id,lesson_version_id,owner_user_id,status,current_phase,current_activity_id,started_at,completed_at,updated_at",
      )
      .eq("id", sessionId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;

    return mapSession(sessionRowSchema.parse(result.data));
  }

  async countAttempts(
    sessionId: string,
    activityId: string,
    ownerUserId: string,
  ) {
    const result = await this.client
      .from("activity_attempts")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("activity_id", activityId)
      .eq("owner_user_id", ownerUserId);
    if (result.error) throw result.error;
    return result.count ?? 0;
  }

  async findSessionProgress(input: {
    ownerUserId: string;
    sessionId: string;
  }) {
    // Owner-scoped on both reads even though RLS already is: a repository that
    // relies on the policy alone reads differently under a service key, and
    // this one runs under both.
    const [attempts, events] = await Promise.all([
      this.client
        .from("activity_attempts")
        .select("activity_id")
        .eq("session_id", input.sessionId)
        .eq("owner_user_id", input.ownerUserId),
      this.client
        .from("learning_support_events")
        .select("activity_id,event_kind,support_step,occurred_at")
        .eq("session_id", input.sessionId)
        .eq("owner_user_id", input.ownerUserId)
        .order("occurred_at", { ascending: true }),
    ]);
    if (attempts.error) throw attempts.error;
    if (events.error) throw events.error;

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

    for (const row of attempts.data ?? []) {
      entry(row.activity_id).attemptCount += 1;
    }
    for (const row of events.data ?? []) {
      const record = entry(row.activity_id);
      if (row.event_kind === "playback") {
        record.playbackCount += 1;
        continue;
      }
      const step = row.support_step as PersistedLearningSupportStep | null;
      if (step && !record.openedSupportSteps.includes(step)) {
        record.openedSupportSteps.push(step);
      }
    }

    return [...byActivity.entries()].map(([activityId, record]) => ({
      activityId,
      ...record,
    }));
  }

  async recordAttempt(input: RecordLearningAttemptInput) {
    const rpc = await this.client.rpc("record_lesson_v2_attempt", {
      p_owner_user_id: input.ownerUserId,
      p_session_id: input.sessionId,
      p_activity_id: input.activityId,
      p_idempotency_key: input.idempotencyKey,
      p_response: input.responseEvidence,
      p_evaluation: input.evaluation,
      p_next_phase: input.nextPhase,
      p_next_activity_id: input.nextActivityId,
      p_complete: input.complete,
    });
    if (rpc.error) throw rpc.error;

    const rpcRow = attemptRpcRowSchema.parse(firstRow(rpc.data));
    const attemptResult = await this.client
      .from("activity_attempts")
      .select(
        "id,session_id,activity_id,attempt_number,idempotency_key,response,evaluation,submitted_at",
      )
      .eq("id", rpcRow.attempt_id)
      .eq("owner_user_id", input.ownerUserId)
      .single();
    if (attemptResult.error) throw attemptResult.error;

    const attemptRow = attemptRowSchema.parse(attemptResult.data);
    const session = await this.findOwnedSession(
      input.sessionId,
      input.ownerUserId,
    );
    if (!session) {
      throw new Error("Learning session disappeared after recording an attempt.");
    }

    const attempt = privacySafeActivityAttemptSchema.parse({
      id: attemptRow.id,
      sessionId: attemptRow.session_id,
      activityId: attemptRow.activity_id,
      attemptNumber: attemptRow.attempt_number,
      idempotencyKey: attemptRow.idempotency_key,
      responseEvidence: attemptRow.response,
      evaluation: attemptRow.evaluation,
      submittedAt: attemptRow.submitted_at,
    });

    return { attempt, session, created: rpcRow.created };
  }

  async recordSupportEvent(input: RecordLearningSupportEventInput) {
    const rpc = await this.client.rpc("record_lesson_v2_support_event", {
      p_owner_user_id: input.ownerUserId,
      p_session_id: input.sessionId,
      p_activity_id: input.activityId,
      p_idempotency_key: input.idempotencyKey,
      p_event_kind: input.eventKind,
      p_support_step:
        input.eventKind === "support_opened" ? input.supportStep : null,
    });
    if (rpc.error) throw rpc.error;

    const row = supportEventRpcRowSchema.parse(firstRow(rpc.data));
    const event = privacySafeLearningSupportEventSchema.parse({
      id: row.event_id,
      sessionId: input.sessionId,
      activityId: input.activityId,
      idempotencyKey: row.idempotency_key,
      eventKind: row.event_kind,
      supportStep: row.support_step,
      playbackOrdinal: row.playback_ordinal,
      occurredAt: row.occurred_at,
    });

    return { event, created: row.created };
  }

  async listScheduled(ownerUserId: string) {
    const result = await this.client
      .from("learning_item_states")
      .select(
        "owner_user_id,item_key,source_lesson_version_id,exposure_count,attempt_count,successful_retrievals,last_outcome,last_seen_at,next_review_at,last_delayed_transfer_at,last_independent_at,transfer_succeeded_at,review_state",
      )
      .eq("owner_user_id", ownerUserId)
      .not("next_review_at", "is", null)
      .order("next_review_at", { ascending: true });
    if (result.error) throw result.error;
    return (result.data ?? []).map((row) =>
      mapReviewItem(reviewItemRowSchema.parse(row)),
    );
  }

  async findItemState(ownerUserId: string, itemKey: string) {
    const result = await this.client
      .from("learning_item_states")
      .select(
        "owner_user_id,item_key,source_lesson_version_id,exposure_count,attempt_count,successful_retrievals,last_outcome,last_seen_at,next_review_at,last_delayed_transfer_at,last_independent_at,transfer_succeeded_at,review_state",
      )
      .eq("owner_user_id", ownerUserId)
      .eq("item_key", itemKey)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;
    return mapReviewItem(reviewItemRowSchema.parse(result.data));
  }

  async startDue(input: StartLearningReviewInput) {
    const rpc = await this.client.rpc("start_learning_review_session", {
      p_owner_user_id: input.ownerUserId,
      p_item_key: input.itemKey,
      p_variant_id: input.variantId,
    });
    if (rpc.error) throw rpc.error;

    const rpcRow = reviewStartRpcRowSchema.parse(firstRow(rpc.data));
    const session = await this.findOwnedReviewSession(
      rpcRow.review_session_id,
      input.ownerUserId,
    );
    if (!session) {
      throw new Error("Learning review session disappeared after start.");
    }
    return { session, created: rpcRow.created };
  }

  async findOwnedReviewSession(reviewSessionId: string, ownerUserId: string) {
    const result = await this.client
      .from("learning_review_sessions")
      .select(
        "id,owner_user_id,item_key,source_lesson_version_id,scheduled_for,variant_id,status,current_step,started_at,completed_at,updated_at",
      )
      .eq("id", reviewSessionId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;
    return mapReviewSession(reviewSessionRowSchema.parse(result.data));
  }

  async countActivityAttempts(input: {
    ownerUserId: string;
    sessionId: string;
    activityId: string;
  }) {
    const result = await this.client
      .from("activity_attempts")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", input.ownerUserId)
      .eq("session_id", input.sessionId)
      .eq("activity_id", input.activityId);
    if (result.error) throw result.error;
    return result.count ?? 0;
  }

  async countReviewAttempts(
    reviewSessionId: string,
    step: "recall" | "transfer",
    ownerUserId: string,
  ) {
    const result = await this.client
      .from("learning_review_attempts")
      .select("id", { count: "exact", head: true })
      .eq("review_session_id", reviewSessionId)
      .eq("step", step)
      .eq("owner_user_id", ownerUserId);
    if (result.error) throw result.error;
    return result.count ?? 0;
  }

  private async findReviewItem(ownerUserId: string, itemKey: string) {
    const result = await this.client
      .from("learning_item_states")
      .select(
        "owner_user_id,item_key,source_lesson_version_id,exposure_count,attempt_count,successful_retrievals,last_outcome,last_seen_at,next_review_at,last_delayed_transfer_at,last_independent_at,transfer_succeeded_at,review_state",
      )
      .eq("owner_user_id", ownerUserId)
      .eq("item_key", itemKey)
      .single();
    if (result.error) throw result.error;
    return mapReviewItem(reviewItemRowSchema.parse(result.data));
  }

  async recordReviewAttempt(input: RecordLearningReviewAttemptInput) {
    const rpc = await this.client.rpc("record_learning_review_attempt", {
      p_owner_user_id: input.ownerUserId,
      p_review_session_id: input.reviewSessionId,
      p_step: input.step,
      p_idempotency_key: input.idempotencyKey,
      p_response: input.responseEvidence,
      p_evaluation: input.evaluation,
      p_advance: input.advance,
      p_complete: input.complete,
      p_outcome: input.outcome,
      p_next_review_at: input.nextReviewAt,
      p_review_state: input.reviewState,
    });
    if (rpc.error) throw rpc.error;

    const rpcRow = reviewAttemptRpcRowSchema.parse(firstRow(rpc.data));
    const attemptResult = await this.client
      .from("learning_review_attempts")
      .select(
        "id,review_session_id,step,attempt_number,idempotency_key,response,evaluation,submitted_at",
      )
      .eq("id", rpcRow.review_attempt_id)
      .eq("owner_user_id", input.ownerUserId)
      .single();
    if (attemptResult.error) throw attemptResult.error;
    const attemptRow = reviewAttemptRowSchema.parse(attemptResult.data);
    const attempt = privacySafeLearningReviewAttemptSchema.parse({
      id: attemptRow.id,
      reviewSessionId: attemptRow.review_session_id,
      step: attemptRow.step,
      attemptNumber: attemptRow.attempt_number,
      idempotencyKey: attemptRow.idempotency_key,
      responseEvidence: attemptRow.response,
      evaluation: attemptRow.evaluation,
      submittedAt: attemptRow.submitted_at,
    });

    const session = await this.findOwnedReviewSession(
      input.reviewSessionId,
      input.ownerUserId,
    );
    if (!session) {
      throw new Error("Learning review session disappeared after attempt.");
    }
    const itemState = await this.findReviewItem(
      input.ownerUserId,
      session.itemKey,
    );

    return { attempt, session, itemState, created: rpcRow.created };
  }
}