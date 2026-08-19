import { describe, expect, it } from "vitest";

import {
  AuthoringQualityError,
  reviewAuthoringDraft,
} from "./review-authoring-draft";

import type {
  LearningActivityDraftV2,
  LearningAuthoringDraftV2,
} from "@/shared/contracts/learning-authoring-draft-v2";

const CHOICE_FEEDBACK = {
  goalVi: "Nắm ý chính trước khi soi từng từ.",
  correctEvidenceVi: "Đó đúng là điều người nói trình bày.",
  incorrectEvidenceVi: "Đoạn này không nhắc tới nội dung đó.",
  nextStepVi: "Nghe lại một lượt rồi chọn lại.",
};

function gist(
  id: string,
  options: readonly { id: string; textVi: string }[],
  correctOptionId: string,
  captionPolicy: "hidden_first" | "toggle" | "shown" = "hidden_first",
): LearningActivityDraftV2 {
  return {
    id,
    phase: "gist",
    activityType: "gist_choice",
    outcomeIds: ["outcome_main"],
    instructionVi: "Nghe một lượt rồi chọn ý chính.",
    evidenceWindowIds: ["window_aaaaaaaa_bbbbbbbb"],
    captionPolicy,
    estimatedSeconds: 60,
    promptVi: "Đoạn này nói về điều gì?",
    options: [...options],
    correctOptionId,
    feedback: CHOICE_FEEDBACK,
  } as LearningActivityDraftV2;
}

function meaning(
  id: string,
  options: readonly { id: string; textVi: string }[],
  correctOptionId: string,
): LearningActivityDraftV2 {
  return {
    id,
    phase: "practice",
    activityType: "meaning_in_context",
    outcomeIds: ["outcome_main"],
    instructionVi: "Chọn nghĩa đúng trong ngữ cảnh này.",
    evidenceWindowIds: ["window_aaaaaaaa_bbbbbbbb"],
    captionPolicy: "toggle",
    estimatedSeconds: 60,
    candidateId: "candidate_member",
    promptVi: "Cụm này nghĩa là gì trong đoạn vừa nghe?",
    options: [...options],
    correctOptionId,
    feedback: CHOICE_FEEDBACK,
  } as LearningActivityDraftV2;
}

function recall(
  candidateId = "candidate_member",
  captionPolicy: "hidden_first" | "toggle" | "shown" = "toggle",
): LearningActivityDraftV2 {
  return {
    id: "activity_recall",
    phase: "retrieve",
    activityType: "chunk_recall",
    outcomeIds: ["outcome_main"],
    instructionVi: "Nhớ lại cụm người nói đã dùng.",
    evidenceWindowIds: ["window_aaaaaaaa_bbbbbbbb"],
    captionPolicy,
    estimatedSeconds: 90,
    candidateId,
    promptVi: "Viết lại cụm còn thiếu.",
    hintVi: null,
    accepted: ["a member of"],
    revealAnswer: "a member of",
    revealExplanationVi: "Đây là cụm nguyên văn trong đoạn.",
    feedback: CHOICE_FEEDBACK,
  } as LearningActivityDraftV2;
}

function transfer(
  candidateId = "candidate_member",
): LearningActivityDraftV2 {
  return {
    id: "activity_transfer",
    phase: "transfer",
    activityType: "guided_transfer",
    outcomeIds: ["outcome_main"],
    instructionVi: "Dùng lại cụm vừa nhớ trong một tình huống khác.",
    estimatedSeconds: 120,
    candidateIds: [candidateId],
    scenarioVi: "Một đồng nghiệp mới hỏi vai trò của bạn trong một nhóm khác.",
    promptVi: "Viết một câu trả lời tự nhiên dùng cụm vừa học.",
    criteriaVi: [
      "Dùng đúng cụm mục tiêu.",
      "Câu phù hợp với tình huống mới.",
    ],
    feedback: {
      goalVi: "Dùng lại ngôn ngữ ngoài câu nguồn.",
      nextStepVi: "Đối chiếu tiêu chí rồi sửa câu nếu cần.",
    },
  } as LearningActivityDraftV2;
}

const EXIT: LearningActivityDraftV2 = {
  id: "activity_exit",
  phase: "reflect",
  activityType: "exit_ticket",
  outcomeIds: ["outcome_main"],
  instructionVi: "Nhìn lại buổi học.",
  estimatedSeconds: 30,
  promptVi: "Phần nào khó nhất?",
  feedback: {
    goalVi: "Nhận ra chỗ cần ôn lại.",
    nextStepVi: "Mục này sẽ quay lại trong ôn tập.",
  },
} as LearningActivityDraftV2;

function draft(
  activities: readonly LearningActivityDraftV2[],
): LearningAuthoringDraftV2 {
  return {
    draftVersion: "learning-authoring-draft:v2",
    challengeSummaryVi: "Đoạn nói tốc độ vừa, chủ đề quen thuộc.",
    targetItemNotes: [],
    activities: [...activities],
  } as LearningAuthoringDraftV2;
}

const A = { id: "option_a", textVi: "Giới thiệu bản thân" };
const B = { id: "option_b", textVi: "Bán một sản phẩm" };
const C = { id: "option_c", textVi: "Kể một chuyến đi" };

