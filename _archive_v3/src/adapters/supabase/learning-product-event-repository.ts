import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  LearningProductEventRepository,
  RecordLearningProductEventInput,
} from "@/modules/learning/ports/learning-product-event-repository";
import {
  learningProductEventKindSchema,
  learningRuntimeErrorKindSchema,
  privacySafeLearningProductEventSchema,
} from "@/shared/contracts/learning-product-events";

const rpcRowSchema = z
  .object({
    event_id: z.string().uuid(),
    idempotency_key: z.string().uuid(),
    event_kind: learningProductEventKindSchema,
    detail_kind: learningRuntimeErrorKindSchema.nullable(),
    occurred_at: z.string(),
    created: z.boolean(),
  })
  .strict();

const rowSchema = z
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

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export class SupabaseLearningProductEventRepository
  implements LearningProductEventRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async record(input: RecordLearningProductEventInput) {
    const rpc = await this.client.rpc("record_lesson_v2_product_event", {
      p_owner_user_id: input.ownerUserId,
      p_session_id: input.sessionId,
      p_activity_id: input.activityId,
      p_idempotency_key: input.idempotencyKey,
      p_event_kind: input.eventKind,
      p_detail_kind:
        input.eventKind === "runtime_error" ? input.detailKind : null,
    });
    if (rpc.error) throw rpc.error;

    const row = rpcRowSchema.parse(firstRow(rpc.data));
    const event = privacySafeLearningProductEventSchema.parse({
      id: row.event_id,
      sessionId: input.sessionId,
      activityId: input.activityId,
      idempotencyKey: row.idempotency_key,
      eventKind: row.event_kind,
      detailKind: row.detail_kind,
      occurredAt: row.occurred_at,
    });
    return { event, created: row.created };
  }

  async listForSession(input: { ownerUserId: string; sessionId: string }) {
    const result = await this.client
      .from("learning_product_events")
      .select(
        "id,session_id,activity_id,idempotency_key,event_kind,detail_kind,occurred_at",
      )
      .eq("owner_user_id", input.ownerUserId)
      .eq("session_id", input.sessionId)
      .order("occurred_at", { ascending: true });
    if (result.error) throw result.error;

    return (result.data ?? []).map((candidate) => {
      const row = rowSchema.parse(candidate);
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
  }
}
