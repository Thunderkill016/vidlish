import { describe, expect, it } from "vitest";

import {
  cefrLevelSchema,
  cefrOptions,
  confirmedLessonDraftSchema,
} from "@/shared/contracts/lesson-draft";

describe("lesson draft contracts", () => {
  it("exposes the canonical CEFR set without an implicit default", () => {
    expect(cefrLevelSchema.options).toEqual(["A1", "A2", "B1", "B2", "C1"]);
    expect(cefrOptions.map((option) => option.level)).toEqual([
      "A1",
      "A2",
      "B1",
      "B2",
      "C1",
    ]);
  });

  it("accepts only a bounded validated draft", () => {
    expect(
      confirmedLessonDraftSchema.parse({
        videoId: "dQw4w9WgXcQ",
        cefrLevel: "B1",
        metadataVersion: "fixture:v1",
      }),
    ).toEqual({
      videoId: "dQw4w9WgXcQ",
      cefrLevel: "B1",
      metadataVersion: "fixture:v1",
    });

    expect(
      confirmedLessonDraftSchema.safeParse({
        videoId: "bad",
        cefrLevel: "C2",
        metadataVersion: "",
      }).success,
    ).toBe(false);
  });
});
