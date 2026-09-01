import { describe, expect, it } from "vitest";

import {
  STUDY_PROGRESS_VERSION,
  saveStudyProgressRequestSchema,
  studyProgressStateSchema,
} from "@/shared/contracts/study";

const base = {
  version: STUDY_PROGRESS_VERSION,
  comprehensionAnswers: [],
  clozeAttempts: [],
  masteredVocabulary: [],
};

describe("study progress state", () => {
  it("accepts one record per activity", () => {
    expect(
      studyProgressStateSchema.parse({
        ...base,
        comprehensionAnswers: [
          { index: 0, selectedIndex: 1 },
          { index: 1, selectedIndex: 3 },
        ],
        clozeAttempts: [{ index: 0, solved: true, revealed: false }],
        masteredVocabulary: [0, 4],
      }).masteredVocabulary,
    ).toEqual([0, 4]);
  });

  it("rejects a repeated answer, which would inflate the saved score", () => {
    expect(
      studyProgressStateSchema.safeParse({
        ...base,
        comprehensionAnswers: [
          { index: 0, selectedIndex: 1 },
          { index: 0, selectedIndex: 2 },
        ],
      }).success,
    ).toBe(false);
    expect(
      studyProgressStateSchema.safeParse({
        ...base,
        clozeAttempts: [
          { index: 1, solved: true, revealed: false },
          { index: 1, solved: false, revealed: true },
        ],
      }).success,
    ).toBe(false);
    expect(
      studyProgressStateSchema.safeParse({
        ...base,
        masteredVocabulary: [2, 2],
      }).success,
    ).toBe(false);
  });

  it("rejects positions no lesson can have", () => {
    expect(
      studyProgressStateSchema.safeParse({
        ...base,
        comprehensionAnswers: [{ index: 6, selectedIndex: 0 }],
      }).success,
    ).toBe(false);
    expect(
      studyProgressStateSchema.safeParse({
        ...base,
        comprehensionAnswers: [{ index: 0, selectedIndex: 4 }],
      }).success,
    ).toBe(false);
    expect(
      studyProgressStateSchema.safeParse({ ...base, masteredVocabulary: [20] })
        .success,
    ).toBe(false);
  });

  it("rejects unknown fields and a payload that owns the timestamps", () => {
    expect(
      studyProgressStateSchema.safeParse({ ...base, streak: 5 }).success,
    ).toBe(false);
    expect(
      saveStudyProgressRequestSchema.safeParse({
        state: base,
        completed: true,
        completedAt: "2026-08-18T00:00:00.000Z",
      }).success,
    ).toBe(false);
  });
});
