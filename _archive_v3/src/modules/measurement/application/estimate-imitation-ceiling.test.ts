import { describe, expect, it } from "vitest";

import {
  MINIMUM_ATTEMPTS,
  estimateImitationCeiling,
  type ScoredImitation,
} from "./estimate-imitation-ceiling";

function attempts(pairs: readonly [number, number][]): ScoredImitation[] {
  return pairs.map(([syllables, errors]) => ({ syllables, errors }));
}

/** Ten clean passes at short lengths, to pad a case up to the minimum. */
const shortPasses = attempts(
  Array.from({ length: 10 }, () => [7, 0] as [number, number]),
);

describe("estimateImitationCeiling", () => {
  it("refuses to report on too few attempts", () => {
    // A band built on four items moves more on one misheard word than on a
    // month of learning, so it would be a number that looks like progress.
    const result = estimateImitationCeiling(attempts([[7, 0], [8, 0], [9, 1], [10, 3]]));
    expect(result).toEqual({
      kind: "not_enough_attempts",
      attempted: 4,
      needed: MINIMUM_ATTEMPTS,
    });
  });

  it("bounds the ceiling by the longest held and the shortest broken", () => {
    const result = estimateImitationCeiling([
      ...shortPasses,
      ...attempts([[10, 0], [12, 4], [14, 6]]),
    ]);
    expect(result).toMatchObject({ kind: "measured", heldTo: 10, brokeAt: 12 });
  });

  it("keeps the band wide when passes and failures interleave", () => {
    // This is what a real ceiling looks like: they hold a fourteen and miss a
    // twelve. Collapsing that to one number would invent precision the
    // attempt does not contain.
    const result = estimateImitationCeiling([
      ...shortPasses,
      ...attempts([[12, 3], [14, 0]]),
    ]);
    expect(result).toMatchObject({ kind: "measured", heldTo: 14, brokeAt: 12 });
  });

  it("credits one slip as reproduced and two as not", () => {
    const oneSlip = estimateImitationCeiling([...shortPasses, ...attempts([[16, 1]])]);
    expect(oneSlip).toMatchObject({ heldTo: 16 });

    const twoSlips = estimateImitationCeiling([...shortPasses, ...attempts([[16, 2]])]);
    expect(twoSlips).toMatchObject({ heldTo: 7, brokeAt: 16 });
  });

  it("says the bank ran out rather than crediting its ceiling to the learner", () => {
    // Passing everything means the instrument stopped measuring, not that the
    // learner stopped at eighteen syllables.
    const result = estimateImitationCeiling([
      ...shortPasses,
      ...attempts([[18, 0]]),
    ]);
    expect(result).toMatchObject({ kind: "measured", heldTo: 18, aboveBank: true });
  });

  it("does not claim a ceiling inside the bank when nothing was reproduced", () => {
    // Failing every item means the ceiling is below the bank's shortest
    // sentence, and the report must not imply they held seven syllables.
    const result = estimateImitationCeiling(
      attempts(Array.from({ length: 10 }, () => [7, 5] as [number, number])),
    );
    expect(result).toMatchObject({ kind: "measured", heldTo: 6, brokeAt: 7, passed: 0 });
  });
});
