import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

export type ClassifiedLearningReviewQueue = {
  supported: LearningReviewItemState[];
  due: LearningReviewItemState[];
  upcoming: LearningReviewItemState | null;
};

export function classifyLearningReviewQueue(
  items: LearningReviewItemState[],
  supportsItemKey: (itemKey: string) => boolean,
  nowMs = Date.now(),
): ClassifiedLearningReviewQueue {
  const supported = items.filter((item) => supportsItemKey(item.itemKey));
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
