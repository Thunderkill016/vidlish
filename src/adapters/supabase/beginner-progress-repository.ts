import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  BeginnerProgressRepository,
  BeginnerWordEvidence,
} from "@/modules/learning/ports/beginner-progress-repository";

/**
 * Both calls go through database functions rather than table writes.
 *
 * The rules that matter here cannot be enforced from application code: proof of
 * independence must never move backwards, and evidence must never be recorded
 * on behalf of another learner. A function owns both, so a future script that
 * forgets them still cannot write a row that breaks them.
 */

const evidenceRowSchema = z.object({
  item_key: z.string(),
  successful_retrievals: z.number().int(),
  last_independent_at: z.string().nullable(),
});

export class SupabaseBeginnerProgressRepository
  implements BeginnerProgressRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async knownWords(ownerUserId: string): Promise<string[]> {
    const { data, error } = await this.client.rpc("learner_known_words", {
      p_owner_user_id: ownerUserId,
    });
    if (error) throw new Error(`Failed to read known words: ${error.message}`);
    return z.array(z.object({ word: z.string() })).parse(data ?? []).map(
      (row) => row.word,
    );
  }

  async recordWordEvidence(input: {
    ownerUserId: string;
    word: string;
    independent: boolean;
  }): Promise<BeginnerWordEvidence> {
    const { data, error } = await this.client.rpc(
      "record_beginner_word_evidence",
      {
        p_owner_user_id: input.ownerUserId,
        p_word: input.word,
        p_independent: input.independent,
      },
    );
    if (error) {
      throw new Error(`Failed to record word evidence: ${error.message}`);
    }

    const row = evidenceRowSchema.parse(Array.isArray(data) ? data[0] : data);
    return {
      word: row.item_key,
      successfulRetrievals: row.successful_retrievals,
      lastIndependentAt: row.last_independent_at,
    };
  }
}
