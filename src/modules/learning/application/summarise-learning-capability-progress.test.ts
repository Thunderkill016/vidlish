import { describe, expect, it } from "vitest";

import {
  learningCapabilityObservationSchema,
  type LearningCapabilityObservation,
} from "@/shared/contracts/learning-capability";

import { summariseLearningCapabilityProgress } from "./summarise-learning-capability-progress";

const observedAt = "2026-08-23T12:00:00.000Z";

function observation(
  overrides: Partial<LearningCapabilityObservation> = {},
): LearningCapabilityObservation {
  return learningCapabilityObservationSchema.parse({
    subject: { kind: "activity", key: "reading_gist" },
    targetSkill: "reading",
    support: "independent",
    responseMode: "selection",
    verification: "objective",
    outcome: "successful",
    evidenceKind: "lesson_activity",
    observedAt,
    ...overrides,
  });
}

describe("summariseLearningCapabilityProgress", () => {
  it("keeps the four skills separate and never promotes response mode into speaking or writing", () => {
    const summary = summariseLearningCapabilityProgress([
      observation({
        targetSkill: "listening",
        responseMode: "writing",
        evidenceKind: "beginner_dictation",
        subject: { kind: "language_item", key: "water" },
      }),
      observation({
        targetSkill: "reading",
        responseMode: "selection",
      }),
    ]);

    expect(summary.skills.map((entry) => entry.skill)).toEqual([
      "listening",
      "reading",
      "speaking",
      "writing",
    ]);
    expect(summary.skills.find((entry) => entry.skill === "listening")).toMatchObject({
      objectiveIndependentSuccesses: 1,
    });
    expect(summary.skills.find((entry) => entry.skill === "speaking")).toMatchObject({
      objectiveIndependentSuccesses: 0,
      objectiveSupportedSuccesses: 0,
      objectiveFailures: 0,
      unscoredObservations: 0,
    });
    expect(summary.skills.find((entry) => entry.skill === "writing")).toMatchObject({
      objectiveIndependentSuccesses: 0,
    });
  });

  it("separates independent success, supported success, objective failure and unscored evidence", () => {
    const summary = summariseLearningCapabilityProgress([
      observation(),
      observation({ support: "supported" }),
      observation({ outcome: "unsuccessful" }),
      observation({
        targetSkill: "writing",
        responseMode: "writing",
        verification: "self_check",
        outcome: "unscored",
      }),
    ]);

    expect(summary.totalObservations).toBe(4);
    expect(summary.skills.find((entry) => entry.skill === "reading")).toMatchObject({
      objectiveIndependentSuccesses: 1,
      objectiveSupportedSuccesses: 1,
      objectiveFailures: 1,
      unscoredObservations: 0,
    });
    expect(summary.skills.find((entry) => entry.skill === "writing")).toMatchObject({
      objectiveIndependentSuccesses: 0,
      objectiveSupportedSuccesses: 0,
      objectiveFailures: 0,
      unscoredObservations: 1,
    });
  });

  it("reports the latest observation without converting evidence events into a mastery score", () => {
    const summary = summariseLearningCapabilityProgress([
      observation({ observedAt: "2026-08-21T12:00:00.000Z" }),
      observation({ observedAt: "2026-08-23T12:00:00.000Z" }),
    ]);

    expect(summary.skills.find((entry) => entry.skill === "reading")?.latestObservedAt).toBe(
      "2026-08-23T12:00:00.000Z",
    );
    expect(summary).not.toHaveProperty("score");
    expect(summary).not.toHaveProperty("mastery");
  });
});
