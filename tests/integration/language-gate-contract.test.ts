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
    const acquisition = workflow.indexOf("acquireNativeCaptionStep");
    const languageGate = workflow.indexOf("checkOriginalEnglishStep");
    const lesson = workflow.indexOf("generateLessonStep");

    expect(acquisition).toBeGreaterThan(-1);
    expect(languageGate).toBeGreaterThan(acquisition);
    expect(lesson).toBeGreaterThan(languageGate);
    expect(workflow).not.toMatch(
      /generateContent|Gemini|analyzeVideoAdapter|composeActivities|publishLesson/i,
    );
  });

  it("keeps durable step output free of video and transcript content", () => {
    const durableCode = `${workflow}\n${steps}`;
    expect(durableCode).not.toMatch(
      /videoTitle|channelName|segment\.text|transcript\.text/,
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
