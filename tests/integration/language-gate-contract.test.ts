import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  join(process.cwd(), "src/adapters/inngest/generate-lesson-workflow.ts"),
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
  it("runs acquisition before the language gate and stops before Lesson Engine", () => {
    expect(workflow.indexOf('"acquire-native-caption"')).toBeGreaterThan(-1);
    expect(workflow.indexOf('"check-original-english"')).toBeGreaterThan(
      workflow.indexOf('"acquire-native-caption"'),
    );
    expect(workflow).not.toMatch(
      /LessonEngine|generateContent|generateLesson|Gemini|analyzeVideoAdapter/i,
    );
  });

  it("keeps durable step output free of video and transcript content", () => {
    expect(workflow).not.toMatch(/videoTitle|channelName|segment\.text|transcript\.text/);
    expect(workflow).toMatch(/jobId/);
    expect(workflow).toMatch(/ownerUserId/);
    expect(workflow).toMatch(/reportId/);
  });

  it("uses one versioned policy and never reads declared caption language", () => {
    expect(policy).toMatch(/original-english:v1|LANGUAGE_POLICY_VERSION/);
    expect(policy).toMatch(/mainMinEnglishShare/);
    expect(policy).toMatch(/mixedMinCoherentDurationMs/);
    expect(evaluator).not.toMatch(/declaredLanguage|availableLanguages/);
    expect(evaluator).toMatch(/permittedSegmentIds/);
  });
});
