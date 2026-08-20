import { describe, expect, it } from "vitest";

import { reviewAuthoringDraft } from "./review-authoring-draft";

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
): LearningActivityDraftV2 {
  return {
    id,
    phase: "gist",
    activityType: "gist_choice",
    outcomeIds: ["outcome_main"],
    instructionVi: "Nghe một lượt rồi chọn ý chính.",
    evidenceWindowIds: ["window_aaaaaaaa_bbbbbbbb"],
    captionPolicy: "hidden_first",
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

const RECALL: LearningActivityDraftV2 = {
  id: "activity_recall",
  phase: "retrieve",
  activityType: "chunk_recall",
  outcomeIds: ["outcome_main"],
  instructionVi: "Nhớ lại cụm người nói đã dùng.",
  evidenceWindowIds: ["window_aaaaaaaa_bbbbbbbb"],
  captionPolicy: "toggle",
  estimatedSeconds: 90,
  candidateId: "candidate_member",
  promptVi: "Viết lại cụm còn thiếu.",
  hintVi: null,
  accepted: ["a member of"],
  revealAnswer: "a member of",
  revealExplanationVi: "Đây là cụm nguyên văn trong đoạn.",
  feedback: CHOICE_FEEDBACK,
} as LearningActivityDraftV2;

const TRANSFER: LearningActivityDraftV2 = {
  id: "activity_transfer",
  phase: "transfer",
  activityType: "guided_transfer",
  outcomeIds: ["outcome_main"],
  instructionVi: "Dùng lại cụm vừa nhớ trong tình huống khác.",
  estimatedSeconds: 120,
  candidateIds: ["candidate_member"],
  scenarioVi: "Một đồng nghiệp mới hỏi bạn đang tham gia nhóm nào.",
  promptVi: "Viết một câu trả lời tự nhiên, đừng chép lại câu nguồn.",
  criteriaVi: ["Dùng đúng cụm mục tiêu.", "Phù hợp tình huống mới."],
  feedback: {
    goalVi: "Dùng được cụm ngoài câu đã nghe.",
    nextStepVi: "Đối chiếu tiêu chí rồi sửa lại câu.",
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

describe("reviewAuthoringDraft", () => {
  it("passes a draft with nothing wrong with it", () => {
    const reviewed = reviewAuthoringDraft(
      draft([gist("activity_gist", [A, B], "option_a"), RECALL, TRANSFER]),
    );
    expect(reviewed.repairs).toEqual(["NONE"]);
  });

  it("refuses a draft that never asks the learner to produce language", () => {
    // Recognition is not retrieval. A lesson made only of multiple choice looks
    // finished and teaches the learner to recognise, nothing more.
    expect(() =>
      reviewAuthoringDraft(
        draft([
          gist("activity_gist", [A, B], "option_a"),
          meaning("activity_meaning", [B, A], "option_b"),
        ]),
      ),
    ).toThrow(/form-retrieval/i);
  });

  it("refuses a lesson that produces language only through transfer", () => {
    // VLR-007. A guided_transfer can be answered with the source sentence still
    // in front of the learner, so a lesson can claim production while nothing
    // was ever recalled from memory.
    expect(() =>
      reviewAuthoringDraft(
        draft([gist("activity_gist", [A, B], "option_a"), TRANSFER]),
      ),
    ).toThrow(/form-retrieval/i);
  });

  it("refuses a lesson that does not open with an unaided listen", () => {
    // Reading the answer before the first listen means the learner never
    // demonstrates listening at all.
    const shown = {
      ...gist("activity_gist", [A, B], "option_a"),
      captionPolicy: "shown",
    } as LearningActivityDraftV2;
    expect(() =>
      reviewAuthoringDraft(draft([shown, RECALL, TRANSFER])),
    ).toThrow(/captions are hidden/i);
  });

  it("refuses a recall that runs with captions shown", () => {
    const exposed = {
      ...RECALL,
      captionPolicy: "shown",
    } as LearningActivityDraftV2;
    expect(() =>
      reviewAuthoringDraft(
        draft([gist("activity_gist", [A, B], "option_a"), exposed, TRANSFER]),
      ),
    ).toThrow(/exposes captions/i);
  });

  it("refuses a recall whose prompt contains its own answer", () => {
    // Captions are not the only leak. A prompt holding the phrase turns recall
    // into copying while the caption policy still reads as correct.
    const leaking = {
      ...RECALL,
      promptVi: "Viết lại cụm a member of vào chỗ trống.",
    } as LearningActivityDraftV2;
    expect(() =>
      reviewAuthoringDraft(
        draft([gist("activity_gist", [A, B], "option_a"), leaking, TRANSFER]),
      ),
    ).toThrow(/answer in the prompt or hint/i);
  });

  it("refuses a recall whose hint contains its own answer", () => {
    const leaking = {
      ...RECALL,
      hintVi: "Gợi ý: a member of",
    } as LearningActivityDraftV2;
    expect(() =>
      reviewAuthoringDraft(
        draft([gist("activity_gist", [A, B], "option_a"), leaking, TRANSFER]),
      ),
    ).toThrow(/answer in the prompt or hint/i);
  });

  it("refuses a lesson with no changed-context transfer", () => {
    expect(() =>
      reviewAuthoringDraft(
        draft([gist("activity_gist", [A, B], "option_a"), RECALL]),
      ),
    ).toThrow(/changed-context transfer/i);
  });

  it("refuses transfer of an item the lesson never asked the learner to recall", () => {
    // Retrieval of one item and reuse of another is two half lessons. The claim
    // the lesson makes is that one item was recalled and then reused.
    const unrelated = {
      ...TRANSFER,
      candidateIds: ["candidate_elsewhere"],
    } as LearningActivityDraftV2;
    expect(() =>
      reviewAuthoringDraft(
        draft([gist("activity_gist", [A, B], "option_a"), RECALL, unrelated]),
      ),
    ).toThrow(/both retrieved and reused/i);
  });

  it("refuses transfer placed before the retrieval it depends on", () => {
    // Reuse before recall is copying: the phrase is still on screen.
    expect(() =>
      reviewAuthoringDraft(
        draft([gist("activity_gist", [A, B], "option_a"), TRANSFER, RECALL]),
      ),
    ).toThrow(/before retrieval/i);
  });

  it("refuses an activity that offers the same option twice", () => {
    // Two identical options means two correct answers or one dead slot.
    expect(() =>
      reviewAuthoringDraft(
        draft([
          gist(
            "activity_gist",
            [A, { id: "option_dup", textVi: "  giới thiệu bản thân  " }],
            "option_a",
          ),
          RECALL,
          TRANSFER,
        ]),
      ),
    ).toThrow(/same option twice/i);
  });

  it("refuses when the correct option is the longest one every time", () => {
    // A learner scores full marks by always picking the longest option, without
    // understanding a word.
    const long = { id: "option_long", textVi: "Một câu trả lời rất dài và chi tiết" };
    expect(() =>
      reviewAuthoringDraft(
        draft([
          gist("activity_gist", [B, long], "option_long"),
          meaning("activity_meaning", [C, long], "option_long"),
          RECALL,
          TRANSFER,
        ]),
      ),
    ).toThrow(/longest one in every/i);
  });

  it("allows the correct option to be longest once", () => {
    // One activity landing that way is chance, not a habit.
    const long = { id: "option_long", textVi: "Một câu trả lời rất dài và chi tiết" };
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [B, long], "option_long"),
        meaning("activity_meaning", [A, C], "option_c"),
        RECALL,
        TRANSFER,
      ]),
    );
    expect(reviewed.repairs).toBeDefined();
  });

  it("spreads the correct answer out when it always sits in the same slot", () => {
    // Models put the right answer in the same position far more often than
    // chance, and a learner who notices spends the lesson pattern-matching.
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_c"),
        RECALL,
        TRANSFER,
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
    // Rotating must not drop or invent an option.
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_c"),
        RECALL,
        TRANSFER,
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

  it("leaves a draft alone when positions already vary", () => {
    const reviewed = reviewAuthoringDraft(
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_b"),
        RECALL,
        TRANSFER,
      ]),
    );
    expect(reviewed.repairs).toEqual(["NONE"]);
  });

  it("is deterministic — the same draft always yields the same lesson", () => {
    // A random shuffle would make every regeneration a different lesson and
    // none of this testable.
    const build = () =>
      draft([
        gist("activity_gist", [A, B], "option_a"),
        meaning("activity_meaning", [C, B], "option_c"),
        RECALL,
        TRANSFER,
      ]);
    expect(reviewAuthoringDraft(build())).toEqual(reviewAuthoringDraft(build()));
  });
});
