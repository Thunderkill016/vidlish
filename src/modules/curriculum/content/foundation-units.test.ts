import { describe, expect, it } from "vitest";
import { foundationUnitSchema } from "@/shared/contracts/curriculum";
import { FOUNDATION_UNITS, foundationUnitById } from "./index";

describe("the authored syllabus", () => {
  it("parses, so a broken unit fails here and not on a learner's screen", () => {
    expect(FOUNDATION_UNITS.length).toBeGreaterThan(0);
  });

  it("gives every unit a unique id", () => {
    const ids = FOUNDATION_UNITS.map((unit) => unit.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("names no prerequisite that does not exist", () => {
    const ids = new Set(FOUNDATION_UNITS.map((unit) => unit.id));
    for (const unit of FOUNDATION_UNITS) {
      for (const prerequisite of unit.prerequisites) {
        expect(ids.has(prerequisite)).toBe(true);
      }
    }
  });

  it("finds a unit by id and returns null rather than throwing", () => {
    expect(foundationUnitById("pre-a1-introduce-yourself")?.cefr).toBe("Pre-A1");
    expect(foundationUnitById("nope")).toBeNull();
  });
});

describe("the balance rules the schema enforces", () => {
  const base = foundationUnitById("pre-a1-introduce-yourself");

  it("rejects a unit that is mostly direct study of language items", () => {
    // This is the shape the beginner path already drifted into: words gated,
    // retrieved and spelled, with nothing meaning-focused around it.
    const lopsided = {
      ...base,
      activities: base!.activities.map((activity) => ({
        ...activity,
        strand: "language_focused" as const,
      })),
    };

    const result = foundationUnitSchema.safeParse(lopsided);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain("language-focused");
  });

  it("rejects a unit that teaches a chunk its own input never says", () => {
    const unsaid = {
      ...base,
      targetChunks: [...base!.targetChunks, { text: "see you later", vi: "hẹn gặp lại" }],
    };

    const result = foundationUnitSchema.safeParse(unsaid);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain("never appears");
  });

  it("rejects evidence claimed for language the unit does not teach", () => {
    const overreaching = {
      ...base,
      evidenceCriteria: [
        ...base!.evidenceCriteria,
        { chunk: "how are you", independent: true, changedContext: false, delayed: false },
      ],
    };

    const result = foundationUnitSchema.safeParse(overreaching);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).toContain("does not teach");
  });
});
