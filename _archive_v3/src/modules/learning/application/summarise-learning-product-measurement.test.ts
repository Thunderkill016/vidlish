import { describe, expect, it } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { summariseLearningProductMeasurement } from "@/modules/learning/application/summarise-learning-product-measurement";
import {
  lessonSessionSchema,
  type ActivityEvaluation,
} from "@/shared/contracts/lesson-v2";
import { privacySafeLearningProductEventSchema } from "@/shared/contracts/learning-product-events";
import { privacySafeActivityAttemptSchema } from "@/shared/contracts/privacy-safe-learning-evidence";

const blueprint = createGoldenSessionLearningBlueprint();
const ownerUserId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";

function evaluation(verdict: "correct" | "incorrect"): ActivityEvaluation {
  return {
    verdict,
    goalVi: "Kiểm tra một mục tiêu học cụ thể trong Golden Session.",
    evidenceVi: "Bằng chứng được giới hạn ở kết quả đánh giá đã lưu.",
    nextStepVi: "Tiếp tục theo runtime policy hiện tại.",
    evidenceRefs: [],
  };
}

function attempt(
  activityId: string,
  attemptNumber: number,
  verdict: "correct" | "incorrect",
  id: string,
) {
  return privacySafeActivityAttemptSchema.parse({
    id,
    sessionId,
    activityId,
    attemptNumber,
    idempotencyKey: id,
    responseEvidence: { kind: "text", submitted: true, characterCount: 12 },
    evaluation: evaluation(verdict),
    submittedAt: "2026-08-22T08:00:00+00:00",
  });
}

const session = lessonSessionSchema.parse({
  id: sessionId,
  ownerUserId,
  lessonVersionId: "33333333-3333-4333-8333-333333333333",
  status: "in_progress",
  currentPhase: "retrieve",
  currentActivityId: "activity_recall",
  startedAt: "2026-08-22T07:55:00+00:00",
  completedAt: null,
  updatedAt: "2026-08-22T08:00:00+00:00",
});

describe("summariseLearningProductMeasurement", () => {
  it("keeps playback-start and confirmed completion as distinct facts", () => {
    const withoutCompletion = summariseLearningProductMeasurement(blueprint, {
      session,
      attempts: [],
      progress: [
        {
          activityId: "activity_gist",
          playbackCount: 1,
          attemptCount: 0,
          openedSupportSteps: [],
        },
      ],
      productEvents: [],
    });
    expect(withoutCompletion.firstSource).toMatchObject({
      playStarted: true,
      playCompleted: false,
      replayed: false,
    });

    const completedEvent = privacySafeLearningProductEventSchema.parse({
      id: "44444444-4444-4444-8444-444444444444",
      sessionId,
      activityId: "activity_gist",
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
      eventKind: "source_play_completed",
      detailKind: null,
      occurredAt: "2026-08-22T07:56:00+00:00",
    });
    const withCompletion = summariseLearningProductMeasurement(blueprint, {
      session,
      attempts: [],
      progress: [
        {
          activityId: "activity_gist",
          playbackCount: 1,
          attemptCount: 0,
          openedSupportSteps: [],
        },
      ],
      productEvents: [completedEvent],
    });
    expect(withCompletion.firstSource.playCompleted).toBe(true);
  });

  it("derives correction, retrieval and incomplete state without raw responses", () => {
    const incorrectRecall = attempt(
      "activity_recall",
      1,
      "incorrect",
      "66666666-6666-4666-8666-666666666666",
    );
    const correction = privacySafeLearningProductEventSchema.parse({
      id: "77777777-7777-4777-8777-777777777777",
      sessionId,
      activityId: "activity_recall",
      idempotencyKey: incorrectRecall.id,
      eventKind: "correction_shown",
      detailKind: null,
      occurredAt: "2026-08-22T08:00:01+00:00",
    });

    const summary = summariseLearningProductMeasurement(blueprint, {
      session,
      attempts: [incorrectRecall],
      progress: [],
      productEvents: [correction],
    });

    expect(summary.incompleteAtLastKnownActivity).toBe("activity_recall");
    expect(summary.correction).toEqual({
      incorrectAttemptCount: 1,
      shownCount: 1,
    });
    expect(summary.retrieval).toMatchObject({
      activityId: "activity_recall",
      attemptCount: 1,
      latestVerdict: "incorrect",
      correctCount: 0,
    });
    expect(JSON.stringify(summary)).not.toContain("characterCount");
    expect(JSON.stringify(summary)).not.toContain("responseEvidence");
  });
});
