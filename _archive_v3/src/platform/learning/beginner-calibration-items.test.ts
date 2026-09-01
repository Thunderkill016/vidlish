import { describe, expect, it } from "vitest";

import {
  answersMatchCalibrationItems,
  beginnerCalibrationItemsForKnown,
} from "./beginner-calibration-items";

const KNOWN = ["a", "be", "cat", "dog", "go", "home", "I"];

function answers(items: readonly string[]) {
  return items.map((item) => ({ item, claimedKnown: false }));
}

describe("beginner calibration item authority", () => {
  it("rebuilds the same bounded item set for the same learner state", () => {
    const first = beginnerCalibrationItemsForKnown(KNOWN);
    const second = beginnerCalibrationItemsForKnown(KNOWN);

    expect(first).toEqual(second);
    expect(first).toHaveLength(10);
    expect(new Set(first).size).toBe(10);
  });

  it("accepts the exact set even when answer order changes", () => {
    const items = beginnerCalibrationItemsForKnown(KNOWN);
    expect(answersMatchCalibrationItems(items, answers([...items].reverse()))).toBe(
      true,
    );
  });

  it("rejects a missing item", () => {
    const items = beginnerCalibrationItemsForKnown(KNOWN);
    expect(answersMatchCalibrationItems(items, answers(items.slice(1)))).toBe(
      false,
    );
  });

  it("rejects a substituted item", () => {
    const items = beginnerCalibrationItemsForKnown(KNOWN);
    const changed = [...items];
    changed[0] = "made-up-easy-item";

    expect(answersMatchCalibrationItems(items, answers(changed))).toBe(false);
  });

  it("rejects a duplicate used to replace another trial", () => {
    const items = beginnerCalibrationItemsForKnown(KNOWN);
    const changed = [...items];
    changed[0] = changed[1];

    expect(answersMatchCalibrationItems(items, answers(changed))).toBe(false);
  });
});
