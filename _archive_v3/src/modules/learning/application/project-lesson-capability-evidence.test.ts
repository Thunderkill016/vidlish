import { describe, expect, it } from "vitest";

import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import type {
  PrivacySafeActivityAttempt,
  PrivacySafeLearningSupportEvent,
} from "@/shared/contracts/privacy-safe-learning-evidence";

import { projectLessonActivityCapabilityEvidence } from "./summarise-capability-evidence";

const sessionId = "11111111-1111-4111-8111-111111111111";
const readingSegmentId = `seg_${"a".repeat(32)}`;
const listeningSegmentId = `seg_${"b".repeat(32)}`;

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

function readingBlueprint(hasCanonicalContext = true): LessonBlueprintV2 {
  return {
    evidenceCatalog: hasCanonicalContext
      ? [
          {
            origin: "source_quote",
            segmentId: readingSegmentId,
            startMs: 1_000,
            endMs: 2_000,
            text: "I'm a member of the Developer Relations team.",
          },
        ]
      : [],
    targetItems: [{ id: "target_member", itemKey: "a-member-of" }],
    activities: [
      {
        id: "meaning_member",
        activityType: "meaning_in_context",
        targetItemId: "target_member",
        evidence: [
          {
            sourceSegmentIds: [readingSegmentId],
            startMs: 1_000,
            endMs: 2_000,
            captionPolicy: "toggle",
            replayAllowed: true,
          },
        ],
      },
    ],
  } as unknown as LessonBlueprintV2;
}

function passageBlueprint(overlapsEarlierListen = false): LessonBlueprintV2 {
  const earlierSegment = overlapsEarlierListen
    ? readingSegmentId
    : listeningSegmentId;
  return {
    evidenceCatalog: [
      {
        origin: "source_quote",
        segmentId: readingSegmentId,
        startMs: 10_000,
        endMs: 14_000,
        text: "The speaker explains how teams can ask for more time politely.",
      },
      {
        origin: "source_quote",
        segmentId: listeningSegmentId,
        startMs: 1_000,
        endMs: 5_000,
        text: "First the speaker introduces the topic of asking for help at work.",
      },
    ],
    targetItems: [],
    activities: [
      {
        id: "gist_listening",
        activityType: "gist_choice",
        evidence: [
          {
            sourceSegmentIds: [earlierSegment],
            startMs: 1_000,
            endMs: 5_000,
            captionPolicy: "hidden_first",
            replayAllowed: true,
          },
        ],
      },
      {
        id: "gist_reading",
        activityType: "gist_choice",
        evidence: [
          {
            sourceSegmentIds: [readingSegmentId],
            startMs: 10_000,
            endMs: 14_000,
            captionPolicy: "shown",
            replayAllowed: true,
          },
        ],
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

function supportEvent(
  occurredAt: string,
  activityId = "recall_water",
): PrivacySafeLearningSupportEvent {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    sessionId,
    activityId,
    idempotencyKey: "55555555-5555-4555-8555-555555555555",
    eventKind: "support_opened",
    supportStep: "keyword_hint",
    playbackOrdinal: null,
    occurredAt,
  };
}

describe("projectLessonActivityCapabilityEvidence", () => {
  it("projects objectively checked canonical-context meaning as lexical reading evidence", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: readingBlueprint(),
        attempt: attempt({ activityId: "meaning_member", kind: "choice" }),
        supportEvents: [],
      }),
    ).toEqual([
      {
        subject: { kind: "activity", key: "meaning_member" },
        targetSkill: "reading",
        support: "independent",
        responseMode: "selection",
        verification: "objective",
        outcome: "successful",
        evidenceKind: "lesson_activity",
        observedAt: "2026-08-23T09:00:00.000Z",
      },
    ]);
  });

  it("keeps lexical reading unsuccessful and support-aware without changing its modality", () => {
    const observations = projectLessonActivityCapabilityEvidence({
      blueprint: readingBlueprint(),
      attempt: attempt({
        activityId: "meaning_member",
        kind: "choice",
        verdict: "incorrect",
      }),
      supportEvents: [
        supportEvent("2026-08-23T08:59:00.000Z", "meaning_member"),
      ],
    });

    expect(observations[0]).toMatchObject({
      targetSkill: "reading",
      support: "supported",
      verification: "objective",
      outcome: "unsuccessful",
    });
  });

  it("refuses to claim reading when the canonical context cannot be resolved", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: readingBlueprint(false),
        attempt: attempt({ activityId: "meaning_member", kind: "choice" }),
        supportEvents: [],
      }),
    ).toEqual([]);
  });

  it("projects a shown unseen passage gist as independent objective reading", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: passageBlueprint(false),
        attempt: attempt({ activityId: "gist_reading", kind: "choice" }),
        supportEvents: [],
      })[0],
    ).toMatchObject({
      subject: { kind: "activity", key: "gist_reading" },
      targetSkill: "reading",
      support: "independent",
      responseMode: "selection",
      verification: "objective",
      outcome: "successful",
    });
  });

  it("downgrades passage reading to supported when the same source was heard earlier", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: passageBlueprint(true),
        attempt: attempt({ activityId: "gist_reading", kind: "choice" }),
        supportEvents: [],
      })[0]?.support,
    ).toBe("supported");
  });

  it("projects an objectively correct typed recall as item-scoped writing success", () => {
    expect(
      projectLessonActivityCapabilityEvidence({
        blueprint: chunkBlueprint(),
        attempt: attempt(),
        supportEvents: [],
      }),
    ).toEqual([
      {
        subject: { kind: "language_item", key: "water" },
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
      subject: { kind: "language_item", key: "water" },
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

  it("records multi-item guided transfer once at activity scope, never as item mastery", () => {
    const observations = projectLessonActivityCapabilityEvidence({
      blueprint: guidedTransferBlueprint(),
      attempt: attempt({
        activityId: "transfer_water",
        kind: "self_check",
        verdict: "self_check",
      }),
      supportEvents: [],
    });

    expect(observations).toEqual([
      {
        subject: { kind: "activity", key: "transfer_water" },
        targetSkill: "writing",
        support: "independent",
        responseMode: "writing",
        verification: "self_check",
        outcome: "unscored",
        evidenceKind: "lesson_activity",
        observedAt: "2026-08-23T09:00:00.000Z",
      },
    ]);
  });

  it("does not guess a skill for the listening gist choice", () => {
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
