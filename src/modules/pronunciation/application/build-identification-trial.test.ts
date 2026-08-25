import { describe, expect, it } from "vitest";

import { CONTRASTS, TRAINING_VOICES } from "../content/minimal-pairs";
import { buildIdentificationTrial, nextContrast } from "./build-identification-trial";

/** Cycles through fixed values so a trial can be pinned down exactly. */
function seeded(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length]!;
}

describe("building one identification trial", () => {
  it("always plays one of the two words it offers", () => {
    for (const contrast of CONTRASTS) {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const trial = buildIdentificationTrial({ contrastId: contrast.id });
        expect(trial.options).toContain(trial.spoken);
        expect(TRAINING_VOICES).toContain(trial.voice as (typeof TRAINING_VOICES)[number]);
      }
    }
  });

  it("offers two words from the same pair, never two unrelated words", () => {
    // Options drawn from different pairs would differ in more than the trained
    // sound, and the learner could answer from the other difference.
    for (const contrast of CONTRASTS) {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const trial = buildIdentificationTrial({ contrastId: contrast.id });
        const isRealPair = contrast.pairs.some(
          (pair) => pair.a === trial.options[0] && pair.b === trial.options[1],
        );
        expect(isRealPair).toBe(true);
      }
    }
  });

  it("plays each side of the pair, rather than always the first word", () => {
    // A trial that always speaks option one is answerable without listening.
    const spoken = new Set<string>();
    for (let attempt = 0; attempt < 200; attempt += 1) {
      spoken.add(buildIdentificationTrial({ contrastId: "initial_aspiration_p_b" }).spoken);
    }
    const pairs = CONTRASTS.find((c) => c.id === "initial_aspiration_p_b")!.pairs;
    expect(spoken.has(pairs[0]!.a)).toBe(true);
    expect(spoken.has(pairs[0]!.b)).toBe(true);
  });

  it("varies the voice, because one voice teaches one voice", () => {
    const voices = new Set<string>();
    for (let attempt = 0; attempt < 200; attempt += 1) {
      voices.add(buildIdentificationTrial({ contrastId: "final_s_th" }).voice);
    }
    expect(voices.size).toBeGreaterThanOrEqual(3);
  });

  it("is reproducible when the randomness is", () => {
    const first = buildIdentificationTrial({
      contrastId: "final_voicing_t_d",
      random: seeded([0.1, 0.9, 0.4]),
    });
    const second = buildIdentificationTrial({
      contrastId: "final_voicing_t_d",
      random: seeded([0.1, 0.9, 0.4]),
    });
    expect(first).toEqual(second);
  });

  it("refuses an unknown contrast rather than picking one", () => {
    // @ts-expect-error — the guard exists for ids arriving from outside TypeScript.
    expect(() => buildIdentificationTrial({ contrastId: "nope" })).toThrow(/Unknown/);
  });
});

describe("choosing what to work on next", () => {
  it("starts with a contrast the learner has never tried", () => {
    const chosen = nextContrast({});
    expect(CONTRASTS.map((c) => c.id)).toContain(chosen.id);
  });

  it("goes to the weakest contrast, not the first one", () => {
    const record: Record<string, { correct: number; total: number }> = {};
    for (const contrast of CONTRASTS) record[contrast.id] = { correct: 10, total: 10 };
    record.final_s_th = { correct: 3, total: 10 };
    expect(nextContrast(record).id).toBe("final_s_th");
  });

  it("prefers an untried contrast over one the learner is failing", () => {
    // Drilling a known weakness is useful; discovering an unknown one is more
    // useful, and costs one trial to find out.
    const record: Record<string, { correct: number; total: number }> = {};
    for (const contrast of CONTRASTS) record[contrast.id] = { correct: 0, total: 10 };
    delete record.final_s_z;
    expect(nextContrast(record).id).toBe("final_s_z");
  });
});
