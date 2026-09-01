import { describe, expect, it } from "vitest";
import {
  buildBeginnerInputPrompt,
  readSentences,
} from "./gemini-beginner-input-provider";

describe("buildBeginnerInputPrompt", () => {
  it("names the target and every permitted word", () => {
    const prompt = buildBeginnerInputPrompt({
      target: "water",
      known: ["the", "i", "have"],
      count: 6,
    });

    expect(prompt).toContain("TỪ MỚI cần dạy: water");
    expect(prompt).toContain("have, i, the");
    expect(prompt).toContain("Viết 6 câu");
  });

  it("states the size of the permitted list", () => {
    // The model behaves differently with three words than with three hundred,
    // and it cannot tell which it has without being told.
    const prompt = buildBeginnerInputPrompt({
      target: "water",
      known: ["the", "i", "have"],
      count: 6,
    });

    expect(prompt).toContain("(3 từ)");
  });

  it("says so plainly when the learner knows nothing yet", () => {
    const prompt = buildBeginnerInputPrompt({
      target: "water",
      known: [],
      count: 3,
    });

    expect(prompt).toContain("(chưa có từ nào)");
  });
});

describe("readSentences", () => {
  it("reads the sentences a well-formed response carries", () => {
    expect(readSentences({ sentences: ["I have the water."] })).toEqual([
      "I have the water.",
    ]);
  });

  it("drops entries that are the right JSON but the wrong type", () => {
    // This is the failure that reaches production: it survives JSON.parse and
    // breaks somewhere else entirely.
    expect(
      readSentences({ sentences: ["ok", 42, null, { text: "no" }, "  "] }),
    ).toEqual(["ok"]);
  });

  it("returns nothing rather than throwing on a wrong shape", () => {
    expect(readSentences({ sentences: "I have the water." })).toEqual([]);
    expect(readSentences(null)).toEqual([]);
    expect(readSentences("[]")).toEqual([]);
  });
});
