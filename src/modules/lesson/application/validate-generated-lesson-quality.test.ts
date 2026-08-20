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

/**
 * A draft whose only interesting part is one phrase and its citation. Every
 * other field is grounded in the first cue so the assertions isolate the phrase.
 */
function draftWithPhrase(phrase: string, sourceSegmentIds: string[]): LessonDraft {
  const base = validDraft();
  return {
    ...base,
    vocabulary: base.vocabulary.map((item, index) => ({
      ...item,
      term: index === 0 ? "deathnut" : `unused${index}`,
      sourceSegmentIds: ["seg_a"],
    })),
    phrases: [
      { ...base.phrases[0]!, phrase, sourceSegmentIds },
      // Spares must themselves be grounded, or they raise the very issue the
      // assertions are looking for and the test measures nothing.
      ...base.phrases.slice(1).map((item, index) => ({
        ...item,
        phrase: index === 0 ? "let's go" : "no water",
        sourceSegmentIds: index === 0 ? ["seg_e"] : ["seg_d"],
      })),
    ],
    comprehensionQuestions: base.comprehensionQuestions.map((question) => ({
      ...question,
      sourceSegmentIds: ["seg_a"],
    })),
  } as LessonDraft;
}

describe("grounding across caption cues", () => {
  const cues = [
    { id: "seg_a", text: "This is the deathnut" },
    { id: "seg_b", text: "challenge." },
    { id: "seg_c", text: "We ain't got no milk," },
    { id: "seg_d", text: "no water, no nothing." },
    { id: "seg_e", text: "Let's go, bro." },
  ];

  it("accepts a phrase split across two cues", () => {
    // Caption cues are not sentences. On many YouTube videos they are five-word
    // fragments that break mid-phrase, so a phrase the speaker plainly said
    // fits inside no single cue. Rejecting it called the model a liar for
    // quoting the video correctly.
    const issues = validateGeneratedLessonQuality(
      draftWithPhrase("the deathnut challenge", ["seg_a"]),
      cues,
    );
    expect(issues.map((issue) => issue.code)).not.toContain("UNGROUNDED_PHRASE");
  });

  it("accepts a phrase sitting just before the cited cue", () => {
    // Measured on the real failing video: a rejected phrase sat three cues
    // before the citation. A forward-only window missed it.
    const issues = validateGeneratedLessonQuality(
      draftWithPhrase("this is the deathnut", ["seg_c"]),
      cues,
    );
    expect(issues.map((issue) => issue.code)).not.toContain("UNGROUNDED_PHRASE");
  });

  it("still rejects a phrase nobody said", () => {
    // The whole point. Widening the window must not turn the gate off — an
    // invented phrase has to stay rejected however it is cited.
    const issues = validateGeneratedLessonQuality(
      draftWithPhrase("we should schedule a follow up meeting", ["seg_a"]),
      cues,
    );
    expect(issues.map((issue) => issue.code)).toContain("UNGROUNDED_PHRASE");
  });

  it("still rejects speech from the far end of the video", () => {
    // Real speech, but nowhere near the citation. Accepting this would make the
    // citation meaningless and play the learner the wrong moment.
    const long = [
      ...cues,
      ...Array.from({ length: 30 }, (_, i) => ({
        id: `seg_pad${i}`,
        text: "padding words here",
      })),
      { id: "seg_far", text: "an entirely different closing remark" },
    ];
    const issues = validateGeneratedLessonQuality(
      draftWithPhrase("an entirely different closing remark", ["seg_a"]),
      long,
    );
    expect(issues.map((issue) => issue.code)).toContain("UNGROUNDED_PHRASE");
  });
});
