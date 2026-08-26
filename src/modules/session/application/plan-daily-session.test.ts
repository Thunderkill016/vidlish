import { describe, expect, it } from "vitest";

import { SESSION_MINUTES, hasWork, planDailySession } from "./plan-daily-session";

const full = {
  wordsDue: 12,
  paragraphsAvailable: 8,
  sentencesAvailable: 20,
  chunksAvailable: 6,
};

describe("planning the thirty minutes the learner actually has", () => {
  it("runs review, then reading, then building — in that order", () => {
    // Review first because it is the part with a deadline. Building last
    // because it works on what the first two just supplied.
    expect(planDailySession(full).steps.map((step) => step.kind)).toEqual([
      "review",
      "read",
      "build",
      "chunk",
    ]);
  });

  it("fits inside the budget the learner gave", () => {
    // Thirty minutes is the figure he named. A session needing forty is a
    // session that gets abandoned.
    expect(planDailySession(full).minutes).toBeLessThanOrEqual(SESSION_MINUTES);
  });

  it("never lets a review backlog eat the whole session", () => {
    // A learner who only ever clears a queue never meets anything new.
    const huge = planDailySession({ ...full, wordsDue: 500 });
    expect(huge.steps.map((step) => step.kind)).toContain("read");
    expect(huge.minutes).toBeLessThanOrEqual(SESSION_MINUTES);
  });

  it("drops a step that has nothing in it rather than showing an empty one", () => {
    const noReview = planDailySession({ ...full, wordsDue: 0 });
    expect(noReview.steps.map((step) => step.kind)).toEqual([
      "read",
      "build",
      "chunk",
    ]);

    const readingOnly = planDailySession({
      wordsDue: 0,
      paragraphsAvailable: 4,
      sentencesAvailable: 0,
      chunksAvailable: 0,
    });
    expect(readingOnly.steps.map((step) => step.kind)).toEqual(["read"]);
  });

  it("separates nothing-to-do from could-not-work-it-out", () => {
    // Only one of those is good news, and the learner deserves to know which.
    const empty = planDailySession({
      wordsDue: 0,
      paragraphsAvailable: 0,
      sentencesAvailable: 0,
      chunksAvailable: 0,
    });
    expect(empty.steps).toEqual([]);
    expect(hasWork(empty)).toBe(false);
    expect(hasWork(planDailySession(full))).toBe(true);
  });

  it("tells the learner why each step is there, in Vietnamese", () => {
    for (const step of planDailySession(full).steps) {
      expect(step.reasonVi.length).toBeGreaterThan(40);
      expect(step.items).toBeGreaterThan(0);
      expect(step.minutes).toBeGreaterThan(0);
    }
  });
});
