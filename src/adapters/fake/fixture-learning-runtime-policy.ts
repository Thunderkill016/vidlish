import {
  learningRuntimePolicyV2Schema,
  type LearningRuntimePolicyV2,
  type SupportStep,
} from "@/shared/contracts/learning-policy-v2";

export type LearningSupportCopyByActivity = Record<
  string,
  Partial<Record<SupportStep, string>>
>;

export function createFixtureLearningRuntimePolicy(): LearningRuntimePolicyV2 {
  return learningRuntimePolicyV2Schema.parse({
    schemaVersion: "learning-runtime-policy:v2",
    blueprintId: "11111111-1111-4111-8111-111111111111",
    activityPolicies: [
      {
        activityId: "activity_gist",
        taskScope: "micro_item",
        support: {
          steps: [
            "replay",
            "context_hint",
            "keyword_hint",
            "english_caption",
          ],
          minimumAttemptsBeforeFullReveal: 1,
        },
        retry: {
          requiredAfterCorrection: true,
          retryScope: "same_item",
          maxCorrections: 1,
          maxAttemptsPerSession: 3,
        },
        transfer: null,
      },
      {
        activityId: "activity_meaning",
        taskScope: "micro_item",
        support: {
          steps: [
            "replay",
            "context_hint",
            "english_caption",
            "vietnamese_meaning",
          ],
          minimumAttemptsBeforeFullReveal: 1,
        },
        retry: {
          requiredAfterCorrection: true,
          retryScope: "same_item",
          maxCorrections: 1,
          maxAttemptsPerSession: 3,
        },
        transfer: null,
      },
      {
        activityId: "activity_recall",
        taskScope: "micro_item",
        support: {
          steps: [
            "replay",
            "context_hint",
            "keyword_hint",
            "english_caption",
            "chunk_boundaries",
            "vietnamese_meaning",
          ],
          minimumAttemptsBeforeFullReveal: 1,
        },
        retry: {
          requiredAfterCorrection: true,
          retryScope: "same_item",
          maxCorrections: 1,
          maxAttemptsPerSession: 3,
        },
        transfer: null,
      },
      {
        activityId: "activity_transfer",
        taskScope: "capability",
        support: {
          steps: ["context_hint", "keyword_hint"],
          minimumAttemptsBeforeFullReveal: 1,
        },
        retry: {
          requiredAfterCorrection: true,
          retryScope: "full_task",
          maxCorrections: 2,
          maxAttemptsPerSession: 3,
        },
        transfer: {
          changedDimensions: ["relationship", "information"],
          answerExposure: "after_attempt",
          unseenInput: false,
        },
      },
      {
        activityId: "activity_exit",
        taskScope: "micro_item",
        support: null,
        retry: {
          requiredAfterCorrection: false,
          retryScope: "same_item",
          maxCorrections: 1,
          maxAttemptsPerSession: 2,
        },
        transfer: null,
      },
    ],
    capabilityPolicies: [
      {
        outcomeId: "outcome_main_topic",
        kind: "comprehension",
        requiredForIndependent: ["comprehension", "delayed_transfer"],
      },
      {
        outcomeId: "outcome_reuse_affiliation",
        kind: "interactional",
        requiredForIndependent: [
          "comprehension",
          "productive_recall",
          "interactional_use",
          "delayed_transfer",
        ],
      },
    ],
  });
}

export const fixtureLearningSupportCopy: LearningSupportCopyByActivity = {
  activity_gist: {
    context_hint:
      "Người nói đang mở đầu một buổi hướng dẫn kỹ thuật và giới thiệu chủ đề sắp trình bày.",
    keyword_hint: "customizing · embedded player",
  },
  activity_meaning: {
    context_hint:
      "Người nói giới thiệu mối liên hệ của mình với một team trước khi nói về chủ đề chính.",
    keyword_hint: "member · team",
  },
  activity_recall: {
    context_hint:
      "Cần một cụm đứng sau I'm và trước tên của team hoặc tổ chức.",
    keyword_hint: "member",
  },
  activity_transfer: {
    context_hint:
      "Hãy giới thiệu bản thân trước, sau đó nói rõ tên nhóm mà bạn thuộc về.",
    keyword_hint: "member · of",
  },
};
