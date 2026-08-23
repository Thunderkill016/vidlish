import { describe, expect, it } from "vitest";

import { learningCapabilityObservationSchema } from "./learning-capability";

describe("learningCapabilityObservationSchema", () => {
  it("keeps measured skill separate from response mode", () => {
    expect(
      learningCapabilityObservationSchema.parse({
        itemKey: "water",
        targetSkill: "listening",
        support: "independent",
        responseMode: "writing",
        outcome: "successful",
        evidenceKind: "beginner_dictation",
        observedAt: "2026-08-23T09:00:00.000Z",
      }),
    ).toMatchObject({
      targetSkill: "listening",
      responseMode: "writing",
    });
  });

  it("rejects invented fifth skills", () => {
    const result = learningCapabilityObservationSchema.safeParse({
      itemKey: "water",
      targetSkill: "productive",
      support: "independent",
      responseMode: "self_report",
      outcome: "successful",
      evidenceKind: "beginner_dictation",
      observedAt: "2026-08-23T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
