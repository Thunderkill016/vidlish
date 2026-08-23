import { describe, expect, it } from "vitest";

import type { BeginnerWordEvidence } from "@/modules/learning/ports/beginner-progress-repository";

import { projectBeginnerCapabilityEvidence } from "./summarise-capability-evidence";

function evidence(
  overrides: Partial<BeginnerWordEvidence> = {},
): BeginnerWordEvidence {
  return {
    word: "water",
    successfulRetrievals: 0,
    lastIndependentAt: null,
    successfulDictations: 0,
    lastSuccessfulDictationAt: null,
    lastIndependentDictationAt: null,
    ...overrides,
  };
}

describe("projectBeginnerCapabilityEvidence", () => {
  it("projects independent dictation as listening evidence answered in writing", () => {
    const projection = projectBeginnerCapabilityEvidence(
      evidence({
        successfulDictations: 2,
        lastSuccessfulDictationAt: "2026-08-23T09:00:00.000Z",
        lastIndependentDictationAt: "2026-08-23T09:00:00.000Z",
      }),
    );

    expect(projection.observations).toEqual([
      {
        itemKey: "water",
        targetSkill: "listening",
        support: "independent",
        responseMode: "writing",
        outcome: "successful",
        evidenceKind: "beginner_dictation",
        observedAt: "2026-08-23T09:00:00.000Z",
      },
    ]);
  });

  it("keeps successful supported dictation below independent evidence", () => {
    const projection = projectBeginnerCapabilityEvidence(
      evidence({
        successfulDictations: 1,
        lastSuccessfulDictationAt: "2026-08-23T09:00:00.000Z",
      }),
    );

    expect(projection.observations[0]).toMatchObject({
      targetSkill: "listening",
      support: "supported",
      responseMode: "writing",
    });
  });

  it("does not turn a written dictation response into writing capability", () => {
    const projection = projectBeginnerCapabilityEvidence(
      evidence({
        successfulDictations: 1,
        lastSuccessfulDictationAt: "2026-08-23T09:00:00.000Z",
        lastIndependentDictationAt: "2026-08-23T09:00:00.000Z",
      }),
    );

    expect(
      projection.observations.some(
        (observation) => observation.targetSkill === "writing",
      ),
    ).toBe(false);
  });

  it("refuses to guess speaking or writing from legacy productive evidence", () => {
    const projection = projectBeginnerCapabilityEvidence(
      evidence({
        successfulRetrievals: 3,
        lastIndependentAt: "2026-08-23T09:00:00.000Z",
      }),
    );

    expect(projection.observations).toEqual([]);
    expect(projection.unclassifiedProductiveRetrievals).toBe(3);
  });

  it("fails closed when aggregate dictation evidence lacks a trustworthy timestamp", () => {
    const projection = projectBeginnerCapabilityEvidence(
      evidence({ successfulDictations: 1 }),
    );

    expect(projection.observations).toEqual([]);
  });
});
