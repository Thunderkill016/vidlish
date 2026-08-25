import { describe, expect, it } from "vitest";

import {
  MEASURED_SHADOWING_STAGE,
  SHADOWING_STAGES,
  nextShadowingStage,
  shadowingStage,
} from "./shadowing-stages";

describe("the staged shadowing progression", () => {
  it("runs the seven stages in one unbroken order", () => {
    expect(SHADOWING_STAGES.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(SHADOWING_STAGES.map((stage) => stage.id)).size).toBe(7);
    expect(nextShadowingStage("check_details")).toBeNull();
    expect(nextShadowingStage("listening")?.id).toBe("parallel_reading");
  });

  it("measures exactly one stage, and it is the one with no script", () => {
    const measured = SHADOWING_STAGES.filter((stage) => stage.isMeasured);
    expect(measured).toHaveLength(1);
    expect(measured[0]?.id).toBe(MEASURED_SHADOWING_STAGE);

    // Shadowing was compared head to head against reading along with a script
    // and beat it. Banking evidence from a scripted stage would record the
    // losing technique under the winning technique's name.
    expect(measured[0]?.showsScript).toBe(false);
    expect(measured[0]?.playsAudio).toBe(true);
  });

  it("keeps the comprehension scaffolds the low-proficiency evidence requires", () => {
    // Mu & Wasuntarasophit call these two steps essential for learners with
    // limited English. Dropping either turns the progression back into the
    // unstaged version that does not work at this level.
    const ids = SHADOWING_STAGES.map((stage) => stage.id);
    expect(ids).toContain("check_understanding");
    expect(ids).toContain("check_details");

    // Meaning is confirmed before the learner is asked to shadow unscripted.
    const understanding = shadowingStage("check_understanding");
    const unscripted = shadowingStage(MEASURED_SHADOWING_STAGE);
    expect(understanding.order).toBeLessThan(unscripted.order);
  });

  it("starts wordless and only later asks for accuracy", () => {
    expect(shadowingStage("listening").showsScript).toBe(false);
    expect(shadowingStage("mumbling").repetitions).toBe(2);
    // Mumbling precedes every stage that asks the learner to get it right.
    expect(shadowingStage("mumbling").order).toBeLessThan(
      shadowingStage("synchronized_reading").order,
    );
  });

  it("refuses an unknown stage instead of returning nothing", () => {
    // @ts-expect-error — the guard exists for data arriving from outside TypeScript.
    expect(() => shadowingStage("freestyle")).toThrow(/Unknown shadowing stage/);
  });
});
