import { describe, expect, it } from "vitest";
import { foundationUnitById } from "../content";
import { reachableActivities } from "./reachable-activities";

const unit = foundationUnitById("pre-a1-introduce-yourself")!;

describe("reachableActivities", () => {
  it("offers nothing to a learner who knows no words at all", () => {
    // "my name is" is three unknown words arriving together. The i+1 rule does
    // not stop applying because the language came from a syllabus.
    expect(reachableActivities(unit, new Set())).toEqual([]);
  });

  it("still offers nothing when only one word of a chunk is known", () => {
    expect(reachableActivities(unit, new Set(["my"]))).toEqual([]);
  });

  it("opens an activity once its chunk is one word away", () => {
    const known = new Set(["my", "name"]);
    const ids = reachableActivities(unit, known).map((activity) => activity.id);

    expect(ids).toContain("recall-say-your-name");
    // The activity that also practises "what's your name" is still out of reach.
    expect(ids).not.toContain("use-meet-someone");
  });

  it("opens the whole unit once every chunk is within reach", () => {
    const known = new Set([
      "my",
      "name",
      "is",
      "what's",
      "your",
      "nice",
      "to",
      "meet",
      "you",
      "i'm",
    ]);

    expect(reachableActivities(unit, known)).toHaveLength(
      unit.activities.length,
    );
  });
});
