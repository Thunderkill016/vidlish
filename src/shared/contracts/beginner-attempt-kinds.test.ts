import { describe, expect, it } from "vitest";

import { beginnerAttemptRequestSchema } from "./beginner-session";

const CHALLENGE = "11111111-1111-4111-8111-111111111111";
const base = { challengeId: CHALLENGE, usedSupport: false };

describe("beginner attempt kinds", () => {
  it("keeps each skill's answer field to its own kind", () => {
    // The browser picks the kind it sends, and the route refuses one that
    // disagrees with the server-issued challenge. That check is only worth
    // anything if the shapes cannot be quietly interchanged here.
    expect(
      beginnerAttemptRequestSchema.safeParse({
        ...base,
        kind: "spoken",
        heard: "my name is",
      }).success,
    ).toBe(false);

    expect(
      beginnerAttemptRequestSchema.safeParse({
        ...base,
        kind: "dictation",
        transcript: "my name is",
      }).success,
    ).toBe(false);
  });

  it("rejects an attempt carrying two answers at once", () => {
    // Sending both fields would let a client satisfy whichever kind the server
    // happened to hold, which is exactly the substitution being prevented.
    expect(
      beginnerAttemptRequestSchema.safeParse({
        ...base,
        kind: "spoken",
        transcript: "my name is",
        heard: "my name is",
      }).success,
    ).toBe(false);
  });

  it("accepts each skill's own shape", () => {
    const valid = [
      { kind: "dictation", heard: "my name is" },
      { kind: "spoken", transcript: "my name is" },
      { kind: "written", written: "my name is" },
      { kind: "reading", chosenVi: "tên tôi là" },
      { kind: "introduce_word", claimedIndependent: true },
    ];
    for (const body of valid) {
      const parsed = beginnerAttemptRequestSchema.safeParse({ ...base, ...body });
      expect(parsed.success, `${body.kind} should parse`).toBe(true);
    }
  });

  it("never lets a reading answer be empty", () => {
    // An empty choice would compare equal to nothing and read as a wrong
    // answer rather than as a client that sent no answer at all.
    expect(
      beginnerAttemptRequestSchema.safeParse({
        ...base,
        kind: "reading",
        chosenVi: "",
      }).success,
    ).toBe(false);
  });
});
