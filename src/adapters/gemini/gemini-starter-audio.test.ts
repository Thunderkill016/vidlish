import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import {
  buildGeminiStarterAudioPrompt,
  pcm16ToWav,
  readGeminiStarterAudio,
} from "./gemini-starter-audio";

describe("Gemini starter audio", () => {
  it("asks for exactly the reviewed learner text without a translation", () => {
    const prompt = buildGeminiStarterAudioPrompt("Hello.");

    expect(prompt).toContain("<learner-text>\nHello.\n</learner-text>");
    expect(prompt).toContain("exactly once");
    expect(prompt).not.toContain("Xin chào");
  });

  it("wraps signed PCM in a valid mono 24 kHz WAV container", () => {
    const pcm = Uint8Array.from([0, 0, 255, 127]);
    const wav = Buffer.from(pcm16ToWav(pcm));

    expect(wav.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.subarray(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(24_000);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(pcm.byteLength);
    expect(wav.subarray(44)).toEqual(Buffer.from(pcm));
  });

  it("rejects missing and malformed provider audio instead of serving a fake clip", () => {
    expect(() => readGeminiStarterAudio(undefined)).toThrow(/no audio payload/i);
    expect(() => pcm16ToWav(Uint8Array.from([1]))).toThrow(/malformed PCM/i);
  });

  it("honours sample-rate and channel metadata from Gemini", () => {
    const audio = readGeminiStarterAudio({
      data: Buffer.from([0, 0, 0, 0]).toString("base64"),
      sample_rate: 48_000,
      channels: 2,
    });
    const wav = Buffer.from(audio.body);

    expect(audio.contentType).toBe("audio/wav");
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(24)).toBe(48_000);
  });
});
