import type {
  ImitationMeasurement,
  ImitationMeasurementRepository,
} from "@/modules/measurement/ports/imitation-measurement-repository";

/**
 * Sittings for development and CI.
 *
 * It keeps the one rule the table enforces that the application would otherwise
 * be free to break: a sitting nobody attempted is not a result.
 */
export class InMemoryImitationMeasurementRepository
  implements ImitationMeasurementRepository
{
  private readonly rows = new Map<string, ImitationMeasurement[]>();

  async record(input: {
    ownerUserId: string;
    measurement: Omit<ImitationMeasurement, "takenAt">;
  }): Promise<ImitationMeasurement> {
    if (input.measurement.attempted <= 0) {
      throw new Error("an imitation sitting with no attempts is not a result");
    }
    const stored: ImitationMeasurement = {
      ...input.measurement,
      takenAt: new Date().toISOString(),
    };
    const existing = this.rows.get(input.ownerUserId) ?? [];
    this.rows.set(input.ownerUserId, [stored, ...existing]);
    return stored;
  }

  async history(
    ownerUserId: string,
    limit: number,
  ): Promise<readonly ImitationMeasurement[]> {
    return (this.rows.get(ownerUserId) ?? []).slice(0, Math.max(0, limit));
  }
}
