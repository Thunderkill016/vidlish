import "server-only";

import { deriveLearningReviewPlan } from "@/modules/learning/application/derive-learning-review-plan";
import type { LearningReviewPlan } from "@/modules/learning/application/learning-review-plan";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { resolveOwnedLessonBlueprint } from "@/platform/learning/resolve-session-blueprint";

/**
 * Finds the lesson that taught an item and builds its review task from it.
 *
 * The item's own state records which lesson version taught it, so the review
 * never has to guess: it reads the same blueprint the learner studied.
 *
 * Owner-scoped at both hops. Returns null when anything is missing, which the
 * caller must treat as "no review", not as "make one up".
 */
export async function resolveLearningReviewPlan(
  ownerUserId: string,
  itemKey: string,
): Promise<LearningReviewPlan | null> {
  const state = await createLearningReviewRepository().findItemState(
    ownerUserId,
    itemKey,
  );
  if (!state) return null;

  const blueprint = await resolveOwnedLessonBlueprint({
    ownerUserId,
    lessonVersionId: state.sourceLessonVersionId,
  });
  if (!blueprint) return null;

  return deriveLearningReviewPlan(blueprint, itemKey);
}
