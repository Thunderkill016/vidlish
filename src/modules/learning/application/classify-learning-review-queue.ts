import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

export type ClassifiedLearningReviewQueue = {
  supported: LearningReviewItemState[];
  due: LearningReviewItemState[];
  upcoming: LearningReviewItemState | null;
};

/**
 * Splits a learner's scheduled items into what is reviewable now and later.
 *
 * `supportsItemKey` answers one question: can a review task actually be built
 * for this item? It is async because the honest answer needs the lesson that
 * taught the item, and the callers used to sidestep that by asking a fixture
 * that knew a single hard-coded key — so every item a learner's own video
 * produced was silently filtered out of their own queue while the review API
 * could have built it. Resolved in parallel: the queue is one screen, not a
 * sequence of round trips.
 */
export async function classifyLearningReviewQueue(
  items: LearningReviewItemState[],
  supportsItemKey: (itemKey: string) => Promise<boolean> | boolean,
  nowMs = Date.now(),
): Promise<ClassifiedLearningReviewQueue> {
  const decisions = await Promise.all(
    items.map(async (item) => await supportsItemKey(item.itemKey)),
  );
  const supported = items.filter((_, index) => decisions[index]);
  const due = supported.filter(
    (item) =>
      item.nextReviewAt !== null && new Date(item.nextReviewAt).getTime() <= nowMs,
  );
  const upcoming =
    supported.find(
      (item) =>
        item.nextReviewAt !== null &&
        new Date(item.nextReviewAt).getTime() > nowMs,
    ) ?? null;

  return { supported, due, upcoming };
}
