import type {
  LearningReviewPlan,
  LearningReviewPlanResolver,
} from "@/modules/learning/application/learning-review-plan";

const memberOfReview: LearningReviewPlan = {
  itemKey: "a-member-of",
  variantId: "review_variant_affiliation_01",
  recall: {
    promptVi:
      "Không nhìn bài cũ: cụm ba từ nào dùng để nói rằng bạn thuộc một nhóm hoặc tổ chức?",
    accepted: ["a member of"],
    answerAfterAttempt: "a member of",
    correctionVi:
      "Cụm cần nhớ là a member of. Hãy nhìn một lần, rồi thử tự gọi lại trước khi sang bối cảnh mới.",
  },
  transfer: {
    scenarioVi:
      "Bạn vừa gia nhập một nhóm tình nguyện cộng đồng và đang tự giới thiệu với một thành viên mới.",
    promptVi:
      "Viết một câu giới thiệu bản thân bằng cụm vừa nhớ lại. Không dùng tên Developer Relations trong câu nguồn cũ.",
    criteriaVi: [
      "Có dùng nguyên cụm a member of",
      "Sau of là tên một nhóm hoặc tổ chức cụ thể",
      "Câu phù hợp với tình huống giới thiệu trong nhóm tình nguyện mới",
    ],
    exemplarAfterAttempt: "I'm a member of the community volunteer team.",
  },
};

export const resolveFixtureLearningReviewPlan: LearningReviewPlanResolver = (
  itemKey,
) => (itemKey === memberOfReview.itemKey ? memberOfReview : null);
