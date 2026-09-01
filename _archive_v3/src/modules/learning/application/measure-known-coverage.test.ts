import { describe, expect, it } from "vitest";
import { measureKnownCoverage } from "./measure-known-coverage";

const known = new Set(["i", "have", "a", "the", "cat"]);

describe("measureKnownCoverage", () => {
  it("counts running words, not distinct ones", () => {
    // A word appearing three times is three chances to stumble, not one.
    const result = measureKnownCoverage({
      text: "the cat the cat the dog",
      known,
    });

    expect(result.total).toBe(6);
    expect(result.covered).toBe(5);
  });

  it("lists each unknown word once, in the order it appears", () => {
    const result = measureKnownCoverage({
      text: "the dog and the dog and a bird",
      known,
    });

    expect(result.unknown).toEqual(["dog", "and", "bird"]);
  });

  it("calls a text readable only at the researched floor", () => {
    const twenty = `${"the cat ".repeat(9)}the dog`;
    const result = measureKnownCoverage({ text: twenty, known });

    // 19 of 20 is 95%: the floor for understanding anything at all.
    expect(result.coverage).toBeCloseTo(0.95, 5);
    expect(result.readable).toBe(true);
    expect(result.readableWithoutSupport).toBe(false);
  });

  it("does not score an empty text as fully understood", () => {
    // Reporting 100% here would put a perfect number on the progress page for
    // a learner who knows nothing.
    const result = measureKnownCoverage({ text: "   ", known });

    expect(result).toMatchObject({
      total: 0,
      coverage: 0,
      readable: false,
      readableWithoutSupport: false,
    });
  });

  it("moves only when the learner's evidence moves", () => {
    const text = "i have a dog";
    const before = measureKnownCoverage({ text, known });
    const after = measureKnownCoverage({
      text,
      known: new Set([...known, "dog"]),
    });

    expect(before.coverage).toBeCloseTo(0.75, 5);
    expect(after.coverage).toBe(1);
  });
});
