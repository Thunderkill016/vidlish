import { describe, expect, it } from "vitest";

import {
  challengeKindAcceptsTypedAnswer,
  challengeKindForSkill,
} from "./challenge-kind-for-skill";

describe("challengeKindForSkill", () => {
  it("gives every skill its own evidence dimension", () => {
    // The whole defect this replaces was four skills collapsing onto one kind,
    // so the property that matters is that no two skills share a kind.
    const kinds = (["listening", "speaking", "reading", "writing"] as const).map(
      challengeKindForSkill,
    );
    expect(new Set(kinds).size).toBe(kinds.length);
  });

  it("does not grade a speaking activity as a dictation", () => {
    // This is the exact line the route used to hard-code.
    expect(challengeKindForSkill("speaking")).not.toBe("dictation");
    expect(challengeKindForSkill("speaking")).toBe("spoken");
  });

  it("keeps listening on the dictation dimension already in the database", () => {
    // Listening evidence predates this rule and its column meaning must not
    // shift underneath the rows already written.
    expect(challengeKindForSkill("listening")).toBe("dictation");
  });

  it("refuses a typed answer only for speaking", () => {
    expect(challengeKindAcceptsTypedAnswer("spoken")).toBe(false);
    for (const kind of ["dictation", "written", "reading", "introduce_word"] as const) {
      expect(challengeKindAcceptsTypedAnswer(kind)).toBe(true);
    }
  });
});
