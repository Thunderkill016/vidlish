import { describe, expect, it } from "vitest";

import { envelopeOfSamples } from "./capture-speech-envelope";

const SAMPLE_RATE = 24_000; // What the curriculum audio is rendered at.

function sine(seconds: number, amplitude: number, hz = 200): Float32Array {
  const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = amplitude * Math.sin((2 * Math.PI * hz * index) / SAMPLE_RATE);
  }
  return samples;
}

describe("reducing audio to a loudness curve", () => {
  it("produces one frame every ten milliseconds", () => {
    const envelope = envelopeOfSamples(sine(1, 0.5), SAMPLE_RATE);
    expect(envelope.frameRate).toBe(100);
    expect(envelope.frames).toHaveLength(100);
  });

  it("measures RMS, so a steady tone reads as its own amplitude over root two", () => {
    const envelope = envelopeOfSamples(sine(0.5, 0.8), SAMPLE_RATE);
    for (const frame of envelope.frames) {
      expect(frame).toBeCloseTo(0.8 / Math.SQRT2, 2);
    }
  });

  it("reads digital silence as zero rather than as something faint", () => {
    const envelope = envelopeOfSamples(new Float32Array(SAMPLE_RATE), SAMPLE_RATE);
    expect(envelope.frames.every((frame) => frame === 0)).toBe(true);
  });

  it("keeps the shape of a sound that starts, stops and starts again", () => {
    // Loud, silent, loud — the three-frame pattern a rhythm measure must see.
    const loud = sine(0.2, 0.9);
    const quiet = new Float32Array(Math.round(0.2 * SAMPLE_RATE));
    const joined = new Float32Array(loud.length * 2 + quiet.length);
    joined.set(loud, 0);
    joined.set(quiet, loud.length);
    joined.set(loud, loud.length + quiet.length);

    const frames = envelopeOfSamples(joined, SAMPLE_RATE).frames;
    const peak = Math.max(...frames);
    const middle = frames[Math.floor(frames.length / 2)] ?? Number.NaN;

    expect(peak).toBeGreaterThan(0.5);
    expect(middle).toBeLessThan(peak * 0.1);
  });

  it("does not invent a frame from a partial one at the end", () => {
    // 1.005 s: five milliseconds too short for the 101st frame.
    const envelope = envelopeOfSamples(sine(1.005, 0.5), SAMPLE_RATE);
    expect(envelope.frames).toHaveLength(100);
  });

  it("works at whatever rate the device records at, not only the render rate", () => {
    const samples = new Float32Array(48_000);
    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = 0.6 * Math.sin((2 * Math.PI * 200 * index) / 48_000);
    }
    const envelope = envelopeOfSamples(samples, 48_000);
    expect(envelope.frames).toHaveLength(100);
    expect(envelope.frames[50]).toBeCloseTo(0.6 / Math.SQRT2, 2);
  });
});
