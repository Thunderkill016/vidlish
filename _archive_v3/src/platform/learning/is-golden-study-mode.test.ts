import { describe, expect, it } from "vitest";

import { isGoldenStudyMode } from "./is-golden-study-mode";

describe("isGoldenStudyMode", () => {
  it("is enabled only by the explicit server-side study flag", () => {
    expect(isGoldenStudyMode({ GOLDEN_STUDY_MODE: "true" })).toBe(true);
    expect(isGoldenStudyMode({ GOLDEN_STUDY_MODE: "false" })).toBe(false);
    expect(isGoldenStudyMode({})).toBe(false);
  });

  it("does not reinterpret truthy-looking values", () => {
    expect(isGoldenStudyMode({ GOLDEN_STUDY_MODE: "1" })).toBe(false);
    expect(isGoldenStudyMode({ GOLDEN_STUDY_MODE: "TRUE" })).toBe(false);
  });
});
