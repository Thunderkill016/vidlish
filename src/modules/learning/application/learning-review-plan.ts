export type LearningReviewPlan = {
  itemKey: string;
  variantId: string;
  recall: {
    promptVi: string;
    accepted: string[];
    answerAfterAttempt: string;
    correctionVi: string;
  };
  transfer: {
    scenarioVi: string;
    promptVi: string;
    criteriaVi: string[];
    exemplarAfterAttempt: string;
  };
};

/**
 * Async because a real plan is read from the lesson that taught the item, not
 * looked up in a table held in memory. Returning null means the item has no
 * groundable review — the caller must skip it, never invent one.
 */
export type LearningReviewPlanResolver = (
  itemKey: string,
) => Promise<LearningReviewPlan | null> | LearningReviewPlan | null;
