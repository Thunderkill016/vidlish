import { describe, expect, it } from "vitest";

import { learningCapabilityObservationSchema } from "./learning-capability";

const baseObservation = {
  subject: { kind: "language_item" as const, key: "water" },
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

  it("supports activity-scoped evidence without pretending it belongs to a language item", () => {
    expect(
      learningCapabilityObservationSchema.parse({
        ...baseObservation,
        subject: { kind: "activity", key: "reading_focus_one" },
        targetSkill: "reading",
        responseMode: "selection",
        evidenceKind: "lesson_activity",
      }).subject,
    ).toEqual({ kind: "activity", key: "reading_focus_one" });
  });

  it("rejects malformed activity subjects", () => {
    expect(
      learningCapabilityObservationSchema.safeParse({
        ...baseObservation,
        subject: { kind: "activity", key: "Bad Activity ID" },
      }).success,
    ).toBe(false);
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
        subject: { kind: "activity", key: "transfer_water" },
        targetSkill: "writing",
        verification: "self_check",
        outcome: "unscored",
        evidenceKind: "lesson_activity",
      }),
    ).toMatchObject({ verification: "self_check", outcome: "unscored" });
  });
});
