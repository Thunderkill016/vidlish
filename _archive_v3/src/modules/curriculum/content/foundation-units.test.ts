import { describe, expect, it } from "vitest";
import { foundationUnitSchema } from "@/shared/contracts/curriculum";
import { FOUNDATION_UNITS, chunkMeaningVi, foundationUnitById } from "./index";

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

describe("the syllabus as a whole", () => {
  it("has exactly one unit that can be started from nothing", () => {
    // More than one entry point means the product has to choose arbitrarily on
    // day one; none means the syllabus can never begin.
    const roots = FOUNDATION_UNITS.filter(
      (unit) => unit.prerequisites.length === 0,
    );
    expect(roots).toHaveLength(1);
  });

  it("never teaches the same chunk in two units", () => {
    // Two units teaching one chunk split its evidence, so neither can ever be
    // satisfied and the learner is taught it twice.
    const seen = new Map<string, string>();
    for (const unit of FOUNDATION_UNITS) {
      for (const chunk of unit.targetChunks) {
        const owner = seen.get(chunk.text);
        expect(owner ?? unit.id).toBe(unit.id);
        seen.set(chunk.text, unit.id);
      }
    }
  });

  it("can be walked from the first unit to the last", () => {
    // Follows the prerequisite graph. A unit nothing reaches is a unit the
    // learner can never be offered, however good it is.
    const byId = new Map(FOUNDATION_UNITS.map((unit) => [unit.id, unit]));
    const reached = new Set<string>();
    let changed = true;
    while (changed) {
      changed = false;
      for (const unit of FOUNDATION_UNITS) {
        if (reached.has(unit.id)) continue;
        if (unit.prerequisites.every((id) => reached.has(id))) {
          reached.add(unit.id);
          changed = true;
        }
      }
    }

    expect(reached.size).toBe(byId.size);
  });

  it("claims evidence only for language the learner was asked to produce", () => {
    // A criterion on a chunk that no unsupported activity practises could never
    // be met, and the unit would never finish.
    for (const unit of FOUNDATION_UNITS) {
      const produced = new Set(
        unit.activities
          .filter((activity) => !activity.supportAllowed)
          .flatMap((activity) => activity.targets),
      );
      for (const criterion of unit.evidenceCriteria) {
        expect(produced.has(criterion.chunk)).toBe(true);
      }
    }
  });
});

describe("the four skills are taught, not just labelled", () => {
  it("exercises every skill somewhere in the syllabus", () => {
    // Reading was declared in the schema from the first day and had zero
    // activities. A skill nothing practises is a column in a table, not part
    // of a course.
    const skills = new Set(
      FOUNDATION_UNITS.flatMap((unit) =>
        unit.activities.map((activity) => activity.skill),
      ),
    );
    expect([...skills].sort()).toEqual([
      "listening",
      "reading",
      "speaking",
      "writing",
    ]);
  });

  it("grades at least one activity in each skill", () => {
    // An activity that allows support banks nothing, so a skill present only
    // in support-allowed activities is still never measured.
    for (const skill of ["listening", "speaking", "reading", "writing"] as const) {
      const graded = FOUNDATION_UNITS.flatMap((unit) =>
        unit.activities.filter(
          (activity) => activity.skill === skill && !activity.supportAllowed,
        ),
      );
      expect(graded.length, `no graded ${skill} activity`).toBeGreaterThan(0);
    }
  });

  it("gives every graded reading activity a single chunk with an authored meaning", () => {
    // Reading is marked by choosing a meaning, and the server grades against
    // the first evidence key. More than one target would mean the learner sees
    // several sentences and is graded on one of them without being told which.
    for (const unit of FOUNDATION_UNITS) {
      for (const activity of unit.activities) {
        if (activity.skill !== "reading" || activity.supportAllowed) continue;
        expect(activity.targets, `${activity.id} targets`).toHaveLength(1);
        expect(chunkMeaningVi(activity.targets[0])).not.toBeNull();
      }
    }
  });
});
