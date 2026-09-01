import { describe, expect, it } from "vitest";
import { foundationUnitById } from "../content";
import { compileUnitActivity } from "./compile-unit-activity";

const unit = foundationUnitById("pre-a1-introduce-yourself")!;

describe("compileUnitActivity", () => {
  it("plays only the lines that say what the activity practises", () => {
    // Playing the whole unit would make every activity the same audio, and the
    // learner would stop listening for anything in particular.
    const result = compileUnitActivity(unit, "recall-ask-name");
    expect(result.kind).toBe("compiled");
    if (result.kind !== "compiled") return;

    expect(result.activity.listen).toEqual(["What's your name?"]);
  });

  it("carries the Vietnamese meaning of every chunk it practises", () => {
    const result = compileUnitActivity(unit, "recall-say-your-name");
    if (result.kind !== "compiled") return;

    expect(result.activity.targets).toEqual([
      { text: "my name is", vi: "tên tôi là" },
    ]);
  });

  it("banks no evidence from an activity where support may stay open", () => {
    // Nothing such an activity observes distinguishes knowing from reading.
    const result = compileUnitActivity(unit, "listen-whole-exchange");
    if (result.kind !== "compiled") return;

    expect(result.activity.supportAllowed).toBe(true);
    expect(result.activity.evidenceKeys).toEqual([]);
  });

  it("banks evidence from a retrieval, which is the point of one", () => {
    const result = compileUnitActivity(unit, "recall-say-your-name");
    if (result.kind !== "compiled") return;

    expect(result.activity.supportAllowed).toBe(false);
    expect(result.activity.evidenceKeys).toEqual(["my name is"]);
  });

  it("names an activity the unit does not have rather than guessing", () => {
    expect(compileUnitActivity(unit, "nope")).toEqual({
      kind: "unknown_activity",
      activityId: "nope",
    });
  });

  it("compiles every activity the authored unit declares", () => {
    // A unit that cannot be compiled is a unit that cannot be taught, and the
    // failure should show here rather than when a learner opens it.
    for (const activity of unit.activities) {
      expect(compileUnitActivity(unit, activity.id).kind).toBe("compiled");
    }
  });
});
