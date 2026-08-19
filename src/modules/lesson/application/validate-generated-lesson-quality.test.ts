import { describe, expect, it } from "vitest";

import { validateGeneratedLessonQuality } from "@/modules/lesson/application/validate-generated-lesson-quality";
import type { LessonDraft } from "@/shared/contracts/lesson";

const a = `seg_${"a".repeat(32)}`;
const b = `seg_${"b".repeat(32)}`;

function validDraft(): LessonDraft {
  return {
    titleVi: "Bài học",
    topicVi: "Tình nguyện",
    summaryVi: "Tóm tắt",
    summaryEn: "Summary",
    estimatedLevel: "B1",
    difficultyReasonsVi: ["Tốc độ nói tự nhiên"],
    vocabulary: Array.from({ length: 6 }, (_, index) => ({
      term: index === 0 ? "community" : `term${index}`,
      partOfSpeech: "noun",
      meaningVi: "nghĩa",
      definitionEn: "definition",
      exampleEn: `A fresh example ${index}.`,
      sourceSegmentIds: [index === 0 ? a : b],
    })),
    phrases: [
      {
        phrase: "volunteer team",
        kind: "collocation",
        meaningVi: "đội tình nguyện",
        usageNoteVi: "Dùng trong giao tiếp",
        sourceSegmentIds: [a],
      },
      {
        phrase: "term phrase one",
        kind: "expression",
        meaningVi: "x",
        usageNoteVi: "x",
        sourceSegmentIds: [b],
      },
      {
        phrase: "term phrase two",
        kind: "expression",
        meaningVi: "x",
        usageNoteVi: "x",
        sourceSegmentIds: [b],
      },
    ],
    grammarPoints: [
      {
        titleVi: "Hiện tại đơn",
        explanationVi: "x",
        pattern: "S + V",
        exampleEn: "People volunteer every week.",
        sourceSegmentIds: [a],
      },
    ],
    comprehensionQuestions: [0, 1, 2].map((index) => ({
      questionVi: `Câu ${index}?`,
      options: ["one", "two", "three", "four"],
      correctIndex: 0,
      explanationVi: "x",
      sourceSegmentIds: [a],
    })),
    clozeItems: [
      {
        sentence: "I joined the ___ last year.",
        answer: "community",
        hintVi: "x",
        sourceSegmentIds: [a],
      },
    ],
  };
}

const permitted = [
  {
    id: a,
    text: "I joined the community volunteer team last year.",
  },
  {
    id: b,
    text: "term1 term2 term3 term4 term5 term phrase one term phrase two",
  },
];

describe("validateGeneratedLessonQuality", () => {
  it("accepts a grounded draft that satisfies cross-field constraints", () => {
    expect(validateGeneratedLessonQuality(validDraft(), permitted)).toEqual([]);
  });

  it("rejects duplicate and ungrounded content deterministically", () => {
    const draft = validDraft();
    draft.vocabulary[1].term = "community";
    draft.phrases[1].phrase = "missing phrase";
    draft.comprehensionQuestions[0].options = ["same", "same", "x", "y"];
    draft.clozeItems[0].sentence = "No blank here";
    draft.clozeItems[0].answer = "missing";
    draft.grammarPoints[0].exampleEn = permitted[0].text;

    expect(validateGeneratedLessonQuality(draft, permitted).map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "DUPLICATE_VOCABULARY",
        "UNGROUNDED_PHRASE",
        "DUPLICATE_QUESTION_OPTIONS",
        "INVALID_CLOZE_BLANK",
        "UNGROUNDED_CLOZE_ANSWER",
        "COPIED_EXAMPLE",
      ]),
    );
  });
});
