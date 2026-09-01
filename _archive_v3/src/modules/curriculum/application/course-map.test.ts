import { describe, expect, it } from "vitest";

import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import type { FoundationUnit } from "@/shared/contracts/curriculum";

import { courseMap } from "./course-map";

function unit(
  id: string,
  targets: string[],
  prerequisites: string[] = [],
): FoundationUnit {
  return {
    id,
    cefr: "A1.1",
    canDo: { vi: `Làm được ${id}`, en: `Can do ${id}` },
    communicativeFunction: "test",
    prerequisites,
    targetChunks: targets.map((text) => ({ text, vi: text, audio: null })),
    grammarFeatures: [],
    grammarCodes: [],
    activities: targets.map((target, index) => ({
      id: `${id}-a${index}`,
      strand: "language_focused" as const,
      skill: "listening" as const,
      instructionVi: "x",
      targets: [target],
      evidenceKeys: [target],
      supportAllowed: false,
    })),
    evidence: [],
  } as unknown as FoundationUnit;
}

describe("showing the learner the whole course", () => {
  it("marks a unit done only when its language is produced unaided", () => {
    const units = [unit("one", ["alpha", "beta"])];
    expect(courseMap(units, new Set(["alpha"])).units[0]?.status).toBe("current");
    expect(courseMap(units, new Set(["alpha", "beta"])).units[0]?.status).toBe("done");
  });

  it("counts activities closed, not screens visited", () => {
    const map = courseMap([unit("one", ["a", "b", "c", "d"])], new Set(["a", "b"]));
    expect(map.units[0]?.activities).toBe(4);
    expect(map.units[0]?.activitiesDone).toBe(2);
  });

  it("names exactly one unit as where the learner is now", () => {
    const units = [unit("one", ["a"]), unit("two", ["b"]), unit("three", ["c"])];
    const statuses = courseMap(units, new Set(["a"])).units.map((item) => item.status);
    expect(statuses).toEqual(["done", "current", "available"]);
  });

  it("locks a unit whose prerequisites are still owed, and says which", () => {
    // A bare padlock tells the learner nothing they can act on. Naming the unit
    // still owed is the difference between a course they can plan around and
    // one that just refuses.
    const units = [unit("basics", ["a"]), unit("advanced", ["b"], ["basics"])];
    const locked = courseMap(units, new Set())?.units[1];
    expect(locked?.status).toBe("locked");
    expect(locked?.blockedBy).toEqual(["basics"]);
  });

  it("opens a unit as soon as its prerequisites are evidenced", () => {
    const units = [unit("basics", ["a"]), unit("advanced", ["b"], ["basics"])];
    expect(courseMap(units, new Set(["a"])).units[1]?.status).toBe("current");
  });

  it("reads the real syllabus and finds a course, not a pile", () => {
    const map = courseMap(FOUNDATION_UNITS, new Set());
    expect(map.units.length).toBeGreaterThanOrEqual(30);
    expect(map.activities).toBeGreaterThan(map.units.length);
    // Nothing known yet, so nothing is finished — and exactly one unit is where
    // the learner stands.
    expect(map.unitsDone).toBe(0);
    expect(map.activitiesDone).toBe(0);
    expect(map.units.filter((item) => item.status === "current")).toHaveLength(1);
    // Every unit says what it makes the learner able to do, in Vietnamese.
    for (const item of map.units) expect(item.unit.canDo.vi.length).toBeGreaterThan(0);
  });
});
