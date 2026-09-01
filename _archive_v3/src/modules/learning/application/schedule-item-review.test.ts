import { describe, expect, it } from "vitest";

import { recordReview } from "./review-scheduler";
import {
  outcomeFromEvaluation,
  REVIEW_STATE_VERSION,
  scheduleItemReviews,
} from "./schedule-item-review";

import type { ActivityEvaluation } from "@/shared/contracts/lesson-v2";

const NOW = new Date("2026-08-19T09:00:00.000Z");

function evaluation(
  verdict: ActivityEvaluation["verdict"],
): ActivityEvaluation {
  const shared = {
    goalVi: "mục tiêu của hoạt động",
    evidenceVi: "bằng chứng từ nguồn",
    nextStepVi: "bước tiếp theo",
    evidenceRefs: [],
  };
  if (verdict === "self_check") {
    return { ...shared, verdict, checkedCriteria: [0] };
  }
  return { ...shared, verdict } as ActivityEvaluation;
}

describe("outcomeFromEvaluation", () => {
  it("reads a correct answer as a successful recall", () => {
    expect(outcomeFromEvaluation(evaluation("correct"))).toBe("good");
  });

  it("reads an incorrect answer as a lapse", () => {
    expect(outcomeFromEvaluation(evaluation("incorrect"))).toBe("again");
  });

  it("refuses to grade a self-check as recall", () => {
    // The learner marking their own work is feedback, not a measurement of
    // memory; scheduling on it would move a due date on the strength of a click.
    expect(outcomeFromEvaluation(evaluation("self_check"))).toBeNull();
  });

  it("refuses to grade an unscored activity", () => {
    expect(outcomeFromEvaluation(evaluation("unscored"))).toBeNull();
  });
});

describe("scheduleItemReviews", () => {
  const base = {
    priorStates: new Map<string, null>(),
    now: NOW,
  };

  it("schedules every item the activity practised", () => {
    const updates = scheduleItemReviews({
      ...base,
      itemKeys: ["a-member-of", "explore"],
      evaluation: evaluation("correct"),
    });
    expect(updates.map((update) => update.itemKey)).toEqual([
      "a-member-of",
      "explore",
    ]);
    expect(updates.every((update) => update.successful)).toBe(true);
  });

  it("schedules nothing when the verdict is not recall evidence", () => {
    expect(
      scheduleItemReviews({
        ...base,
        itemKeys: ["a-member-of"],
        evaluation: evaluation("self_check"),
      }),
    ).toEqual([]);
  });

  it("grades a repeated item once", () => {
    // Applying the same answer twice would hand the item double the interval it
    // earned.
    const updates = scheduleItemReviews({
      ...base,
      itemKeys: ["explore", "explore"],
      evaluation: evaluation("correct"),
    });
    expect(updates).toHaveLength(1);
  });

  it("continues an item's existing schedule instead of restarting it", () => {
    // Losing the prior state would reset the learner's history on every review,
    // and an item would never earn a long interval.
    const prior = recordReview(null, "good", new Date("2026-08-12T09:00:00Z"));
    const [update] = scheduleItemReviews({
      ...base,
      itemKeys: ["explore"],
      evaluation: evaluation("correct"),
      priorStates: new Map([["explore", prior]]),
    });
    expect(update!.reviewState.reps).toBe(prior.reps + 1);
  });

  it("marks a wrong answer as unsuccessful and brings it back sooner", () => {
    const [wrong] = scheduleItemReviews({
      ...base,
      itemKeys: ["explore"],
      evaluation: evaluation("incorrect"),
    });
    const [right] = scheduleItemReviews({
      ...base,
      itemKeys: ["explore"],
      evaluation: evaluation("correct"),
    });
    expect(wrong!.successful).toBe(false);
    expect(Date.parse(wrong!.nextReviewAt)).toBeLessThan(
      Date.parse(right!.nextReviewAt),
    );
  });

  it("stamps the version the database checks for", () => {
    // The database rejects a state without it, so an unstamped write would fail
    // at the boundary rather than here.
    const [update] = scheduleItemReviews({
      ...base,
      itemKeys: ["explore"],
      evaluation: evaluation("correct"),
    });
    expect(update!.reviewState.version).toBe(REVIEW_STATE_VERSION);
    expect(update!.nextReviewAt).toBe(update!.reviewState.due);
  });
});
