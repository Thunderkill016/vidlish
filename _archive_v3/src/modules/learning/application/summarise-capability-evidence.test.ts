import { describe, expect, it } from "vitest";

import { summariseCapabilityEvidence } from "./summarise-capability-evidence";

import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

function item(
  itemKey: string,
  overrides: Partial<LearningReviewItemState> = {},
): LearningReviewItemState {
  return {
    ownerUserId: "11111111-1111-4111-8111-111111111111",
    itemKey,
    sourceLessonVersionId: "22222222-2222-4222-8222-222222222222",
    exposureCount: 1,
    attemptCount: 1,
    successfulRetrievals: 0,
    lastOutcome: null,
    lastSeenAt: "2026-08-21T00:00:00+00:00",
    nextReviewAt: null,
    lastDelayedTransferAt: null,
    lastIndependentAt: null,
    transferAttemptedAt: null,
    transferSucceededAt: null,
    reviewState: null,
    ...overrides,
  };
}

describe("summariseCapabilityEvidence", () => {
  it("separates produced-unaided from produced-with-help", () => {
    const evidence = summariseCapabilityEvidence([
      item("unaided", {
        successfulRetrievals: 2,
        lastIndependentAt: "2026-08-21T00:00:00+00:00",
      }),
      item("helped", { successfulRetrievals: 2 }),
    ]);

    expect(evidence.independent.map((i) => i.itemKey)).toEqual(["unaided"]);
    expect(evidence.supported.map((i) => i.itemKey)).toEqual(["helped"]);
  });

  it("does not call a met item a produced one", () => {
    // Meeting a phrase in a lesson is not producing it. Counting exposure as
    // capability is the thing this summary exists to refuse.
    const evidence = summariseCapabilityEvidence([item("met")]);

    expect(evidence.encountered.map((i) => i.itemKey)).toEqual(["met"]);
    expect(evidence.independent).toEqual([]);
    expect(evidence.supported).toEqual([]);
  });

  it("requires both unaided production and changed-context reuse for transfer", () => {
    // Reuse after a supported retrieval is a weaker claim than reuse after an
    // unaided one; collapsing them lets the stronger label be earned the weaker
    // way.
    const evidence = summariseCapabilityEvidence([
      item("both", {
        successfulRetrievals: 1,
        lastIndependentAt: "2026-08-21T00:00:00+00:00",
        transferSucceededAt: "2026-08-21T01:00:00+00:00",
      }),
      item("reuse-only", {
        successfulRetrievals: 1,
        transferSucceededAt: "2026-08-21T01:00:00+00:00",
      }),
    ]);

    expect(evidence.transferred.map((i) => i.itemKey)).toEqual(["both"]);
  });

  it("puts every item in exactly one production bucket", () => {
    // The three production buckets are a partition. An item missing from all of
    // them, or counted twice, would make the totals on screen wrong.
    const items = [
      item("a"),
      item("b", { successfulRetrievals: 1 }),
      item("c", {
        successfulRetrievals: 1,
        lastIndependentAt: "2026-08-21T00:00:00+00:00",
      }),
    ];
    const evidence = summariseCapabilityEvidence(items);
    const bucketed = [
      ...evidence.independent,
      ...evidence.supported,
      ...evidence.encountered,
    ];

    expect(bucketed.length).toBe(items.length);
    expect(new Set(bucketed.map((i) => i.itemKey)).size).toBe(items.length);
  });
});
