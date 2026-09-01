import { describe, expect, it } from "vitest";

import { scoreElicitedImitation } from "./score-elicited-imitation";

const target = "I did not hear the question.";

describe("scoreElicitedImitation", () => {
  it("gives a perfect repetition no errors", () => {
    const score = scoreElicitedImitation({ target, heard: "i did not hear the question" });
    expect(score.errors).toBe(0);
    expect(score.wer).toBe(0);
    expect(score.accuracy).toBe(1);
  });

  it("charges one error for one dropped word, not for the shift it causes", () => {
    // This is the reason the dictation scorer could not be reused. Dropping the
    // first word moves every later word one position left; a positional
    // comparison calls that six errors, and the learner is told they failed a
    // sentence they almost entirely produced.
    const score = scoreElicitedImitation({ target, heard: "did not hear the question" });
    expect(score.errors).toBe(1);
  });

  it("counts an inserted word", () => {
    const score = scoreElicitedImitation({
      target,
      heard: "i did not really hear the question",
    });
    expect(score.errors).toBe(1);
  });

  it("counts a substitution once", () => {
    const score = scoreElicitedImitation({ target, heard: "i did not hear the answer" });
    expect(score.errors).toBe(1);
  });

  it("ignores case, punctuation and contraction spelling", () => {
    // A recogniser writes `dont` or `don't` for one sound, and the learner must
    // not be marked down for the transcriber's convention.
    const score = scoreElicitedImitation({
      target: "I don't know.",
      heard: "i dont know",
    });
    expect(score.errors).toBe(0);
  });

  it("never reports a rate above one", () => {
    // Saying far more than the sentence is a failure, not a score off the end
    // of the scale that would drag an average anywhere it likes.
    const score = scoreElicitedImitation({
      target: "I am tired.",
      heard: "one two three four five six seven eight nine ten",
    });
    expect(score.wer).toBe(1);
    expect(score.accuracy).toBe(0);
  });

  it("treats silence as everything missed, not as a pass", () => {
    const score = scoreElicitedImitation({ target, heard: "" });
    expect(score.errors).toBe(6);
    expect(score.wer).toBe(1);
  });
});
