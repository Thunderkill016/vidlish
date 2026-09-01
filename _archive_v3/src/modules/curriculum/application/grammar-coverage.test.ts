import { describe, expect, it } from "vitest";

import { FOUNDATION_UNITS } from "@/modules/curriculum/content";

import {
  GRAMMAR_INVENTORY,
  grammarCoverageFor,
  unknownGrammarCodes,
} from "./grammar-coverage";

describe("grammar coverage against the published inventory", () => {
  it("claims no grammar item the profile does not contain", () => {
    // A code nobody can look up is the free-text field again with extra steps.
    expect(unknownGrammarCodes(FOUNDATION_UNITS)).toEqual([]);
  });

  it("holds the whole A1 inventory to measure against", () => {
    // If the artifact shrinks, coverage would rise without a unit being
    // written. The number has to be a fraction of something fixed.
    const a1 = GRAMMAR_INVENTORY.filter((entry) => entry.band === "A1");
    expect(a1.length).toBe(63);
  });

  it("reports how much of A1 the syllabus reaches", () => {
    // Not an assertion about a target — a printed fact. The course is early and
    // the honest thing is to know the number, not to hide it behind a threshold
    // that passes.
    const lines: string[] = [];
    for (const level of ["A1.1", "A1.2", "A1.3"]) {
      const coverage = grammarCoverageFor(FOUNDATION_UNITS, level);
      lines.push(
        `${level}: ${coverage.covered}/${coverage.total} ` +
          `(${Math.round((coverage.covered / coverage.total) * 100)}%)`,
      );
    }
    // eslint-disable-next-line no-console
    console.log(`  độ phủ ngữ pháp — ${lines.join("  ")}`);
    expect(lines.length).toBe(3);
  });

  it("keeps every unit pointing at something it teaches", () => {
    // A unit with no grammar code is untracked: it cannot raise coverage and
    // cannot be found when planning what to write next.
    const untagged = FOUNDATION_UNITS.filter(
      (unit) => unit.grammarCodes.length === 0,
    ).map((unit) => unit.id);
    expect(untagged).toEqual([]);
  });
});
