import { describe, expect, it } from "vitest";

describe("Golden study preload", () => {
  it("forces the canonical study process into locked study mode", async () => {
    const previous = process.env.GOLDEN_STUDY_MODE;
    try {
      delete process.env.GOLDEN_STUDY_MODE;
      await import(`./golden-study-preload.mjs?test=${Date.now()}`);
      expect(process.env.GOLDEN_STUDY_MODE).toBe("true");
    } finally {
      if (previous === undefined) delete process.env.GOLDEN_STUDY_MODE;
      else process.env.GOLDEN_STUDY_MODE = previous;
    }
  });
});
