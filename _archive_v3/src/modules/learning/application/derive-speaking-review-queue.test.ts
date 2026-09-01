import { describe, expect, it } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { deriveSpeakingReviewQueue } from "./derive-speaking-review-queue";

const VERSION_ID = "11111111-1111-4111-8111-111111111111";
const DUE_SESSION = "22222222-2222-4222-8222-222222222222";
const UPCOMING_SESSION = "33333333-3333-4333-8333-333333333333";

function queue(attempts: Array<{ sessionId: string; activityId: string }> = []) {
  return deriveSpeakingReviewQueue({
    sessions: [
      {
        id: DUE_SESSION,
        lessonVersionId: VERSION_ID,
        completedAt: "2026-08-22T00:00:00.000Z",
      },
      {
        id: UPCOMING_SESSION,
        lessonVersionId: VERSION_ID,
        completedAt: "2026-08-24T00:00:00.000Z",
      },
    ],
    blueprintsByVersion: new Map([
      [VERSION_ID, createGoldenSessionLearningBlueprint()],
    ]),
    attempts,
    now: new Date("2026-08-24T02:00:00.000Z"),
  });
}

describe("deriveSpeakingReviewQueue", () => {
  it("derives one due session and the next upcoming session from completion plus 24 hours", () => {
    expect(queue()).toEqual({
      due: [
        {
          sessionId: DUE_SESSION,
          activityId: "activity_transfer",
          dueAt: "2026-08-23T00:00:00.000Z",
        },
      ],
      upcoming: {
        sessionId: UPCOMING_SESSION,
        activityId: "activity_transfer",
        dueAt: "2026-08-25T00:00:00.000Z",
      },
    });
  });

  it("removes a session once that exact speaking activity already has any receipt", () => {
    const result = queue([
      { sessionId: DUE_SESSION, activityId: "activity_transfer" },
    ]);

    expect(result.due).toEqual([]);
    expect(result.upcoming?.sessionId).toBe(UPCOMING_SESSION);
  });

  it("does not suppress a delayed speaking opportunity because another activity has evidence", () => {
    expect(
      queue([{ sessionId: DUE_SESSION, activityId: "activity_unrelated" }]).due,
    ).toHaveLength(1);
  });

  it("fails closed on a missing or invalid immutable blueprint", () => {
    const result = deriveSpeakingReviewQueue({
      sessions: [
        {
          id: DUE_SESSION,
          lessonVersionId: VERSION_ID,
          completedAt: "2026-08-22T00:00:00.000Z",
        },
      ],
      blueprintsByVersion: new Map([[VERSION_ID, { broken: true }]]),
      attempts: [],
      now: new Date("2026-08-24T02:00:00.000Z"),
    });

    expect(result).toEqual({ due: [], upcoming: null });
  });
});
