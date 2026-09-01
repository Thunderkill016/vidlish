import "server-only";

import { InMemoryImitationMeasurementRepository } from "@/adapters/fake/in-memory-imitation-measurement-repository";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseImitationMeasurementRepository } from "@/adapters/supabase/imitation-measurement-repository";
import type { ImitationMeasurementRepository } from "@/modules/measurement/ports/imitation-measurement-repository";

type MeasurementGlobal = typeof globalThis & {
  __vidlishFakeImitationMeasurements?: InMemoryImitationMeasurementRepository;
};

const measurementGlobal = globalThis as MeasurementGlobal;

function fakeRepository(): InMemoryImitationMeasurementRepository {
  measurementGlobal.__vidlishFakeImitationMeasurements ??=
    new InMemoryImitationMeasurementRepository();
  return measurementGlobal.__vidlishFakeImitationMeasurements;
}

export function createImitationMeasurementRepository(): ImitationMeasurementRepository {
  // Deliberately the same switch every other evidence store uses. A deployment
  // where real sittings write to a fake store would lose the one number in this
  // product that is comparable between months.
  const value =
    process.env.LEARNING_SESSION_REPOSITORY ??
    (process.env.NODE_ENV === "production" ? "supabase" : "fake");

  if (value === "supabase") {
    return new SupabaseImitationMeasurementRepository(getAdminSupabaseClient());
  }

  const isCi = process.env.CI === "true" || process.env.CI === "1";
  if (process.env.NODE_ENV === "production" && !isCi) {
    throw new Error(
      "The fake imitation measurement repository cannot run in production.",
    );
  }
  return fakeRepository();
}
