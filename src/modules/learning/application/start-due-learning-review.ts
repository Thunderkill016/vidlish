import type { LearningReviewPlanResolver } from "@/modules/learning/application/learning-review-plan";
import type { LearningReviewRepository } from "@/modules/learning/ports/learning-review-repository";

export class LearningReviewUnavailableError extends Error {
  readonly name = "LearningReviewUnavailableError";
}

export class StartDueLearningReview {
  constructor(
    private readonly repository: LearningReviewRepository,
    private readonly resolvePlan: LearningReviewPlanResolver,
  ) {}

  async execute(input: { ownerUserId: string; now?: Date }) {
    const now = input.now ?? new Date();
    const scheduled = await this.repository.listScheduled(input.ownerUserId);
    const due = scheduled
      .filter(
        (item) =>
          item.nextReviewAt !== null &&
          new Date(item.nextReviewAt).getTime() <= now.getTime(),
      )
      .sort(
        (left, right) =>
          new Date(left.nextReviewAt!).getTime() -
          new Date(right.nextReviewAt!).getTime(),
      )
      .find((item) => this.resolvePlan(item.itemKey) !== null);

    if (!due) {
      throw new LearningReviewUnavailableError(
        "No supported delayed review item is due yet.",
      );
    }

    const plan = this.resolvePlan(due.itemKey);
    if (!plan) {
      throw new LearningReviewUnavailableError(
        "The due item does not have a bounded review variant.",
      );
    }

    const persisted = await this.repository.startDue({
      ownerUserId: input.ownerUserId,
      itemKey: due.itemKey,
      variantId: plan.variantId,
    });

    return { ...persisted, plan };
  }
}
