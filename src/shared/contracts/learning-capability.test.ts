import { describe, expect, it } from "vitest";

import { learningCapabilityObservationSchema } from "./learning-capability";

const baseObservation = {
  itemKey: "water",
  targetSkill: "listening" as const,
  support: "independent" as const,
  responseMode: "writing" as const,
  verification: "objective" as const,
  outcome: "successful" as const,
  evidenceKind: "beginner_dictation" as const,
  observedAt: "2026-08-23T09:00:00.000Z",
};

describe("learningCapabilityObservationSchema", () => {
  it("keeps measured skill separate from response mode", () => {
    expect(learningCapabilityObservationSchema.parse(baseObservation)).toMatchObject({
      targetSkill: "listening",
      responseMode: "writing",
      verification: "objective",
    });
  });

  it("rejects invented fifth skills", () => {
    expect(
      learningCapabilityObservationSchema.safeParse({
        ...baseObservation,
        targetSkill: "productive",
      }).success,
    ).toBe(false);
  });

  it("prevents self-check evidence from claiming success", () => {
    expect(
      learningCapabilityObservationSchema.safeParse({
        ...baseObservation,
        targetSkill: "writing",
        verification: "self_check",
        outcome: "successful",
        evidenceKind: "lesson_activity",
      }).success,
    ).toBe(false);
  });

  it("allows self-check activity history only as unscored evidence", () => {
    expect(
      learningCapabilityObservationSchema.parse({
        ...baseObservation,
        targetSkill: "writing",
        verification: "self_check",
        outcome: "unscored",
        evidenceKind: "lesson_activity",
      }),
    ).toMatchObject({ verification: "self_check", outcome: "unscored" });
  });
});
