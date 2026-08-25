import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ImitationMeasurement,
  ImitationMeasurementRepository,
} from "@/modules/measurement/ports/imitation-measurement-repository";

type Row = {
  taken_at: string;
  attempted: number;
  passed: number;
  held_to: number;
  broke_at: number;
  above_bank: boolean;
  bank_version: string;
};

function toMeasurement(row: Row): ImitationMeasurement {
  return {
    takenAt: row.taken_at,
    attempted: row.attempted,
    passed: row.passed,
    heldTo: row.held_to,
    brokeAt: row.broke_at,
    aboveBank: row.above_bank,
    bankVersion: row.bank_version,
  };
}

export class SupabaseImitationMeasurementRepository
  implements ImitationMeasurementRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async record(input: {
    ownerUserId: string;
    measurement: Omit<ImitationMeasurement, "takenAt">;
  }): Promise<ImitationMeasurement> {
    const { data, error } = await this.client
      .from("learner_imitation_measurements")
      .insert({
        owner_user_id: input.ownerUserId,
        attempted: input.measurement.attempted,
        passed: input.measurement.passed,
        held_to: input.measurement.heldTo,
        broke_at: input.measurement.brokeAt,
        above_bank: input.measurement.aboveBank,
        bank_version: input.measurement.bankVersion,
      })
      .select("taken_at, attempted, passed, held_to, broke_at, above_bank, bank_version")
      .single();

    if (error || !data) {
      throw new Error(`imitation measurement was not stored: ${error?.message}`);
    }
    return toMeasurement(data as Row);
  }

  async history(
    ownerUserId: string,
    limit: number,
  ): Promise<readonly ImitationMeasurement[]> {
    const { data, error } = await this.client
      .from("learner_imitation_measurements")
      .select("taken_at, attempted, passed, held_to, broke_at, above_bank, bank_version")
      .eq("owner_user_id", ownerUserId)
      .order("taken_at", { ascending: false })
      .limit(Math.max(0, limit));

    if (error) throw new Error(`imitation history was not read: ${error.message}`);
    return (data ?? []).map((row) => toMeasurement(row as Row));
  }
}
