import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * Which unit the learner should be working on.
 *
 * A unit is available when everything it depends on has been *evidenced*, not
 * when it has been *visited*. That distinction is the whole point of having a
 * curriculum here rather than a playlist: a learner who clicked through the
 * introductions unit and cannot say their name has not finished it, and letting
 * them move on would build the next unit on language they do not have.
 *
 * Evidence is supplied by the caller as the set of chunks the learner has
 * produced under each condition, because the curriculum module has no business
 * knowing how evidence is stored.
 */

export type CurriculumEvidence = {
  /** Chunks produced with no support open. */
  readonly independent: ReadonlySet<string>;
  /** Chunks reused in a situation they were not taught in. */
  readonly changedContext: ReadonlySet<string>;
  /** Chunks still produced correctly after a delay. */
  readonly delayed: ReadonlySet<string>;
};

export type UnitStatus =
  | { kind: "satisfied" }
  | { kind: "unmet"; missing: string[] };

export function unitStatus(
  unit: FoundationUnit,
  evidence: CurriculumEvidence,
): UnitStatus {
  const missing: string[] = [];
  for (const criterion of unit.evidenceCriteria) {
    if (criterion.independent && !evidence.independent.has(criterion.chunk)) {
      missing.push(criterion.chunk);
      continue;
    }
    if (
      criterion.changedContext &&
      !evidence.changedContext.has(criterion.chunk)
    ) {
      missing.push(criterion.chunk);
      continue;
    }
    if (criterion.delayed && !evidence.delayed.has(criterion.chunk)) {
      missing.push(criterion.chunk);
    }
  }
  // Duplicates collapse: one chunk missing two conditions is one thing left to
  // do, and reporting it twice would make progress look further away than it is.
  const unique = [...new Set(missing)];
  return unique.length === 0 ? { kind: "satisfied" } : { kind: "unmet", missing: unique };
}

export type NextUnit =
  | { kind: "study"; unit: FoundationUnit }
  | { kind: "blocked"; unit: FoundationUnit; waitingOn: string[] }
  | { kind: "syllabus_complete" };

export function selectNextUnit(input: {
  readonly units: readonly FoundationUnit[];
  readonly evidence: CurriculumEvidence;
}): NextUnit {
  const satisfied = new Set(
    input.units
      .filter((unit) => unitStatus(unit, input.evidence).kind === "satisfied")
      .map((unit) => unit.id),
  );

  const outstanding = input.units.filter((unit) => !satisfied.has(unit.id));
  if (outstanding.length === 0) return { kind: "syllabus_complete" };

  for (const unit of outstanding) {
    const waitingOn = unit.prerequisites.filter((id) => !satisfied.has(id));
    if (waitingOn.length === 0) return { kind: "study", unit };
  }

  // Everything left depends on something not yet evidenced. Reporting the first
  // such unit with what it waits on is more useful than a bare "nothing to do",
  // and it is how a prerequisite cycle in the syllabus becomes visible.
  const [first] = outstanding;
  return {
    kind: "blocked",
    unit: first,
    waitingOn: first.prerequisites.filter((id) => !satisfied.has(id)),
  };
}
