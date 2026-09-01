import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * Which activities of a unit the learner still has reason to do.
 *
 * An activity is pending when at least one chunk it practises has no evidence
 * of independent production. That is deliberately the weakest of the three
 * evidence conditions: changed-context reuse and delayed recall are what the
 * review system is for, and holding a learner inside a unit until a delayed
 * review lands would mean the unit could not be finished on the day it started.
 *
 * So the unit teaches until the learner can produce its language unaided, and
 * the scheduler owns whether it stays.
 */
export function pendingUnitActivities(
  unit: FoundationUnit,
  independentlyKnown: ReadonlySet<string>,
): { unitId: string; activityId: string; strand: FoundationUnit["activities"][number]["strand"] }[] {
  // Normalised here rather than trusted from the caller. Lowercasing only one
  // side reads as case-insensitive and is not: a set that arrives with any
  // capital letter silently stops matching, and the learner is handed work they
  // have already finished.
  const known = new Set(
    [...independentlyKnown].map((chunk) => chunk.toLocaleLowerCase("en-US")),
  );

  return unit.activities
    .filter((activity) =>
      activity.targets.some(
        (target) => !known.has(target.toLocaleLowerCase("en-US")),
      ),
    )
    .map((activity) => ({
      unitId: unit.id,
      activityId: activity.id,
      strand: activity.strand,
    }));
}
