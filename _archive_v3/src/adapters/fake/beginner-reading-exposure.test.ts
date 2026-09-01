import { describe, expect, it } from "vitest";

import { InMemoryBeginnerProgressRepository } from "./in-memory-beginner-progress-repository";

const OWNER = "11111111-1111-4111-8111-111111111111";
const SCHEDULE = { reviewState: { due: "2026-09-01T00:00:00.000Z" }, nextReviewAt: "2026-09-01T00:00:00.000Z" };

describe("putting a word met while reading onto the calendar", () => {
  it("refuses to schedule a word that has no row, exactly as production does", async () => {
    // Production's `scheduleReview` is an UPDATE against a row the evidence
    // function created. A word tapped while reading has no evidence behind it,
    // so the update matched nothing and the write was lost — while the page
    // said it had saved. The fake used to accept anything, which is why the
    // whole test suite stayed green through it.
    const repository = new InMemoryBeginnerProgressRepository();
    await repository.scheduleReview({ ownerUserId: OWNER, itemKey: "instructions", ...SCHEDULE });

    expect(
      await repository.reviewSchedule({ ownerUserId: OWNER, itemKey: "instructions" }),
    ).toBeNull();
  });

  it("records the encounter and schedules it", async () => {
    const repository = new InMemoryBeginnerProgressRepository();
    await repository.recordReadingExposure({
      ownerUserId: OWNER,
      itemKey: "Instructions",
      ...SCHEDULE,
    });

    const scheduled = await repository.reviewSchedule({
      ownerUserId: OWNER,
      itemKey: "instructions",
    });
    expect(scheduled?.nextReviewAt).toBe(SCHEDULE.nextReviewAt);
    expect(repository.exposureCount(OWNER, "instructions")).toBe(1);
  });

  it("counts a second encounter without scheduling a second item", async () => {
    const repository = new InMemoryBeginnerProgressRepository();
    for (let time = 0; time < 3; time += 1) {
      await repository.recordReadingExposure({
        ownerUserId: OWNER,
        itemKey: "program",
        ...SCHEDULE,
      });
    }
    expect(repository.exposureCount(OWNER, "program")).toBe(3);
  });

  it("never lets meeting a word make it a known word", async () => {
    // `learner_known_words` counts only rows where `last_independent_at` is
    // set. Meeting a word in a text proves the learner saw it, and this product
    // does not let seeing become knowing anywhere else either.
    const repository = new InMemoryBeginnerProgressRepository();
    await repository.recordReadingExposure({
      ownerUserId: OWNER,
      itemKey: "difficult",
      ...SCHEDULE,
    });
    expect(await repository.knownWords(OWNER)).toEqual([]);
  });
});
