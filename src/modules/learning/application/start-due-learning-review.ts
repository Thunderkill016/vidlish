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
    const candidates = scheduled
      .filter(
        (item) =>
          item.nextReviewAt !== null &&
          new Date(item.nextReviewAt).getTime() <= now.getTime(),
      )
      .sort(
        (left, right) =>
          new Date(left.nextReviewAt!).getTime() -
          new Date(right.nextReviewAt!).getTime(),
      );

    // Walked in due order until one resolves. An item whose lesson can no
    // longer supply a grounded task is skipped rather than failing the whole
    // review — the learner still has everything else that came due.
    let due: (typeof candidates)[number] | undefined;
    let plan: Awaited<ReturnType<LearningReviewPlanResolver>> = null;
    for (const candidate of candidates) {
      const resolved = await this.resolvePlan(candidate.itemKey);
      if (resolved) {
        due = candidate;
        plan = resolved;
        break;
      }
    }

    if (!due || !plan) {
      throw new LearningReviewUnavailableError(
        "No supported delayed review item is due yet.",
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
