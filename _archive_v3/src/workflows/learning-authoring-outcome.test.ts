import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import path from "node:path";

import type { LearningAuthoringOutcome } from "@/modules/generation/ports/generation-job-repository";

/**
 * The outcome union and the database check constraint are the same list written
 * twice, and the second copy is SQL that no compiler reads. A value the type
 * allows but the constraint rejects turns a diagnostic write into an error the
 * workflow then swallows — the field would go quiet exactly when it matters.
 *
 * The two sides fail in different places, verified by breaking each one:
 * dropping a member from the union is a typecheck error here, because
 * `OUTCOMES` is annotated with it; dropping one from the SQL fails this test.
 */
const MIGRATION = path.normalize(
  "supabase/migrations/20260821040000_record_learning_authoring_outcome.sql",
);

const OUTCOMES: LearningAuthoringOutcome[] = [
  "disabled",
  "job_missing",
  "transcript_missing",
  "not_eligible",
  "lesson_missing",
  "diagnosed",
  "authored",
  "diagnose_failed",
  "authoring_failed",
];

describe("learning authoring outcome", () => {
  it("lists the same values in the type and the check constraint", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const allowed = new Set(
      sql
        .slice(sql.indexOf("in ("), sql.indexOf(")", sql.indexOf("in (")))
        .match(/'([a-z_]+)'/g)
        ?.map((value) => value.slice(1, -1)) ?? [],
    );

    expect([...allowed].sort()).toEqual([...OUTCOMES].sort());
  });

  it("records every branch the step can take", () => {
    // Guards against a branch being added to the workflow without a matching
    // outcome, which would leave that path as unexplained as before.
    const steps = readFileSync(
      path.normalize("src/workflows/generate-lesson.steps.ts"),
      "utf8",
    );
    const recorded = new Set(
      steps
        .match(/recordAuthoringOutcome\(jobRef, "([a-z_]+)"/g)
        ?.map((call) => call.split('"')[1]!) ?? [],
    );

    // `loaded.reason` covers the three context failures in one call, so those
    // are asserted through the union rather than through a literal.
    for (const outcome of [
      "disabled",
      "diagnosed",
      "authored",
      "diagnose_failed",
      "authoring_failed",
    ]) {
      expect(recorded.has(outcome)).toBe(true);
    }
    expect(steps).toContain("recordAuthoringOutcome(jobRef, loaded.reason)");
  });
});
