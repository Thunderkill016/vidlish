import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { fetchAllRows } from "@/adapters/supabase/fetch-all-rows";
import {
  projectBeginnerCapabilityEvidence,
  projectLessonActivityCapabilityEvidence,
} from "@/modules/learning/application/summarise-capability-evidence";
import { summariseLearningCapabilityProgress } from "@/modules/learning/application/summarise-learning-capability-progress";
import type { BeginnerWordEvidence } from "@/modules/learning/ports/beginner-progress-repository";
import {
  activityEvaluationSchema,
  lessonBlueprintV2Schema,
} from "@/shared/contracts/lesson-v2";
import {
  privacySafeActivityAttemptSchema,
  privacySafeActivityResponseSchema,
  privacySafeLearningSupportEventSchema,
  persistedLearningSupportStepSchema,
  type PrivacySafeLearningSupportEvent,
} from "@/shared/contracts/privacy-safe-learning-evidence";

const sessionRowSchema = z
  .object({
    id: z.string().uuid(),
    lesson_version_id: z.string().uuid(),
  })
  .strict();

const versionRowSchema = z
  .object({
    id: z.string().uuid(),
    blueprint: z.unknown(),
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
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    activity_id: z.string(),
    idempotency_key: z.string().uuid(),
    event_kind: z.enum(["playback", "support_opened"]),
    support_step: persistedLearningSupportStepSchema.nullable(),
    playback_ordinal: z.coerce.number().int().positive().nullable(),
    occurred_at: z.string(),
  })
  .strict();

const beginnerEvidenceRowSchema = z
  .object({
    item_key: z.string().min(1).max(160),
    successful_retrievals: z.coerce.number().int().nonnegative(),
    last_independent_at: z.string().nullable(),
    successful_dictations: z.coerce.number().int().nonnegative(),
    last_successful_dictation_at: z.string().nullable(),
    last_independent_dictation_at: z.string().nullable(),
  })
  .strict();

function toBeginnerEvidence(
  row: z.infer<typeof beginnerEvidenceRowSchema>,
): BeginnerWordEvidence {
  return {
    word: row.item_key,
    successfulRetrievals: row.successful_retrievals,
    lastIndependentAt: row.last_independent_at,
    successfulDictations: row.successful_dictations,
    lastSuccessfulDictationAt: row.last_successful_dictation_at,
    lastIndependentDictationAt: row.last_independent_dictation_at,
  };
}

/**
 * Rebuild four-skill progress from durable privacy-safe evidence.
 *
 * This deliberately does not persist another capability table. The immutable
 * lesson blueprint decides task modality, attempts carry bounded evaluation,
 * support events decide support strength, and beginner dictation keeps its own
 * listening evidence. Every read is owner-scoped even under a service-role
 * client and every collection is paginated to avoid silent Supabase row caps.
 */
export class SupabaseLearningCapabilityProgressReader {
  constructor(private readonly client: SupabaseClient) {}

  async read(ownerUserId: string) {
    const [sessionRows, versionRows, attemptRows, supportRows, beginnerRows] =
      await Promise.all([
        fetchAllRows((from, to) =>
          this.client
            .from("lesson_sessions")
            .select("id,lesson_version_id", { count: "exact" })
            .eq("owner_user_id", ownerUserId)
            .order("id", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows((from, to) =>
          this.client
            .from("lesson_versions")
            .select("id,blueprint", { count: "exact" })
            .eq("owner_user_id", ownerUserId)
            .order("id", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows((from, to) =>
          this.client
            .from("activity_attempts")
            .select(
              "id,session_id,activity_id,attempt_number,idempotency_key,response,evaluation,submitted_at",
              { count: "exact" },
            )
            .eq("owner_user_id", ownerUserId)
            .order("submitted_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows((from, to) =>
          this.client
            .from("learning_support_events")
            .select(
              "id,session_id,activity_id,idempotency_key,event_kind,support_step,playback_ordinal,occurred_at",
              { count: "exact" },
            )
            .eq("owner_user_id", ownerUserId)
            .order("occurred_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows((from, to) =>
          this.client
            .from("learning_item_states")
            .select(
              "item_key,successful_retrievals,last_independent_at,successful_dictations,last_successful_dictation_at,last_independent_dictation_at",
              { count: "exact" },
            )
            .eq("owner_user_id", ownerUserId)
            .gt("successful_dictations", 0)
            .order("item_key", { ascending: true })
            .range(from, to),
        ),
      ]);

    const sessions = sessionRows.map((row) => sessionRowSchema.parse(row));
    const versions = versionRows.map((row) => versionRowSchema.parse(row));
    const sessionsById = new Map(sessions.map((row) => [row.id, row]));
    const versionsById = new Map(versions.map((row) => [row.id, row.blueprint]));

    const supportBySession = new Map<string, PrivacySafeLearningSupportEvent[]>();
    for (const candidate of supportRows) {
      const row = supportRowSchema.parse(candidate);
      const event = privacySafeLearningSupportEventSchema.parse({
        id: row.id,
        sessionId: row.session_id,
        activityId: row.activity_id,
        idempotencyKey: row.idempotency_key,
        eventKind: row.event_kind,
        supportStep: row.support_step,
        playbackOrdinal: row.playback_ordinal,
        occurredAt: row.occurred_at,
      });
      const existing = supportBySession.get(event.sessionId) ?? [];
      existing.push(event);
      supportBySession.set(event.sessionId, existing);
    }

    const observations = beginnerRows.flatMap((candidate) => {
      const row = beginnerEvidenceRowSchema.parse(candidate);
      return projectBeginnerCapabilityEvidence(toBeginnerEvidence(row)).observations;
    });

    for (const candidate of attemptRows) {
      const row = attemptRowSchema.parse(candidate);
      const session = sessionsById.get(row.session_id);
      if (!session) {
        throw new Error(
          `Capability evidence attempt ${row.id} has no owner-scoped lesson session.`,
        );
      }
      const blueprintCandidate = versionsById.get(session.lesson_version_id);
      if (!blueprintCandidate) {
        throw new Error(
          `Capability evidence session ${session.id} has no owner-scoped lesson blueprint.`,
        );
      }
      const blueprint = lessonBlueprintV2Schema.parse(blueprintCandidate);

      const attempt = privacySafeActivityAttemptSchema.parse({
        id: row.id,
        sessionId: row.session_id,
        activityId: row.activity_id,
        attemptNumber: row.attempt_number,
        idempotencyKey: row.idempotency_key,
        responseEvidence: row.response,
        evaluation: row.evaluation,
        submittedAt: row.submitted_at,
      });
      observations.push(
        ...projectLessonActivityCapabilityEvidence({
          blueprint,
          attempt,
          supportEvents: supportBySession.get(attempt.sessionId) ?? [],
        }),
      );
    }

    return summariseLearningCapabilityProgress(observations);
  }
}
