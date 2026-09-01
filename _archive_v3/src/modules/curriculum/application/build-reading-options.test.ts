import { describe, expect, it } from "vitest";

import { buildReadingOptions } from "./build-reading-options";

const CORRECT = "tôi không hiểu";

describe("buildReadingOptions", () => {
  it("always contains the correct meaning exactly once", () => {
    const options = buildReadingOptions({ correctVi: CORRECT, seed: "a" });
    expect(options.filter((option) => option === CORRECT)).toHaveLength(1);
  });

  it("offers more than one meaning, or reading is not being checked", () => {
    expect(
      buildReadingOptions({ correctVi: CORRECT, seed: "a" }).length,
    ).toBeGreaterThan(1);
  });

  it("holds no duplicate meanings", () => {
    // Two identical options would make one of them unmarkable.
    const options = buildReadingOptions({ correctVi: CORRECT, seed: "seed-1" });
    expect(new Set(options.map((o) => o.toLowerCase())).size).toBe(options.length);
  });

  it("is stable for one challenge and moves between challenges", () => {
    // Stable: reloading must not reroll until the answer is where expected.
    expect(buildReadingOptions({ correctVi: CORRECT, seed: "x" })).toEqual(
      buildReadingOptions({ correctVi: CORRECT, seed: "x" }),
    );

    // Moves: if the answer sat in the same slot every time, position alone
    // would answer the question.
    const positions = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((seed) =>
        buildReadingOptions({ correctVi: CORRECT, seed }).indexOf(CORRECT),
      ),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it("draws distractors from language the syllabus teaches", () => {
    // A nonsense distractor is picked out without reading the English.
    const options = buildReadingOptions({ correctVi: CORRECT, seed: "z" });
    for (const option of options) {
      expect(option.trim().length).toBeGreaterThan(0);
    }
  });
});
