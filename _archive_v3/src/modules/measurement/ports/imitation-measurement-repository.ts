export type ImitationMeasurement = {
  readonly takenAt: string;
  readonly attempted: number;
  readonly passed: number;
  readonly heldTo: number;
  readonly brokeAt: number;
  readonly aboveBank: boolean;
  readonly bankVersion: string;
};

/**
 * Where sittings are kept so they can be compared with each other.
 *
 * Only the verdict crosses this boundary. The transcript is scored in the
 * request and dropped there; nothing that could reconstruct what the learner
 * said reaches storage.
 */
export interface ImitationMeasurementRepository {
  record(input: {
    readonly ownerUserId: string;
    readonly measurement: Omit<ImitationMeasurement, "takenAt">;
  }): Promise<ImitationMeasurement>;

  /** Most recent first. */
  history(ownerUserId: string, limit: number): Promise<readonly ImitationMeasurement[]>;
}
