import { describe, expect, it } from "vitest";

import {
  PHASE_BY_ACTIVITY_TYPE,
  learningAuthoringDraftV2Schema,
} from "./learning-authoring-draft-v2";

/**
 * The map and the schema state the same binding twice.
 *
 * The provider fills `phase` in from this map rather than asking the model,
 * because production rejected a draft at `activities.3.phase` for restating the
 * type wrong — after both model calls had been paid for. If the map and the
 * schema ever disagree, the derived value would be rejected by the very schema
 * it was derived for, and every draft would fail.
 */
const BASE = {
  draftVersion: "learning-authoring-draft:v2" as const,
  challengeSummaryVi: "Đoạn nói tốc độ vừa, chủ đề quen thuộc.",
  targetItemNotes: [],
};

const FEEDBACK = {
  goalVi: "Nắm ý chính trước khi soi từng từ.",
  correctEvidenceVi: "Đó đúng là điều người nói trình bày.",
  incorrectEvidenceVi: "Đoạn này không nhắc tới nội dung đó.",
  nextStepVi: "Nghe lại một lượt rồi chọn lại.",
};

/** One minimal draft per activity type, carrying the mapped phase. */
function activityFor(type: keyof typeof PHASE_BY_ACTIVITY_TYPE, phase: string) {
  const shared = {
    id: `activity_${type}`,
    phase,
    activityType: type,
    outcomeIds: ["outcome_main"],
    instructionVi: "Nghe rồi làm theo hướng dẫn.",
    evidenceWindowIds: ["window_aaaaaaaa_bbbbbbbb"],
    captionPolicy: "hidden_first",
    estimatedSeconds: 60,
  };
  const options = [
    { id: "option_a", textVi: "Giới thiệu bản thân" },
    { id: "option_b", textVi: "Bán một sản phẩm" },
  ];

  switch (type) {
    case "gist_choice":
      return { ...shared, promptVi: "Đoạn này nói gì?", options, correctOptionId: "option_a", feedback: FEEDBACK };
    case "meaning_in_context":
      return { ...shared, candidateId: "candidate_member", promptVi: "Cụm này nghĩa gì?", options, correctOptionId: "option_a", feedback: FEEDBACK };
    case "chunk_recall":
      return { ...shared, candidateId: "candidate_member", promptVi: "Viết lại cụm còn thiếu.", hintVi: null, accepted: ["a member of"], revealAnswer: "a member of", revealExplanationVi: "Cụm nguyên văn trong đoạn.", feedback: FEEDBACK };
    case "guided_transfer": {
      const { evidenceWindowIds: _w, captionPolicy: _c, ...ungrounded } = shared;
      return { ...ungrounded, candidateIds: ["candidate_member"], scenarioVi: "Bạn đang giới thiệu mình với một nhóm mới.", promptVi: "Viết một câu dùng cụm vừa học.", criteriaVi: ["Dùng đúng cụm.", "Hợp tình huống."], feedback: { goalVi: FEEDBACK.goalVi, nextStepVi: FEEDBACK.nextStepVi } };
    }
    case "exit_ticket": {
      const { evidenceWindowIds: _w, captionPolicy: _c, ...ungrounded } = shared;
      return { ...ungrounded, promptVi: "Phần nào khó nhất với bạn?", feedback: { goalVi: FEEDBACK.goalVi, nextStepVi: FEEDBACK.nextStepVi } };
    }
  }
}

describe("phase mapping", () => {
  it("names every activity type the schema accepts", () => {
    const parsed = learningAuthoringDraftV2Schema.safeParse({
      ...BASE,
      activities: Object.entries(PHASE_BY_ACTIVITY_TYPE).map(([type, phase]) =>
        activityFor(type as keyof typeof PHASE_BY_ACTIVITY_TYPE, phase),
      ),
    });

    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
  });

  it("is the only phase each type accepts", () => {
    // If the schema took a second phase for a type, deriving one value would be
    // hiding a real choice rather than removing a pointless question.
    for (const [type, phase] of Object.entries(PHASE_BY_ACTIVITY_TYPE)) {
      const wrong = phase === "gist" ? "reflect" : "gist";
      const parsed = learningAuthoringDraftV2Schema.safeParse({
        ...BASE,
        activities: [
          activityFor(type as keyof typeof PHASE_BY_ACTIVITY_TYPE, wrong),
        ],
      });
      expect(parsed.success, `${type} accepted phase ${wrong}`).toBe(false);
    }
  });
});
