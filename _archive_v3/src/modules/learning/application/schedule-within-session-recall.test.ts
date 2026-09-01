import { describe, expect, it } from "vitest";
import {
  scheduleWithinSessionRecall,
  WITHIN_SESSION_GRADUATION,
} from "./schedule-within-session-recall";

const item = (over: Partial<Parameters<typeof scheduleWithinSessionRecall>[0]["items"][number]> = {}) => ({
  key: "water",
  lastStep: 0,
  successes: 0,
  ...over,
});

describe("scheduleWithinSessionRecall", () => {
  it("introduces new material while nothing is due", () => {
    expect(
      scheduleWithinSessionRecall({
        items: [item({ lastStep: 3 })],
        step: 4,
        newMaterialRemains: true,
      }),
    ).toEqual({ kind: "introduce_new" });
  });

  it("brings an item back once other material has come between", () => {
    expect(
      scheduleWithinSessionRecall({
        items: [item({ lastStep: 0 })],
        step: 2,
        newMaterialRemains: true,
      }),
    ).toEqual({ kind: "recall", itemKey: "water", overdueBy: 0 });
  });

  it("widens the gap after each success", () => {
    // Two steps was enough before the first success; five is needed after it.
    const afterFirst = scheduleWithinSessionRecall({
      items: [item({ lastStep: 0, successes: 1 })],
      step: 2,
      newMaterialRemains: true,
    });
    expect(afterFirst).toEqual({ kind: "introduce_new" });

    expect(
      scheduleWithinSessionRecall({
        items: [item({ lastStep: 0, successes: 1 })],
        step: 5,
        newMaterialRemains: true,
      }),
    ).toEqual({ kind: "recall", itemKey: "water", overdueBy: 0 });
  });

  it("contracts the gap after a miss instead of widening it", () => {
    // Expanding retrieval only helps when the retrievals succeed. Widening the
    // gap after a failure just schedules a second failure.
    expect(
      scheduleWithinSessionRecall({
        items: [item({ lastStep: 0, successes: 2, lastAttemptFailed: true })],
        step: 2,
        newMaterialRemains: true,
      }),
    ).toEqual({ kind: "recall", itemKey: "water", overdueBy: 0 });
  });

  it("prefers a due recall over introducing new material", () => {
    // Otherwise a session can end with items introduced and never retrieved,
    // which is the whole failure this exists to prevent.
    expect(
      scheduleWithinSessionRecall({
        items: [item({ lastStep: 0 })],
        step: 9,
        newMaterialRemains: true,
      }),
    ).toEqual({ kind: "recall", itemKey: "water", overdueBy: 7 });
  });

  it("serves the most overdue item first", () => {
    const action = scheduleWithinSessionRecall({
      items: [item({ key: "cat", lastStep: 6 }), item({ key: "water", lastStep: 1 })],
      step: 9,
      newMaterialRemains: false,
    });

    expect(action).toEqual({ kind: "recall", itemKey: "water", overdueBy: 6 });
  });

  it("breaks a tie by which item was seen longest ago", () => {
    // Without this the order depends on array position, so the session would
    // depend on how the caller happened to build its list.
    const items = [item({ key: "cat", lastStep: 4 }), item({ key: "water", lastStep: 4 })];
    const forwards = scheduleWithinSessionRecall({ items, step: 6, newMaterialRemains: false });
    const backwards = scheduleWithinSessionRecall({
      items: [...items].reverse(),
      step: 6,
      newMaterialRemains: false,
    });

    expect(forwards).toEqual(backwards);
  });

  it("graduates an item after three successes rather than spending another slot", () => {
    expect(WITHIN_SESSION_GRADUATION).toBe(3);
    expect(
      scheduleWithinSessionRecall({
        items: [item({ lastStep: 0, successes: 3 })],
        step: 99,
        newMaterialRemains: false,
      }),
    ).toEqual({ kind: "session_complete" });
  });

  it("still owes a recall to an item that failed on its third attempt", () => {
    expect(
      scheduleWithinSessionRecall({
        items: [item({ lastStep: 0, successes: 3, lastAttemptFailed: true })],
        step: 2,
        newMaterialRemains: false,
      }),
    ).toEqual({ kind: "recall", itemKey: "water", overdueBy: 0 });
  });

  it("serves an item early rather than ending with it never retrieved", () => {
    const action = scheduleWithinSessionRecall({
      items: [item({ lastStep: 5 })],
      step: 6,
      newMaterialRemains: false,
    });

    // Negative overdueBy says the gap was short, so the caller can record it
    // instead of discovering it later.
    expect(action).toEqual({ kind: "recall", itemKey: "water", overdueBy: -1 });
  });

  it("completes when every item has graduated", () => {
    expect(
      scheduleWithinSessionRecall({
        items: [item({ successes: 3 }), item({ key: "cat", successes: 4 })],
        step: 40,
        newMaterialRemains: false,
      }),
    ).toEqual({ kind: "session_complete" });
  });
});
