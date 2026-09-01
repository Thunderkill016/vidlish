import { describe, expect, it } from "vitest";

import { evaluateGoldenSessionUsabilityStudy } from "@/modules/learning/application/evaluate-golden-session-usability";
import {
  goldenSessionUsabilityStudySchema,
  type GoldenSessionRecognitionLevel,
  type GoldenSessionUsabilityParticipant,
  type GoldenSessionUsabilityStudy,
} from "@/shared/contracts/golden-session-usability";

const sessionIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
] as const;

type ParticipantOptions = {
  index: number;
  completed?: boolean;
  elapsedSeconds?: number | null;
  completedWithoutModeratorInstruction?: boolean;
  lessonGoalRestated?: boolean;
  transferAttemptCount?: number;
  beforeTargetRecognition?: GoldenSessionRecognitionLevel;
  afterTargetRecognition?: GoldenSessionRecognitionLevel;
  blocked?: boolean;
  blockKind?:
    | "player"
    | "support"
    | "feedback"
    | "retry"
    | "transfer"
    | "navigation"
    | "other_flow"
    | null;
  severeDefectKind?:
    | "grounding"
    | "answer_exposure"
    | "misleading_mastery"
    | null;
};

function participant({
  index,
  completed = true,
  elapsedSeconds = 330,
  completedWithoutModeratorInstruction = true,
  lessonGoalRestated = true,
  transferAttemptCount = 1,
  beforeTargetRecognition = "not_recognized",
  afterTargetRecognition = "recognized",
  blocked = false,
  blockKind = null,
  severeDefectKind = null,
}: ParticipantOptions): GoldenSessionUsabilityParticipant {
  const sessionId = sessionIds[index];
  if (!sessionId) throw new Error("Test participant index is out of range.");

  return {
    measurement: {
      sessionId,
      status: completed ? "completed" : "in_progress",
      sessionViewed: true,
      completed,
      observedElapsedSeconds: elapsedSeconds,
      lastKnownActivityId: completed ? "exit_ticket" : "guided_transfer",
      incompleteAtLastKnownActivity: completed ? null : "guided_transfer",
      firstSource: {
        activityId: "source_listen",
        playStarted: true,
        playCompleted: true,
        replayed: false,
      },
      gist: {
        activityId: "gist_choice",
        attemptCount: 1,
        latestVerdict: "correct",
        correctCount: 1,
      },
      targetNotice: {
        activityId: "meaning_notice",
        attempted: true,
      },
      correction: {
        incorrectAttemptCount: 0,
        shownCount: 0,
      },
      retrieval: {
        activityId: "chunk_recall",
        attemptCount: 1,
        latestVerdict: "correct",
        correctCount: 1,
      },
      transfer: {
        activityId: "guided_transfer",
        attemptCount: transferAttemptCount,
        latestVerdict: transferAttemptCount > 0 ? "self_check" : null,
        correctCount: 0,
      },
      afterListen: {
        activityId: "exit_ticket",
        attemptCount: 1,
        latestVerdict: "unscored",
        correctCount: 0,
      },
      supportByActivity: [],
      totalSupportStepsOpened: 0,
      runtimeErrors: [],
    },
    observation: {
      participantCode: `p${index + 1}`,
      platform: index % 2 === 0 ? "mobile" : "desktop",
      completedWithoutModeratorInstruction,
      lessonGoalRestated,
      beforeTargetRecognition,
      afterTargetRecognition,
      blocked,
      blockKind,
      severeDefectKind,
    },
  };
}

function study(
  participants: GoldenSessionUsabilityParticipant[],
): GoldenSessionUsabilityStudy {
  return { participants } as GoldenSessionUsabilityStudy;
}

