import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { summariseLearningProductMeasurement } from "@/modules/learning/application/summarise-learning-product-measurement";
import {
  activityEvaluationSchema,
  learningPhaseSchema,
  lessonBlueprintV2Schema,
  lessonSessionSchema,
} from "@/shared/contracts/lesson-v2";
import { learningMeasurementSummarySchema } from "@/shared/contracts/learning-measurement";
import {
  learningProductEventKindSchema,
  learningRuntimeErrorKindSchema,
  privacySafeLearningProductEventSchema,
} from "@/shared/contracts/learning-product-events";
import {
  persistedLearningSupportStepSchema,
  privacySafeActivityAttemptSchema,
  privacySafeActivityResponseSchema,
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

const supportRowSchema = z
  .object({
    activity_id: z.string(),
    event_kind: z.enum(["playback", "support_opened"]),
    support_step: persistedLearningSupportStepSchema.nullable(),
    occurred_at: z.string(),
  })
  .strict();

const productEventRowSchema = z
  .object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    activity_id: z.string(),
    idempotency_key: z.string().uuid(),
    event_kind: learningProductEventKindSchema,
    detail_kind: learningRuntimeErrorKindSchema.nullable(),
    occurred_at: z.string(),
  })
  .strict();

const versionRowSchema = z
  .object({
    blueprint: lessonBlueprintV2Schema,
  })
  .strict();

export class SupabaseLearningMeasurementReader {
  constructor(private readonly client: SupabaseClient) {}

  async read(ownerUserId: string, sessionId: string) {
    const sessionResult = await this.client
      .from("lesson_sessions")
      .select(
        "id,lesson_version_id,owner_user_id,status,current_phase,current_activity_id,started_at,completed_at,updated_at",
      )
      .eq("id", sessionId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (sessionResult.error) throw sessionResult.error;
    if (!sessionResult.data) return null;
    const sessionRow = sessionRowSchema.parse(sessionResult.data);

    const [versionResult, attemptsResult, supportResult, productResult] =
      await Promise.all([
        this.client
          .from("lesson_versions")
          .select("blueprint")
          .eq("id", sessionRow.lesson_version_id)
          .eq("owner_user_id", ownerUserId)
          .single(),
        this.client
          .from("activity_attempts")
          .select(
            "id,session_id,activity_id,attempt_number,idempotency_key,response,evaluation,submitted_at",
          )
          .eq("session_id", sessionId)
          .eq("owner_user_id", ownerUserId)
          .order("submitted_at", { ascending: true }),
        this.client
          .from("learning_support_events")
          .select("activity_id,event_kind,support_step,occurred_at")
          .eq("session_id", sessionId)
          .eq("owner_user_id", ownerUserId)
          .order("occurred_at", { ascending: true }),
        this.client
          .from("learning_product_events")
          .select(
            "id,session_id,activity_id,idempotency_key,event_kind,detail_kind,occurred_at",
          )
          .eq("session_id", sessionId)
          .eq("owner_user_id", ownerUserId)
          .order("occurred_at", { ascending: true }),
      ]);

    if (versionResult.error) throw versionResult.error;
    if (attemptsResult.error) throw attemptsResult.error;
    if (supportResult.error) throw supportResult.error;
    if (productResult.error) throw productResult.error;

    const blueprint = versionRowSchema.parse(versionResult.data).blueprint;
    const session = lessonSessionSchema.parse({
      id: sessionRow.id,
      lessonVersionId: sessionRow.lesson_version_id,
      ownerUserId: sessionRow.owner_user_id,
      status: sessionRow.status,
      currentPhase: sessionRow.current_phase,
      currentActivityId: sessionRow.current_activity_id,
      startedAt: sessionRow.started_at,
      completedAt: sessionRow.completed_at,
      updatedAt: sessionRow.updated_at,
    });
    const attempts = (attemptsResult.data ?? []).map((candidate) => {
      const row = attemptRowSchema.parse(candidate);
      return privacySafeActivityAttemptSchema.parse({
        id: row.id,
        sessionId: row.session_id,
        activityId: row.activity_id,
        attemptNumber: row.attempt_number,
        idempotencyKey: row.idempotency_key,
        responseEvidence: row.response,
        evaluation: row.evaluation,
        submittedAt: row.submitted_at,
      });
    });

    const progressByActivity = new Map<
      string,
      {
        playbackCount: number;
        attemptCount: number;
        openedSupportSteps: PersistedLearningSupportStep[];
      }
    >();
    const progressFor = (activityId: string) => {
      const existing = progressByActivity.get(activityId);
      if (existing) return existing;
      const created = {
        playbackCount: 0,
        attemptCount: 0,
        openedSupportSteps: [] as PersistedLearningSupportStep[],
      };
      progressByActivity.set(activityId, created);
      return created;
    };
    for (const attempt of attempts) {
      progressFor(attempt.activityId).attemptCount += 1;
    }
    for (const candidate of supportResult.data ?? []) {
      const row = supportRowSchema.parse(candidate);
      const progress = progressFor(row.activity_id);
      if (row.event_kind === "playback") {
        progress.playbackCount += 1;
      } else if (
        row.support_step &&
        !progress.openedSupportSteps.includes(row.support_step)
      ) {
        progress.openedSupportSteps.push(row.support_step);
      }
    }
    const progress = [...progressByActivity.entries()].map(
      ([activityId, value]) => ({ activityId, ...value }),
    );

    const productEvents = (productResult.data ?? []).map((candidate) => {
      const row = productEventRowSchema.parse(candidate);
      return privacySafeLearningProductEventSchema.parse({
        id: row.id,
        sessionId: row.session_id,
        activityId: row.activity_id,
        idempotencyKey: row.idempotency_key,
        eventKind: row.event_kind,
        detailKind: row.detail_kind,
        occurredAt: row.occurred_at,
      });
    });

    return learningMeasurementSummarySchema.parse(
      summariseLearningProductMeasurement(blueprint, {
        session,
        attempts,
        progress,
        productEvents,
      }),
    );
  }
}
