import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const adapter = readFileSync(
  join(
    process.cwd(),
    "src/adapters/supadata/supadata-generated-transcript-strategy.ts",
  ),
  "utf8",
);
const workflow = readFileSync(
  join(process.cwd(), "src/adapters/inngest/generate-lesson-workflow.ts"),
  "utf8",
);
const runtime = readFileSync(
  join(
    process.cwd(),
    "src/platform/transcript/create-transcript-runtime.ts",
  ),
  "utf8",
);
const ci = readFileSync(
  join(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

describe("hosted generated transcript architecture contract", () => {
  it("registers native before generated and omits generated without a usable strategy", () => {
    expect(runtime.indexOf("nativeStrategy, order: 10")).toBeGreaterThan(-1);
    expect(runtime.indexOf("generatedStrategy, order: 20")).toBeGreaterThan(
      runtime.indexOf("nativeStrategy, order: 10"),
    );
    expect(runtime).toMatch(/if \(!config\.SUPADATA_API_KEY\) return undefined/);
  });

  it("uses only canonical YouTube URLs, generated mode and no language override", () => {
    expect(adapter).toMatch(/youtube\.com\/watch\?v=/);
    expect(adapter).toMatch(/set\("mode", "generate"\)/);
    expect(adapter).toMatch(/set\("text", "false"\)/);
    expect(adapter).not.toMatch(/searchParams\.set\("lang"/);
    expect(adapter).not.toMatch(/input\.url|sourceUrl|arbitraryUrl/);
  });

  it("polls durably after native acquisition and before the language gate", () => {
    const nativeIndex = workflow.indexOf('"acquire-native-caption"');
    const startIndex = workflow.indexOf('"start-hosted-generated-transcript"');
    const pollIndex = workflow.indexOf("poll-hosted-generated-");
    const generatedGateIndex = workflow.indexOf(
      '"check-original-english-generated"',
    );
    expect(nativeIndex).toBeGreaterThan(-1);
    expect(startIndex).toBeGreaterThan(nativeIndex);
    expect(pollIndex).toBeGreaterThan(startIndex);
    expect(generatedGateIndex).toBeGreaterThan(pollIndex);
    expect(workflow).toMatch(/generatedMaxPolls/);
    expect(workflow).toMatch(/step\.sleep/);
  });

  it("keeps provider and transcript content out of durable public output", () => {
    expect(workflow).not.toMatch(
      /candidate\.chunks|segment\.text|transcript\.text|providerRequestId/,
    );
    expect(workflow).not.toMatch(
      /LessonEngine|generateContent|Gemini|composeActivities|publishLesson/i,
    );
    expect(workflow).toMatch(/jobId/);
    expect(workflow).toMatch(/generatedOutcome/);
  });

  it("pins provider-free fixtures in CI", () => {
    expect(ci).toMatch(/TRANSCRIPT_GENERATED_ADAPTER: fixture/);
    expect(ci).toMatch(/TRANSCRIPT_REPOSITORY: fake/);
    expect(ci).not.toMatch(/SUPADATA_API_KEY:/);
  });
});
