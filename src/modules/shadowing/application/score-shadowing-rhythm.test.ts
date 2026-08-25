import { describe, expect, it } from "vitest";

import { scoreShadowingRhythm, type SpeechEnvelope } from "./score-shadowing-rhythm";

const FRAME_RATE = 100;

/** A crude syllable-shaped envelope: `beats` bumps, then trailing silence. */
function envelope(beats: number, framesPerBeat: number, trailingSilence = 0): SpeechEnvelope {
  const frames: number[] = [];
  for (let beat = 0; beat < beats; beat += 1) {
    for (let frame = 0; frame < framesPerBeat; frame += 1) {
      // Rises and falls across each beat, so the contour has something to correlate.
      const phase = frame / framesPerBeat;
      frames.push(0.2 + 0.8 * Math.sin(Math.PI * phase));
    }
  }
  for (let frame = 0; frame < trailingSilence; frame += 1) frames.push(0);
  return { frames, frameRate: FRAME_RATE };
}

describe("scoring a shadowed line on timing", () => {
  const reference = envelope(6, 10);

  it("refuses to score a silent recording rather than calling it perfect", () => {
    const silence: SpeechEnvelope = {
      frames: Array.from({ length: 100 }, () => 0),
      frameRate: FRAME_RATE,
    };
    expect(
      scoreShadowingRhythm({ learner: silence, reference, syllables: 6 }),
    ).toEqual({ kind: "no_speech" });
  });

  it("treats room tone as no speech, not as very quiet speech", () => {
    const roomTone: SpeechEnvelope = {
      frames: Array.from({ length: 100 }, () => 0.004),
      frameRate: FRAME_RATE,
    };
    expect(
      scoreShadowingRhythm({ learner: roomTone, reference, syllables: 6 }),
    ).toEqual({ kind: "no_speech" });
  });

  it("calls an identical repetition tracking and matching", () => {
    const score = scoreShadowingRhythm({
      learner: envelope(6, 10),
      reference,
      syllables: 6,
    });
    if (score.kind !== "scored") throw new Error("expected a score");

    expect(score.rateRatio).toBeCloseTo(1, 5);
    expect(score.envelopeCorrelation).toBeCloseTo(1, 5);
    expect(score.timing).toBe("tracking");
    expect(score.contour).toBe("matching");
  });

  it("hears a learner reciting at half the model's speed", () => {
    const score = scoreShadowingRhythm({
      learner: envelope(6, 20),
      reference,
      syllables: 6,
    });
    if (score.kind !== "scored") throw new Error("expected a score");

    expect(score.rateRatio).toBeCloseTo(0.5, 5);
    expect(score.timing).toBe("slower_than_model");
  });

  it("hears a learner racing ahead of the model", () => {
    const score = scoreShadowingRhythm({
      learner: envelope(6, 5),
      reference,
      syllables: 6,
    });
    if (score.kind !== "scored") throw new Error("expected a score");

    expect(score.rateRatio).toBeCloseTo(2, 5);
    expect(score.timing).toBe("faster_than_model");
  });

  it("does not let a flat monotone pass as a matching contour", () => {
    // Same duration, same loudness, no rhythm at all — the exact failure a word
    // scorer cannot see and this measure exists to catch.
    const monotone: SpeechEnvelope = {
      frames: Array.from({ length: 60 }, () => 0.6),
      frameRate: FRAME_RATE,
    };
    const score = scoreShadowingRhythm({ learner: monotone, reference, syllables: 6 });
    if (score.kind !== "scored") throw new Error("expected a score");

    expect(score.timing).toBe("tracking");
    expect(score.contour).toBe("drifting");
    expect(score.envelopeCorrelation).toBe(0);
  });

  it("ignores the silence a device leaves at the end of a recording", () => {
    const withTail = scoreShadowingRhythm({
      learner: envelope(6, 10, 50),
      reference,
      syllables: 6,
    });
    if (withTail.kind !== "scored") throw new Error("expected a score");

    expect(withTail.rateRatio).toBeCloseTo(1, 5);
    expect(withTail.envelopeCorrelation).toBeCloseTo(1, 5);
  });
});
