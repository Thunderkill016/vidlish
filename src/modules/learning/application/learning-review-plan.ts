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

export type LearningReviewPlanResolver = (
  itemKey: string,
) => LearningReviewPlan | null;
