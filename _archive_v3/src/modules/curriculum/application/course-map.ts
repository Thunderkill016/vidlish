import type { FoundationUnit } from "@/shared/contracts/curriculum";

import { pendingUnitActivities } from "./pending-unit-activities";

/**
 * The whole course, as something a learner can look at.
 *
 * This existed as data and never as a page. Thirty units were authored, the
 * syllabus covered A1 63/63 and A2 31/31, and `resolveTodaysAction` picked one
 * activity out of them — so the learner was handed a single exercise at a time
 * with no idea what the course contained, where they were in it, or what came
 * next. The page was even called "Lộ trình", a route, and showed no route.
 *
 * A learner who cannot see the road cannot tell progress from repetition. This
 * is the read model that shows it: every unit, what it makes them able to do,
 * and how much of it their own evidence has already closed.
 *
 * Status is derived from evidence, never from attendance. A unit is finished
 * when the learner can produce its language unaided — not when they have
 * clicked through its screens.
 */

export type UnitStatus =
  /** Every target produced unaided. Nothing left to teach here. */
  | "done"
  /** Open, and the nearest unfinished unit — where the learner is now. */
  | "current"
  /** Open, but not the next one. */
  | "available"
  /** Waiting on units that have to be evidenced first. */
  | "locked";

export type UnitProgress = {
  readonly unit: FoundationUnit;
  /** 1-based, in teaching order. */
  readonly position: number;
  readonly activities: number;
  readonly activitiesDone: number;
  readonly status: UnitStatus;
  /** Unit ids still owed, when locked. */
  readonly blockedBy: readonly string[];
};

export type CourseMap = {
  readonly units: readonly UnitProgress[];
  readonly unitsDone: number;
  readonly activitiesDone: number;
  readonly activities: number;
};

export function courseMap(
  units: readonly FoundationUnit[],
  independentlyKnown: ReadonlySet<string>,
): CourseMap {
  const finished = new Set<string>();
  for (const unit of units) {
    if (pendingUnitActivities(unit, independentlyKnown).length === 0) {
      finished.add(unit.id);
    }
  }

  let currentAssigned = false;
  const progress: UnitProgress[] = units.map((unit, index) => {
    const pending = pendingUnitActivities(unit, independentlyKnown);
    const done = unit.activities.length - pending.length;
    // A prerequisite is a unit whose language this one builds on. Listing what
    // is still owed, rather than showing a bare padlock, is the difference
    // between a course a learner can plan around and one that just says no.
    const blockedBy = unit.prerequisites.filter((id) => !finished.has(id));

    let status: UnitStatus;
    if (pending.length === 0) status = "done";
    else if (blockedBy.length > 0) status = "locked";
    else if (!currentAssigned) {
      status = "current";
      currentAssigned = true;
    } else status = "available";

    return {
      unit,
      position: index + 1,
      activities: unit.activities.length,
      activitiesDone: done,
      status,
      blockedBy,
    };
  });

  return {
    units: progress,
    unitsDone: progress.filter((item) => item.status === "done").length,
    activitiesDone: progress.reduce((sum, item) => sum + item.activitiesDone, 0),
    activities: progress.reduce((sum, item) => sum + item.activities, 0),
  };
}
