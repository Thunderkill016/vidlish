import { describe, expect, it } from "vitest";

import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import type {
  PrivacySafeActivityAttempt,
  PrivacySafeLearningSupportEvent,
} from "@/shared/contracts/privacy-safe-learning-evidence";

import { projectLessonActivityCapabilityEvidence } from "./summarise-capability-evidence";

const sessionId = "11111111-1111-4111-8111-111111111111";

function chunkBlueprint(hintVi: string | null = null): LessonBlueprintV2 {
  return {
    targetItems: [{ id: "target_water", itemKey: "water" }],
    activities: [
      {
        id: "recall_water",
        activityType: "chunk_recall",
        targetItemId: "target_water",
        hintVi,
      },
    ],
  } as unknown as LessonBlueprintV2;
}

function guidedTransferBlueprint(): LessonBlueprintV2 {
  return {
    targetItems: [
      { id: "target_water", itemKey: "water" },
      { id: "target_please", itemKey: "please" },
    ],
    activities: [
      {
        id: "transfer_water",
        activityType: "guided_transfer",
        targetItemIds: ["target_water", "target_please"],
      },
    ],
  } as unknown as LessonBlueprintV2;
}

function attempt(input: {
  activityId?: string;
  kind?: "text" | "self_check" | "choice";
  verdict?: "correct" | "incorrect" | "self_check" | "unscored";
  submittedAt?: string;
} = {}): PrivacySafeActivityAttempt {
  const kind = input.kind ?? "text";
  return {
    id: "22222222-2222-4222-8222-222222222222",
    sessionId,
    activityId: input.activityId ?? "recall_water",
    attemptNumber: 1,
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    responseEvidence:
      kind === "text"
        ? { kind: "text", submitted: true, characterCount: 5 }
        : kind === "self_check"
          ? {
              kind: "self_check",
              submitted: true,
              characterCount: 20,
              checkedCriteria: [0, 1],
            }
          : { kind: "choice", optionId: "option_one" },
    evaluation: { verdict: input.verdict ?? "correct" },
    submittedAt: input.submittedAt ?? "2026-08-23T09:00:00.000Z",
  } as unknown as PrivacySafeActivityAttempt;
}

function supportEvent(occurredAt: string): PrivacySafeLearningSupportEvent {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sessionId,
    activityId: "recall_water",
    idempotencyKey: "55555555-5555-4555-8555-555555555555",
    eventKind: "support_opened",
    supportStep: "keyword_hint",
    playbackOrdinal: null,
    occurredAt,
  };
}

describe("projectLessonActivityCapabilityEvidence", () => {
  it("projects an objectively correct typed recall as writing success", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: chunkBlueprint(),
        attempt: attempt(),
        supportEvents: [],
      }),
    ).toEqual([
      {
        itemKey: "water",
        targetSkill: "writing",
        support: "independent",
        responseMode: "writing",
        verification: "objective",
        outcome: "successful",
        evidenceKind: "lesson_activity",
        observedAt: "2026-08-23T09:00:00.000Z",
      },
    ]);
  });

  it("keeps objectively incorrect typed recall as unsuccessful evidence", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: chunkBlueprint(),
        attempt: attempt({ verdict: "incorrect" }),
        supportEvents: [],
      })[0],
    ).toMatchObject({
      targetSkill: "writing",
      verification: "objective",
      outcome: "unsuccessful",
    });
  });

  it("marks an activity with an immutable hint conservatively as supported", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: chunkBlueprint("Nhớ cụm đã nghe."),
        attempt: attempt(),
        supportEvents: [],
      })[0]?.support,
    ).toBe("supported");
  });

  it("uses only server support opened before the attempt", () => {
    const before = supportEvent("2026-08-23T08:59:00.000Z");
    const after = supportEvent("2026-08-23T09:01:00.000Z");

    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: chunkBlueprint(),
        attempt: attempt(),
        supportEvents: [before],
      })[0]?.support,
    ).toBe("supported");

    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: chunkBlueprint(),
        attempt: attempt(),
        supportEvents: [after],
      })[0]?.support,
    ).toBe("independent");
  });

  it("records guided transfer as writing self-check history, never success", () => {
    const observations = projectLessonActivityCapabilityEvidence({
      blueprint: guidedTransferBlueprint(),
      attempt: attempt({
        activityId: "transfer_water",
        kind: "self_check",
        verdict: "self_check",
      }),
      supportEvents: [],
    });

    expect(observations.map((observation) => observation.itemKey)).toEqual([
      "water",
      "please",
    ]);
    expect(observations).toEqual(
      observations.map((observation) => ({
        ...observation,
        targetSkill: "writing",
        responseMode: "writing",
        verification: "self_check",
        outcome: "unscored",
      })),
    );
  });

  it("does not guess a skill for current choice activities", () => {
    const blueprint = {
      targetItems: [],
      activities: [{ id: "gist_one", activityType: "gist_choice" }],
    } as unknown as LessonBlueprintV2;

    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint,
        attempt: attempt({ activityId: "gist_one", kind: "choice" }),
        supportEvents: [],
      }),
    ).toEqual([]);
  });
});
