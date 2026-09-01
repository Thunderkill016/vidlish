import { describe, expect, it } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { selectSpeakingPractice } from "./select-speaking-practice";

const REQUESTED_SESSION = "11111111-1111-4111-8111-111111111111";
const FALLBACK_SESSION = "22222222-2222-4222-8222-222222222222";
const REQUESTED_VERSION = "33333333-3333-4333-8333-333333333333";
const FALLBACK_VERSION = "44444444-4444-4444-8444-444444444444";

describe("selectSpeakingPractice", () => {
  it("does not jump to another lesson when an explicit session cannot resolve", () => {
    const result = selectSpeakingPractice({
      sessions: [
        { id: REQUESTED_SESSION, lessonVersionId: REQUESTED_VERSION },
        { id: FALLBACK_SESSION, lessonVersionId: FALLBACK_VERSION },
      ],
      blueprintsByVersion: new Map([
        [REQUESTED_VERSION, null],
        [FALLBACK_VERSION, createGoldenSessionLearningBlueprint()],
      ]),
      requestedSessionId: REQUESTED_SESSION,
    });

    expect(result).toBeNull();
  });

  it("selects bounded support and local recognition phrases without leaking evaluation into the learner view", () => {
    const result = selectSpeakingPractice({
      sessions: [
        { id: REQUESTED_SESSION, lessonVersionId: REQUESTED_VERSION },
        { id: FALLBACK_SESSION, lessonVersionId: FALLBACK_VERSION },
      ],
      blueprintsByVersion: new Map([
        [REQUESTED_VERSION, null],
        [FALLBACK_VERSION, createGoldenSessionLearningBlueprint()],
      ]),
      requestedSessionId: null,
    });

    expect(result?.sessionId).toBe(FALLBACK_SESSION);
    expect(result?.activity.activityType).toBe("guided_transfer");
    expect(result?.activity).not.toHaveProperty("evaluation");
    expect(result?.exemplarAfterAttempt).toBe(
      "I'm a member of the product design team.",
    );
    expect(result?.recognitionTargetPhrases).toEqual(["a member of"]);
  });
});
