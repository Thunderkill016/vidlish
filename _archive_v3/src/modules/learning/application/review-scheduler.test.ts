import { describe, expect, it } from "vitest";

import {
  buildTodayQueue,
  daysUntilDue,
  DEFAULT_NEW_ITEMS_PER_DAY,
  isDue,
  recordReview,
  startReview,
  type ReviewItem,
} from "./review-scheduler";

const NOW = new Date("2026-08-19T09:00:00.000Z");
const later = (days: number) =>
  new Date(NOW.getTime() + days * 86_400_000);

describe("recordReview", () => {
  it("schedules a forgotten item sooner than a recalled one", () => {
    // The whole point of grading: the interval has to respond to it.
    const start = startReview(NOW);
    const forgotten = recordReview(start, "again", NOW);
    const recalled = recordReview(start, "good", NOW);
    expect(new Date(forgotten.due).getTime()).toBeLessThan(
      new Date(recalled.due).getTime(),
    );
  });

  it("orders the four outcomes from soonest to latest", () => {
    const start = startReview(NOW);
    const dues = (["again", "hard", "good", "easy"] as const).map((outcome) =>
      new Date(recordReview(start, outcome, NOW).due).getTime(),
    );
    expect(dues).toEqual([...dues].sort((a, b) => a - b));
    // "easy" must be strictly further out than "good", or keeping the fourth
    // outcome buys nothing over the v2 design's three.
    expect(dues[3]).toBeGreaterThan(dues[2]!);
  });

  it("stretches the interval as an item is repeatedly recalled", () => {
    // Spacing means each success buys more time. If intervals stayed flat the
    // learner would review a known item forever.
    let state = startReview(NOW);
    const gaps: number[] = [];
    let clock = NOW;
    for (let i = 0; i < 4; i += 1) {
      const next = recordReview(state, "good", clock);
      gaps.push(new Date(next.due).getTime() - clock.getTime());
      clock = new Date(next.due);
      state = next;
    }
    expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
    expect(gaps[3]).toBeGreaterThan(gaps[0]!);
  });

  it("counts a lapse when a recalled item is later forgotten", () => {
    let state = recordReview(startReview(NOW), "good", NOW);
    state = recordReview(state, "good", later(3));
    const lapsed = recordReview(state, "again", later(10));
    expect(lapsed.lapses).toBeGreaterThan(state.lapses);
  });

  it("accepts an item with no prior state", () => {
    // A learner can meet an item and answer it in the same session; forcing the
    // caller to persist it first would just be bookkeeping.
    const state = recordReview(null, "good", NOW);
    expect(state.reps).toBe(1);
  });

  it("round-trips through JSON without drift", () => {
    // This is what a repository stores, so it must survive serialisation.
    const state = recordReview(startReview(NOW), "hard", NOW);
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("is deterministic — same inputs, same schedule", () => {
    // Fuzz is disabled on purpose. Without this, the same review would land on
    // different days per call and nothing here would be testable.
    const a = recordReview(startReview(NOW), "good", NOW);
    const b = recordReview(startReview(NOW), "good", NOW);
    expect(a).toEqual(b);
  });
});

describe("isDue", () => {
  it("treats an unseen item as not due", () => {
    // Unseen is not overdue — new material is rationed by the daily cap, not
    // pulled in by the review queue.
    expect(isDue(null, NOW)).toBe(false);
  });

  it("becomes due once the scheduled moment passes", () => {
    const state = recordReview(startReview(NOW), "good", NOW);
    expect(isDue(state, NOW)).toBe(false);
    expect(isDue(state, later(365))).toBe(true);
  });
});

describe("buildTodayQueue", () => {
  const unseen = (n: number): ReviewItem[] =>
    Array.from({ length: n }, (_, i) => ({ itemKey: `new-${i}`, review: null }));

  it("caps new items at the daily intake", () => {
    // Past roughly 7–10 a day the learner builds a review debt they won't repay.
    const queue = buildTodayQueue(unseen(50), NOW);
    expect(queue.fresh).toHaveLength(DEFAULT_NEW_ITEMS_PER_DAY);
  });

  it("never caps due reviews", () => {
    // Trimming these would defer exactly the items closest to being forgotten —
    // the one thing spaced repetition exists to prevent.
    const overdue = Array.from({ length: 40 }, (_, i) => ({
      itemKey: `old-${i}`,
      review: recordReview(startReview(NOW), "good", NOW),
    }));
    const queue = buildTodayQueue(overdue, later(365));
    expect(queue.due).toHaveLength(40);
    expect(queue.deferred).toHaveLength(0);
  });

  it("puts the most overdue item first", () => {
    const items: ReviewItem[] = [
      { itemKey: "recent", review: recordReview(startReview(later(5)), "good", later(5)) },
      { itemKey: "stale", review: recordReview(startReview(NOW), "again", NOW) },
    ];
    const queue = buildTodayQueue(items, later(400));
    expect(queue.due[0]).toBe("stale");
  });

  it("keeps reviewing and introducing in the same session", () => {
    const items: ReviewItem[] = [
      { itemKey: "old", review: recordReview(startReview(NOW), "good", NOW) },
      ...unseen(3),
    ];
    const queue = buildTodayQueue(items, later(365), 2);
    expect(queue.due).toEqual(["old"]);
    expect(queue.fresh).toEqual(["new-0", "new-1"]);
  });

  it("introduces nothing when the cap is zero", () => {
    // A review-only day: clear the backlog without adding to it.
    expect(buildTodayQueue(unseen(5), NOW, 0).fresh).toEqual([]);
  });
});

describe("daysUntilDue", () => {
  it("reports the wait in whole days", () => {
    const state = recordReview(startReview(NOW), "good", NOW);
    expect(daysUntilDue(state, NOW)).toBeGreaterThan(0);
  });

  it("goes negative once an item is overdue", () => {
    const state = recordReview(startReview(NOW), "good", NOW);
    expect(daysUntilDue(state, later(365))).toBeLessThan(0);
  });
});
