import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  BeginnerEvidenceChallenge,
  BeginnerEvidenceChallengeKind,
  BeginnerProgressRepository,
  BeginnerWordEvidence,
  CalibrationRecord,
} from "@/modules/learning/ports/beginner-progress-repository";

/**
 * Beginner progress uses an admin/server client. Browser roles do not receive
 * EXECUTE access to evidence mutation RPCs or direct policies on challenge
 * rows. The challenge-bound RPC owns the atomic consume + evidence write.
 */

const evidenceRowSchema = z.object({
  item_key: z.string(),
  successful_retrievals: z.number().int(),
  last_independent_at: z.string().nullable(),
});

const calibrationRowSchema = z.object({
  checked_at: z.string(),
  reliable: z.boolean(),
});

const challengeRowSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["introduce_word", "dictation"]),
  target_word: z.string().min(1).max(64),
  sentence_text: z.string().min(1).max(200).nullable(),
  expires_at: z.string(),
});

function toChallenge(row: z.infer<typeof challengeRowSchema>): BeginnerEvidenceChallenge {
  return {
    id: row.id,
    kind: row.kind,
    word: row.target_word,
    sentence: row.sentence_text,
    expiresAt: row.expires_at,
  };
}

export class SupabaseBeginnerProgressRepository
  implements BeginnerProgressRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async latestCalibration(
    ownerUserId: string,
  ): Promise<CalibrationRecord | null> {
    const { data, error } = await this.client
      .from("learner_calibrations")
      .select("checked_at, reliable")
      .eq("owner_user_id", ownerUserId)
      .order("checked_at", { ascending: false })
      .limit(1);
    if (error) throw new Error(`Failed to read calibration: ${error.message}`);
    const row = (data ?? [])[0];
    if (!row) return null;
    const parsed = calibrationRowSchema.parse(row);
    return { checkedAt: parsed.checked_at, reliable: parsed.reliable };
  }

  async recordCalibration(input: {
    ownerUserId: string;
    wordTrials: number;
    nonwordTrials: number;
    hits: number;
    falseAlarms: number;
    reliable: boolean;
  }): Promise<CalibrationRecord> {
    const { data, error } = await this.client.rpc("record_learner_calibration", {
      p_owner_user_id: input.ownerUserId,
      p_word_trials: input.wordTrials,
      p_nonword_trials: input.nonwordTrials,
      p_hits: input.hits,
      p_false_alarms: input.falseAlarms,
      p_reliable: input.reliable,
    });
    if (error) {
      throw new Error(`Failed to record calibration: ${error.message}`);
    }
    const parsed = calibrationRowSchema.parse(
      Array.isArray(data) ? data[0] : data,
    );
    return { checkedAt: parsed.checked_at, reliable: parsed.reliable };
  }

  async knownWords(ownerUserId: string): Promise<string[]> {
    const { data, error } = await this.client.rpc("learner_known_words", {
      p_owner_user_id: ownerUserId,
    });
    if (error) throw new Error(`Failed to read known words: ${error.message}`);
    return z.array(z.object({ word: z.string() })).parse(data ?? []).map(
      (row) => row.word,
    );
  }

  async createEvidenceChallenge(input: {
    ownerUserId: string;
    kind: BeginnerEvidenceChallengeKind;
    word: string;
    sentence: string | null;
  }): Promise<BeginnerEvidenceChallenge> {
    const { data, error } = await this.client
      .from("beginner_evidence_challenges")
      .insert({
        owner_user_id: input.ownerUserId,
        kind: input.kind,
        target_word: input.word.toLocaleLowerCase("en-US"),
        sentence_text: input.sentence,
      })
      .select("id, kind, target_word, sentence_text, expires_at")
      .single();
    if (error) {
      throw new Error(`Failed to create beginner challenge: ${error.message}`);
    }
    return toChallenge(challengeRowSchema.parse(data));
  }

  async evidenceChallenge(input: {
    ownerUserId: string;
    challengeId: string;
  }): Promise<BeginnerEvidenceChallenge | null> {
    const { data, error } = await this.client
      .from("beginner_evidence_challenges")
      .select("id, kind, target_word, sentence_text, expires_at")
      .eq("id", input.challengeId)
      .eq("owner_user_id", input.ownerUserId)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to read beginner challenge: ${error.message}`);
    }
    if (!data) return null;
    return toChallenge(challengeRowSchema.parse(data));
  }

  async recordChallengeEvidence(input: {
    ownerUserId: string;
    challengeId: string;
    independent: boolean;
  }): Promise<BeginnerWordEvidence> {
    const { data, error } = await this.client.rpc(
      "record_beginner_challenge_evidence",
      {
        p_owner_user_id: input.ownerUserId,
        p_challenge_id: input.challengeId,
        p_independent: input.independent,
      },
    );
    if (error) {
      throw new Error(`Failed to record challenge evidence: ${error.message}`);
    }
    return this.toEvidence(data);
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
    return this.toEvidence(data);
  }

  private toEvidence(data: unknown): BeginnerWordEvidence {
    const row = evidenceRowSchema.parse(Array.isArray(data) ? data[0] : data);
    return {
      word: row.item_key,
      successfulRetrievals: row.successful_retrievals,
      lastIndependentAt: row.last_independent_at,
    };
  }
}