describe("evaluateGoldenSessionUsabilityStudy", () => {
  it("passes only when every predeclared five-person threshold passes", () => {
    const input = study([
      participant({ index: 0, elapsedSeconds: 240 }),
      participant({ index: 1, elapsedSeconds: 300 }),
      participant({ index: 2, elapsedSeconds: 360 }),
      participant({
        index: 3,
        elapsedSeconds: 480,
        beforeTargetRecognition: "recognized",
        afterTargetRecognition: "recognized",
      }),
      participant({
        index: 4,
        elapsedSeconds: 520,
        lessonGoalRestated: false,
        beforeTargetRecognition: "partial",
        afterTargetRecognition: "partial",
      }),
    ]);

    const result = evaluateGoldenSessionUsabilityStudy(input);

    expect(result.passed).toBe(true);
    expect(result.thresholds.completedWithoutModeratorInstruction.observed).toBe(
      5,
    );
    expect(result.thresholds.lessonGoalRestated.observed).toBe(4);
    expect(result.thresholds.changedContextTransferAttempted.observed).toBe(5);
    expect(result.thresholds.blockedParticipants.observed).toBe(0);
    expect(result.thresholds.severeDefects.observed).toBe(0);
    expect(result.thresholds.medianSessionTime.medianSeconds).toBe(360);
    expect(result.thresholds.targetRecognitionImproved.observed).toBe(3);
  });

  it("fails independent thresholds instead of hiding them behind one score", () => {
    const input = study([
      participant({ index: 0, elapsedSeconds: 600 }),
      participant({ index: 1, elapsedSeconds: 620 }),
      participant({ index: 2, elapsedSeconds: 640 }),
      participant({
        index: 3,
        completed: false,
        completedWithoutModeratorInstruction: true,
        lessonGoalRestated: false,
        transferAttemptCount: 0,
        beforeTargetRecognition: "recognized",
        afterTargetRecognition: "recognized",
        elapsedSeconds: 660,
        blocked: true,
        blockKind: "retry",
      }),
      participant({
        index: 4,
        completed: false,
        completedWithoutModeratorInstruction: true,
        lessonGoalRestated: false,
        transferAttemptCount: 0,
        beforeTargetRecognition: "recognized",
        afterTargetRecognition: "recognized",
        elapsedSeconds: 680,
        severeDefectKind: "answer_exposure",
      }),
    ]);

    const result = evaluateGoldenSessionUsabilityStudy(input);

    expect(result.passed).toBe(false);
    expect(result.thresholds.completedWithoutModeratorInstruction.observed).toBe(
      3,
    );
    expect(result.thresholds.lessonGoalRestated.observed).toBe(3);
    expect(result.thresholds.changedContextTransferAttempted.observed).toBe(3);
    expect(result.thresholds.blockedParticipants.observed).toBe(1);
    expect(result.thresholds.severeDefects.observed).toBe(1);
    expect(result.thresholds.medianSessionTime.medianSeconds).toBe(640);
    expect(result.thresholds.targetRecognitionImproved.observed).toBe(3);
    expect(result.thresholds.medianSessionTime.passed).toBe(false);
  });

  it("does not turn an unscored after-listen attempt into recognition gain", () => {
    const input = study(
      sessionIds.map((_, index) =>
        participant({
          index,
          beforeTargetRecognition: "recognized",
          afterTargetRecognition: "recognized",
        }),
      ),
    );

    const result = evaluateGoldenSessionUsabilityStudy(input);

    expect(input.participants.every((entry) => entry.measurement.afterListen.attemptCount === 1)).toBe(true);
    expect(input.participants.every((entry) => entry.measurement.afterListen.latestVerdict === "unscored")).toBe(true);
    expect(result.thresholds.targetRecognitionImproved.observed).toBe(0);
    expect(result.thresholds.targetRecognitionImproved.passed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it("fails the time threshold closed when any participant lacks durable timing", () => {
    const input = study([
      participant({ index: 0, elapsedSeconds: 300 }),
      participant({ index: 1, elapsedSeconds: 320 }),
      participant({ index: 2, elapsedSeconds: null }),
      participant({ index: 3, elapsedSeconds: 340 }),
      participant({ index: 4, elapsedSeconds: 360 }),
    ]);

    const result = evaluateGoldenSessionUsabilityStudy(input);

    expect(result.thresholds.medianSessionTime).toEqual({
      passed: false,
      medianSeconds: null,
      missingEvidenceCount: 1,
      minimumSeconds: 240,
      maximumSeconds: 480,
    });
    expect(result.passed).toBe(false);
  });
});

describe("goldenSessionUsabilityStudySchema", () => {
  it("rejects duplicate participant codes and duplicate session IDs", () => {
    const duplicated = participant({ index: 0 });
    const input = {
      participants: [
        duplicated,
        duplicated,
        participant({ index: 2 }),
        participant({ index: 3 }),
        participant({ index: 4 }),
      ],
    };

    const result = goldenSessionUsabilityStudySchema.safeParse(input);

    expect(result.success).toBe(false);
  });

  it("accepts privacy-safe capability evidence in a full measurement response", () => {
    const participants = sessionIds.map((_, index) => participant({ index }));
    participants[0]!.measurement.capabilityObservations = [
      {
        subject: { kind: "activity", key: "meaning_notice" },
        targetSkill: "reading",
        support: "independent",
        responseMode: "selection",
        verification: "objective",
        outcome: "successful",
        evidenceKind: "lesson_activity",
        observedAt: "2026-08-22T08:00:00+00:00",
      },
    ];

    const result = goldenSessionUsabilityStudySchema.safeParse({ participants });

    expect(result.success).toBe(true);
  });

  it("rejects arbitrary moderator notes instead of accepting free-form study data", () => {
    const input = study(sessionIds.map((_, index) => participant({ index }))) as GoldenSessionUsabilityStudy & {
      participants: Array<
        GoldenSessionUsabilityParticipant & {
          observation: GoldenSessionUsabilityParticipant["observation"] & {
            notes?: string;
          };
        }
      >;
    };
    input.participants[0]!.observation.notes = "raw learner answer";

    const result = goldenSessionUsabilityStudySchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});
