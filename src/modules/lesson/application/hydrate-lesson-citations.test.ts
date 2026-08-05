import { describe, expect, it } from "vitest";

import {
  LessonGroundingError,
  hydrateLessonCitations,
} from "@/modules/lesson/application/hydrate-lesson-citations";
import type { LessonDraft } from "@/shared/contracts/lesson";

const segA = `seg_${"a".repeat(32)}`;
const segB = `seg_${"b".repeat(32)}`;
const forged = `seg_${"c".repeat(32)}`;

const permitted = [
  { id: segB, startMs: 5000, endMs: 8000, text: "Second permitted line." },
  { id: segA, startMs: 0, endMs: 4000, text: "First permitted line." },
];

function draft(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    titleVi: "Bài học",
    topicVi: "Thói quen học",
    summaryVi: "Tóm tắt",
    summaryEn: "Summary",
    estimatedLevel: "B1",
    difficultyReasonsVi: ["Tốc độ nói vừa phải"],
    vocabulary: [
      {
        term: "habit",
        partOfSpeech: "noun",
        meaningVi: "thói quen",
        definitionEn: "Something you do regularly.",
        exampleEn: "I built a reading habit.",
        sourceSegmentIds: [segA],
      },
    ],
    phrases: [
      {
        phrase: "pick up",
        kind: "phrasal_verb",
        meaningVi: "học được",
        usageNoteVi: "Dùng khi học được điều gì đó tự nhiên.",
        sourceSegmentIds: [segB],
      },
    ],
    grammarPoints: [
      {
        titleVi: "Thì hiện tại đơn",
        explanationVi: "Diễn tả thói quen.",
        pattern: "S + V(s/es)",
        exampleEn: "She studies every morning.",
        sourceSegmentIds: [segA],
      },
    ],
    comprehensionQuestions: [
      {
        questionVi: "Người nói khuyên điều gì?",
        options: ["Nghe lại", "Bỏ qua", "Ngủ", "Ăn"],
        correctIndex: 0,
        explanationVi: "Vì họ nói vậy.",
        sourceSegmentIds: [segA],
      },
    ],
    clozeItems: [
      {
        sentence: "First ___ line.",
        answer: "permitted",
        hintVi: "được phép",
        sourceSegmentIds: [segA],
      },
    ],
    ...overrides,
  };
}

describe("hydrateLessonCitations", () => {
  it("hydrates real transcript text and orders citations by time", () => {
    const citations = hydrateLessonCitations(draft(), permitted);

    expect(citations.map((c) => c.segmentId)).toEqual([segA, segB]);
    expect(citations[0].text).toBe("First permitted line.");
  });

  it("rejects a draft citing a segment that was never permitted", () => {
    const forgedDraft = draft({
      vocabulary: [
        { ...draft().vocabulary[0], sourceSegmentIds: [forged] },
      ],
    });

    expect(() => hydrateLessonCitations(forgedDraft, permitted)).toThrow(
      LessonGroundingError,
    );
  });

  it("rejects a cloze item with no blank", () => {
    const noBlank = draft({
      clozeItems: [
        { ...draft().clozeItems[0], sentence: "No blank here." },
      ],
    });

    expect(() => hydrateLessonCitations(noBlank, permitted)).toThrow(
      /no blank/i,
    );
  });

  it("deduplicates a segment cited by several items", () => {
    const citations = hydrateLessonCitations(draft(), permitted);
    const ids = citations.map((c) => c.segmentId);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