function expectReason(
  build: () => unknown,
  reason: AuthoringQualityError["reason"],
) {
  try {
    build();
    throw new Error("Expected reviewAuthoringDraft to reject the draft.");
  } catch (error) {
    expect(error).toBeInstanceOf(AuthoringQualityError);
    expect((error as AuthoringQualityError).reason).toBe(reason);
  }
}

describe("reviewAuthoringDraft", () => {
  it("passes the minimum evidence-producing learning loop", () => {
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [A, B], "option_a"),
        recall(),
        transfer(),
      ]),
    );
    expect(reviewed.repairs).toEqual(["NONE"]);
  });

  it("requires the first activity to be an unaided gist listen", () => {
    expectReason(
      () =>
        reviewAuthoringDraft(
          draft([
            gist("activity_gist", [A, B], "option_a", "shown"),
            recall(),
            transfer(),
          ]),
        ),
      "NO_UNAIDED_GIST",
    );
  });

  it("requires active form retrieval, not only recognition plus transfer", () => {
    expectReason(
      () =>
        reviewAuthoringDraft(
          draft([
            gist("activity_gist", [A, B], "option_a"),
            meaning("activity_meaning", [B, C], "option_b"),
            transfer(),
          ]),
        ),
      "NO_FORM_RETRIEVAL",
    );
  });

  it("refuses recall that exposes captions before retrieval", () => {
    expectReason(
      () =>
        reviewAuthoringDraft(
          draft([
            gist("activity_gist", [A, B], "option_a"),
            recall("candidate_member", "shown"),
            transfer(),
          ]),
        ),
      "RETRIEVAL_ANSWER_EXPOSED",
    );
  });

  it("requires changed-context transfer after retrieval", () => {
    expectReason(
      () =>
        reviewAuthoringDraft(
          draft([
            gist("activity_gist", [A, B], "option_a"),
            recall(),
            EXIT,
          ]),
        ),
      "NO_CHANGED_CONTEXT_TRANSFER",
    );
  });

  it("requires transfer to reuse an item the learner retrieved", () => {
    expectReason(
      () =>
        reviewAuthoringDraft(
          draft([
            gist("activity_gist", [A, B], "option_a"),
            recall("candidate_member"),
            transfer("candidate_other"),
          ]),
        ),
      "NO_RETRIEVAL_TO_TRANSFER_BRIDGE",
    );
  });

  it("requires retrieval of the shared target before changed-context transfer", () => {
    expectReason(
      () =>
        reviewAuthoringDraft(
          draft([
            gist("activity_gist", [A, B], "option_a"),
            transfer(),
            recall(),
          ]),
        ),
      "TRANSFER_BEFORE_RETRIEVAL",
    );
  });

  it("refuses an activity that offers the same option twice", () => {
    expect(() =>
      reviewAuthoringDraft(
        draft([
          gist(
            "activity_gist",
            [A, { id: "option_dup", textVi: "  giới thiệu bản thân  " }],
            "option_a",
          ),
          recall(),
          transfer(),
        ]),
      ),
    ).toThrow(/same option twice/i);
  });

  it("refuses when the correct option is the longest one every time", () => {
    const long = {
      id: "option_long",
      textVi: "Một câu trả lời rất dài và chi tiết",
    };
    expect(() =>
      reviewAuthoringDraft(
        draft([
          gist("activity_gist", [B, long], "option_long"),
          meaning("activity_meaning", [C, long], "option_long"),
          recall(),
          transfer(),
        ]),
      ),
    ).toThrow(/longest one in every/i);
  });

  it("allows the correct option to be longest once", () => {
    const long = {
      id: "option_long",
      textVi: "Một câu trả lời rất dài và chi tiết",
    };
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [B, long], "option_long"),
        meaning("activity_meaning", [A, C], "option_c"),
        recall(),
        transfer(),
      ]),
    );
    expect(reviewed.repairs).toBeDefined();
  });

  it("spreads the correct answer out when it always sits in the same slot", () => {
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_c"),
        recall(),
        transfer(),
      ]),
    );

    expect(reviewed.repairs).toEqual(["REBALANCED_ANSWER_POSITIONS"]);
    const positions = reviewed.draft.activities
      .filter(
        (activity) =>
          activity.activityType === "gist_choice" ||
          activity.activityType === "meaning_in_context",
      )
      .map((activity) => {
        const choice = activity as Extract<
          LearningActivityDraftV2,
          { options: readonly { id: string }[] }
        >;
        return choice.options.findIndex(
          (option) => option.id === choice.correctOptionId,
        );
      });
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  it("keeps every option when it rebalances", () => {
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_c"),
        recall(),
        transfer(),
      ]),
    );
    const meaningActivity = reviewed.draft.activities[1] as Extract<
      LearningActivityDraftV2,
      { options: readonly { id: string }[] }
    >;
    expect(meaningActivity.options.map((option) => option.id).sort()).toEqual([
      "option_b",
      "option_c",
    ]);
  });

  it("leaves a draft alone when answer positions already vary", () => {
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_b"),
        recall(),
        transfer(),
      ]),
    );
    expect(reviewed.repairs).toEqual(["NONE"]);
  });

  it("is deterministic — the same draft always yields the same lesson", () => {
    const build = () =>
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_c"),
        recall(),
        transfer(),
      ]);
    expect(reviewAuthoringDraft(build())).toEqual(reviewAuthoringDraft(build()));
  });
});
