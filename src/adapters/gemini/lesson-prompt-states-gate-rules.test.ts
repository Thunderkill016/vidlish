import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Every rule the deterministic gate rejects on has to be stated in the prompt.
 *
 * Production showed why: a job failed six times on `UNGROUNDED_PHRASE`. The gate
 * requires a phrase to appear inside the segments the model *cited*, and the
 * prompt only said "teach language that appears in the transcript" — so a model
 * could pick a real phrase from the video, cite the wrong segment, and be
 * rejected for following the instructions it was given.
 *
 * A gate rule the prompt never states is not a model failure. It is a rule the
 * model was never told about, and no amount of paying for a better model fixes
 * that.
 */
const PROMPT = readFileSync(
  path.normalize("src/adapters/gemini/gemini-lesson-provider.ts"),
  "utf8",
);
const VALIDATOR = readFileSync(
  path.normalize("src/modules/lesson/application/validate-generated-lesson-quality.ts"),
  "utf8",
);

describe("the v1 prompt states what the gate enforces", () => {
  it("tells the model a taught item must sit inside the segments it cites", () => {
    expect(PROMPT).toContain("sourceSegmentIds");
    expect(PROMPT).toMatch(/NGUYÊN VĂN bên trong chính những segment/);
  });

  it("tells the model a cloze sentence carries exactly one blank", () => {
    expect(PROMPT).toMatch(/ĐÚNG MỘT chỗ trống/);
    expect(PROMPT).toContain("___");
  });

  it("keeps every rejection code accounted for", () => {
    // If a new code appears in the validator, someone has to decide whether the
    // prompt needs to say something about it. Failing here is the prompt asking
    // for that decision, not a bug.
    const codes = new Set(
      VALIDATOR.slice(
        VALIDATOR.indexOf("export type LessonQualityIssueCode"),
        VALIDATOR.indexOf(";", VALIDATOR.indexOf("export type LessonQualityIssueCode")),
      )
        .match(/"([A-Z_]+)"/g)
        ?.map((code) => code.slice(1, -1)) ?? [],
    );

    expect([...codes].sort()).toEqual([
      "COPIED_EXAMPLE",
      "DUPLICATE_PHRASE",
      "DUPLICATE_QUESTION_OPTIONS",
      "DUPLICATE_VOCABULARY",
      "INVALID_CLOZE_BLANK",
      "UNGROUNDED_CLOZE_ANSWER",
      "UNGROUNDED_PHRASE",
      "UNGROUNDED_VOCABULARY_TERM",
    ]);
  });
});
