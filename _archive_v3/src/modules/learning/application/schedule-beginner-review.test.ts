import { describe, expect, it } from "vitest";

import { daysUntilDue, isDue } from "./review-scheduler";
import {
  beginnerReviewOutcome,
  scheduleBeginnerReview,
} from "./schedule-beginner-review";

const now = new Date("2026-08-25T09:00:00.000Z");

describe("scheduling a beginner word for review", () => {
  it("schedules a first meeting instead of leaving the word to be forgotten", () => {
    // The defect this fixes: evidence was banked and `next_review_at` stayed
    // null, so the word never entered a queue and never came back.
    const state = scheduleBeginnerReview({
      previous: null,
      successful: true,
      independent: true,
      now,
    });
    expect(new Date(state.due).getTime()).toBeGreaterThan(now.getTime());
  });

  it("brings a missed word back sooner than a clean recall", () => {
    const missed = scheduleBeginnerReview({
      previous: null,
      successful: false,
      independent: false,
      now,
    });
    const clean = scheduleBeginnerReview({
      previous: null,
      successful: true,
      independent: true,
      now,
    });
    expect(new Date(missed.due).getTime()).toBeLessThan(
      new Date(clean.due).getTime(),
    );
  });

  it("treats a word produced only with the text open as harder", () => {
    // Reading it is not remembering it, so it must not earn the same interval.
    const withSupport = scheduleBeginnerReview({
      previous: null,
      successful: true,
      independent: false,
      now,
    });
    const unaided = scheduleBeginnerReview({
      previous: null,
      successful: true,
      independent: true,
      now,
    });
    expect(new Date(withSupport.due).getTime()).toBeLessThan(
      new Date(unaided.due).getTime(),
    );
  });

  it("lengthens the interval as the learner keeps succeeding", () => {
    // This is the whole point of FSRS over a fixed ladder: the same retention
    // for fewer reviews, because an item that keeps coming back correctly is
    // asked for less often.
    let state = scheduleBeginnerReview({
      previous: null,
      successful: true,
      independent: true,
      now,
    });
    let previousGap = daysUntilDue(state, now);
    for (let round = 1; round <= 4; round += 1) {
      const at = new Date(state.due);
      state = scheduleBeginnerReview({
        previous: state,
        successful: true,
        independent: true,
        now: at,
      });
      const gap = daysUntilDue(state, at);
      expect(gap).toBeGreaterThanOrEqual(previousGap);
      previousGap = gap;
    }
    expect(previousGap).toBeGreaterThan(1);
  });

  it("is not due the moment it was scheduled", () => {
    const state = scheduleBeginnerReview({
      previous: null,
      successful: true,
      independent: true,
      now,
    });
    expect(isDue(state, now)).toBe(false);
  });

  it("maps outcomes from what the server checked, not what the learner claims", () => {
    expect(beginnerReviewOutcome({ successful: false, independent: false })).toBe("again");
    expect(beginnerReviewOutcome({ successful: true, independent: false })).toBe("hard");
    expect(beginnerReviewOutcome({ successful: true, independent: true })).toBe("good");
    // An impossible combination must not be read as a clean recall.
    expect(beginnerReviewOutcome({ successful: false, independent: true })).toBe("again");
  });
});
