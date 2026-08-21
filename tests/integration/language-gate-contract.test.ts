import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  join(process.cwd(), "src/workflows/generate-lesson.ts"),
  "utf8",
);
const steps = readFileSync(
  join(process.cwd(), "src/workflows/generate-lesson.steps.ts"),
  "utf8",
);
const policy = readFileSync(
  join(
    process.cwd(),
    "src/modules/language/application/default-language-policy.ts",
  ),
  "utf8",
);
const evaluator = readFileSync(
  join(
    process.cwd(),
    "src/modules/language/application/evaluate-language-eligibility.ts",
  ),
  "utf8",
);

describe("original-English gate architecture contract", () => {
  it("orders caption acquisition, language gating and lesson generation", () => {
    // Call sites, not imports. Imports are sorted by name, so matching the bare
    // identifier compared import order and passed for the wrong reason.
    const acquisition = workflow.indexOf("await acquireNativeCaptionStep(");
    const languageGate = workflow.indexOf("await checkOriginalEnglishStep(");
    // The guided session is the lesson now; v1 generation no longer runs. The
    // ordering this guards is unchanged — nothing may author before the
    // original-English gate has spoken.
    const lesson = workflow.indexOf("await diagnoseLearningLessonStep(");

    expect(acquisition).toBeGreaterThan(-1);
    expect(languageGate).toBeGreaterThan(acquisition);
    expect(lesson).toBeGreaterThan(languageGate);
    expect(workflow).not.toMatch(
      /generateContent|Gemini|analyzeVideoAdapter|composeActivities|publishLesson/i,
    );
  });

  it("keeps durable step output free of video and transcript content", () => {
    // What crosses the durable boundary is what a step *returns* — that is what
    // lands in workflow history. Grepping the whole file instead flagged code
    // that merely reads a title to hand to a service in-process, which never
    // leaves the step, while a banned word inside a comment would fail it too.
    const durableCode = `${workflow}\n${steps}`;
    const returned = [...durableCode.matchAll(/return\s*\{[^}]*\}/g)]
      .map((match) => match[0])
      .join("\n");
    expect(returned).not.toMatch(
      /videoTitle|channelName|segment\.text|transcript\.text|\btext\b/,
    );
    expect(workflow).toMatch(/jobId/);
    expect(steps).toMatch(/ownerUserId/);
    expect(steps).toMatch(/outcome\.kind/);
  });

  it("uses one versioned policy and never reads declared caption language", () => {
    expect(policy).toMatch(/original-english:v1|LANGUAGE_POLICY_VERSION/);
    expect(policy).toMatch(/mainMinEnglishShare/);
    expect(policy).toMatch(/mixedMinCoherentDurationMs/);
    expect(evaluator).not.toMatch(/declaredLanguage|availableLanguages/);
    expect(evaluator).toMatch(/permittedSegmentIds/);
  });
});
