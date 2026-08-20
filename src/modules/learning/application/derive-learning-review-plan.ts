import type { LearningReviewPlan } from "./learning-review-plan";

import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

/**
 * Builds a delayed-review task from the lesson that taught the item.
 *
 * VLR-003. The resolver this replaces understood exactly one hard-coded item,
 * so every other item a learner had ever studied was unreviewable: the review
 * queue could schedule it, and then nothing could be built when its turn came.
 *
 * Everything here comes from the published blueprint — the same rows the
 * original lesson was assembled from. Nothing is invented, which is why an item
 * whose lesson cannot supply the parts returns null instead of a plausible
 * task: a review question nobody grounded is worse than no review at all,
 * because the learner cannot tell the difference.
 */
export function deriveLearningReviewPlan(
  blueprint: LessonBlueprintV2,
  itemKey: string,
): LearningReviewPlan | null {
  const item = blueprint.targetItems.find(
    (candidate) => candidate.itemKey === itemKey,
  );
  if (!item) return null;

  // The changed-context half has to come from somewhere authored: a scenario
  // and its success criteria are judgement, not data, and deriving them from
  // the item alone would mean writing them here with no grounding.
  const transfer = blueprint.activities.find(
    (activity) =>
      activity.activityType === "guided_transfer" &&
      activity.targetItemIds.includes(item.id),
  );
  if (!transfer || transfer.activityType !== "guided_transfer") return null;

  return {
    itemKey: item.itemKey,
    // Tied to the blueprint, so a republished lesson cannot be mistaken for the
    // variant a learner already saw.
    variantId: `review_${blueprint.blueprintId.slice(0, 8)}_${item.id}`.slice(0, 64),
    recall: {
      // Meaning first, form withheld. The learner has to produce the English
      // from memory, which is the half that decays fastest and the reason
      // delayed review exists at all.
      promptVi: `Không nhìn bài cũ: cụm tiếng Anh nào mang nghĩa "${item.contextualMeaningVi}"?`,
      accepted: [item.surfaceForm],
      answerAfterAttempt: item.surfaceForm,
      correctionVi: `Cụm cần nhớ là ${item.surfaceForm} — ${item.communicativeFunctionVi}. Nhìn một lần, rồi tự gọi lại trước khi sang bối cảnh mới.`,
    },
    transfer: {
      scenarioVi: transfer.scenarioVi,
      promptVi: transfer.promptVi,
      criteriaVi: transfer.evaluation.criteriaVi,
      // Optional in the blueprint, required here: a self-check with nothing to
      // compare against leaves the learner grading a blank.
      exemplarAfterAttempt:
        transfer.evaluation.exemplarAfterAttempt ?? item.surfaceForm,
    },
  };
}
