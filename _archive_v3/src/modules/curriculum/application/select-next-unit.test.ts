import { describe, expect, it } from "vitest";
import type { FoundationUnit } from "@/shared/contracts/curriculum";
import {
  selectNextUnit,
  unitStatus,
  type CurriculumEvidence,
} from "./select-next-unit";

const unit = (
  id: string,
  prerequisites: string[],
  chunk: string,
): FoundationUnit =>
  ({
    id,
    cefr: "Pre-A1",
    canDo: { vi: "x", en: "x" },
    communicativeFunction: "x",
    prerequisites,
    targetChunks: [{ text: chunk, vi: "x" }],
    grammarFeatures: [],
    inputScenes: [],
    activities: [],
    evidenceCriteria: [
      { chunk, independent: true, changedContext: true, delayed: true },
    ],
  }) as unknown as FoundationUnit;

const nothing: CurriculumEvidence = {
  independent: new Set(),
  changedContext: new Set(),
  delayed: new Set(),
};

const everything = (...chunks: string[]): CurriculumEvidence => ({
  independent: new Set(chunks),
  changedContext: new Set(chunks),
  delayed: new Set(chunks),
});

describe("unitStatus", () => {
  it("is unmet until every condition holds, not once the unit was visited", () => {
    const target = unit("intro", [], "my name is");

    expect(unitStatus(target, nothing)).toEqual({
      kind: "unmet",
      missing: ["my name is"],
    });
    expect(
      unitStatus(target, {
        independent: new Set(["my name is"]),
        changedContext: new Set(["my name is"]),
        delayed: new Set(),
      }),
    ).toEqual({ kind: "unmet", missing: ["my name is"] });
    expect(unitStatus(target, everything("my name is"))).toEqual({
      kind: "satisfied",
    });
  });

  it("requires reuse in a changed context on its own", () => {
    // Sabotaging this branch left every other test green, which means nothing
    // was checking it: independent production and delayed recall both held,
    // and only changed-context use was missing.
    const target = unit("intro", [], "my name is");

    expect(
      unitStatus(target, {
        independent: new Set(["my name is"]),
        changedContext: new Set(),
        delayed: new Set(["my name is"]),
      }),
    ).toEqual({ kind: "unmet", missing: ["my name is"] });
  });

  it("requires delayed recall on its own", () => {
    const target = unit("intro", [], "my name is");

    expect(
      unitStatus(target, {
        independent: new Set(["my name is"]),
        changedContext: new Set(["my name is"]),
        delayed: new Set(),
      }),
    ).toEqual({ kind: "unmet", missing: ["my name is"] });
  });

  it("reports one outstanding chunk once, not once per failed condition", () => {
    // Two failures on the same chunk is one thing left to do. Counting it twice
    // would make progress look further away than it is.
    const target = unit("intro", [], "my name is");
    const status = unitStatus(target, nothing);

    expect(status).toMatchObject({ missing: ["my name is"] });
  });
});

describe("selectNextUnit", () => {
  const units = [
    unit("intro", [], "my name is"),
    unit("order-drink", ["intro"], "can I have"),
  ];

  it("starts at the unit whose prerequisites are already evidenced", () => {
    const next = selectNextUnit({ units, evidence: nothing });
    expect(next).toMatchObject({ kind: "study", unit: { id: "intro" } });
  });

  it("moves on only when the earlier unit is evidenced, not visited", () => {
    const next = selectNextUnit({
      units,
      evidence: everything("my name is"),
    });
    expect(next).toMatchObject({ kind: "study", unit: { id: "order-drink" } });
  });

  it("does not skip ahead when a prerequisite is half done", () => {
    const next = selectNextUnit({
      units,
      evidence: {
        independent: new Set(["my name is"]),
        changedContext: new Set(),
        delayed: new Set(),
      },
    });

    expect(next).toMatchObject({ kind: "study", unit: { id: "intro" } });
  });

  it("says what a blocked syllabus is waiting on", () => {
    // A cycle, or a prerequisite naming a unit that does not exist, leaves
    // everything blocked. Naming the dependency is what makes that visible
    // instead of the product simply having nothing to offer.
    const broken = [unit("a", ["missing-unit"], "x")];
    const next = selectNextUnit({ units: broken, evidence: nothing });

    expect(next).toEqual({
      kind: "blocked",
      unit: broken[0],
      waitingOn: ["missing-unit"],
    });
  });

  it("reports completion only when every unit is evidenced", () => {
    expect(
      selectNextUnit({
        units,
        evidence: everything("my name is", "can I have"),
      }),
    ).toEqual({ kind: "syllabus_complete" });
  });
});
