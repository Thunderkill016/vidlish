import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { LearningSpeakingAttemptRepository } from "@/modules/learning/ports/learning-speaking-attempt-repository";
import {
  learningSpeakingAttemptSchema,
  type RecordLearningSpeakingAttemptInput,
} from "@/shared/contracts/learning-speaking";

const rpcRowSchema = z
  .object({
    speaking_attempt_id: z.string().uuid(),
    created: z.boolean(),
  })
  .strict();

const rowSchema = z
  .object({
    id: z.string().uuid(),
    session_id: z.string().uuid(),
    activity_id: z.string(),
    attempt_number: z.coerce.number().int().positive(),
    support_level: z.enum(["supported", "independent"]),
    idempotency_key: z.string().uuid(),
    duration_ms: z.coerce.number().int(),
    byte_count: z.coerce.number().int(),
    mime_type: z.string(),
    replayed: z.boolean(),
    confirmed_audible_speech: z.boolean(),
    created_at: z.string(),
  })
  .strict();

function firstRow(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export class SupabaseLearningSpeakingAttemptRepository
  implements LearningSpeakingAttemptRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async record(input: RecordLearningSpeakingAttemptInput) {
    const rpc = await this.client.rpc("record_learning_speaking_attempt", {
      p_owner_user_id: input.ownerUserId,
      p_session_id: input.sessionId,
      p_activity_id: input.activityId,
      p_idempotency_key: input.idempotencyKey,
      p_duration_ms: input.durationMs,
      p_byte_count: input.byteCount,
      p_mime_type: input.mimeType,
      p_replayed: input.replayed,
      p_confirmed_audible_speech: input.confirmedAudibleSpeech,
    });
    if (rpc.error) throw rpc.error;

    const rpcRow = rpcRowSchema.parse(firstRow(rpc.data));
    const result = await this.client
      .from("learning_speaking_attempts")
      .select(
        "id,session_id,activity_id,attempt_number,support_level,idempotency_key,duration_ms,byte_count,mime_type,replayed,confirmed_audible_speech,created_at",
      )
      .eq("id", rpcRow.speaking_attempt_id)
      .eq("owner_user_id", input.ownerUserId)
      .single();
    if (result.error) throw result.error;
    const row = rowSchema.parse(result.data);

    const attempt = learningSpeakingAttemptSchema.parse({
      id: row.id,
      sessionId: row.session_id,
      activityId: row.activity_id,
      attemptNumber: row.attempt_number,
      support: row.support_level,
      idempotencyKey: row.idempotency_key,
      durationMs: row.duration_ms,
      byteCount: row.byte_count,
      mimeType: row.mime_type,
      replayed: row.replayed,
      confirmedAudibleSpeech: row.confirmed_audible_speech,
      createdAt: row.created_at,
    });

    return { attempt, created: rpcRow.created };
  }
}
