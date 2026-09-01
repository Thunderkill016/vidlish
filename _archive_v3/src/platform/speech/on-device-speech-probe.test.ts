import { describe, expect, it, vi } from "vitest";

import {
  checkOnDeviceEnglishDictation,
  detectRecognizedTargetPhrase,
  installOnDeviceEnglishDictation,
  normalizeRecognizedEnglish,
  startOnDeviceSpeechProbe,
} from "./on-device-speech-probe";

describe("on-device speech probe", () => {
  it("normalizes recognition text without fuzzy-promoting unrelated phrases", () => {
    expect(normalizeRecognizedEnglish("  I'm A MEMBER of, the team! ")).toBe(
      "i'm a member of the team",
    );
    expect(
      detectRecognizedTargetPhrase("I'm a member of the design team.", [
        "a member of",
      ]),
    ).toEqual({ targetPhraseDetected: true, recognizedWordCount: 7 });
    expect(
      detectRecognizedTargetPhrase("I'm a member for the design team.", [
        "a member of",
      ]),
    ).toMatchObject({ targetPhraseDetected: false });
  });

  it("fails closed when strict on-device availability is absent", async () => {
    expect(await checkOnDeviceEnglishDictation({})).toBe("unsupported");
    expect(await installOnDeviceEnglishDictation({})).toBe(false);
  });

  it("checks and installs only processLocally English dictation", async () => {
    const available = vi.fn().mockResolvedValue("downloadable");
    const install = vi.fn().mockResolvedValue(true);
    class Recognition {}
    Object.assign(Recognition, { available, install });
    const scope = { SpeechRecognition: Recognition };

    expect(await checkOnDeviceEnglishDictation(scope)).toBe("downloadable");
    expect(available).toHaveBeenCalledWith({
      langs: ["en-US"],
      processLocally: true,
      quality: "dictation",
    });
    expect(await installOnDeviceEnglishDictation(scope)).toBe(true);
    expect(install).toHaveBeenCalledWith({
      langs: ["en-US"],
      processLocally: true,
      quality: "dictation",
    });
  });

  it("never exposes raw transcript and forces processLocally on a cloned live track", () => {
    const cloneStop = vi.fn();
    const clonedTrack = { stop: cloneStop } as unknown as MediaStreamTrack;
    const clone = vi.fn(() => clonedTrack);
    const audioTrack = { clone } as unknown as MediaStreamTrack;
    const start = vi.fn();
    const stop = vi.fn();
    const abort = vi.fn();
    const instances: Recognition[] = [];

    class Recognition {
      lang = "";
      continuous = true;
      interimResults = true;
      maxAlternatives = 3;
      processLocally = false;
      onresult: ((event: { results: ArrayLike<{ 0?: { transcript?: string } }> }) => void) | null = null;
      onerror: ((event: { error?: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start = start;
      stop = stop;
      abort = abort;

      constructor() {
        instances.push(this);
      }
    }

    const onResult = vi.fn();
    const controller = startOnDeviceSpeechProbe({
      audioTrack,
      targetPhrases: ["a member of"],
      onResult,
      scope: { SpeechRecognition: Recognition },
    });

    const instance = instances[0];
    expect(controller).not.toBeNull();
    expect(instance).toBeDefined();
    expect(clone).toHaveBeenCalledOnce();
    expect(start).toHaveBeenCalledWith(clonedTrack);
    expect(instance?.processLocally).toBe(true);

    instance?.onresult?.({
      results: [{ 0: { transcript: "I'm a member of the team PRIVATE" } }],
    });
    expect(onResult).toHaveBeenCalledWith({
      targetPhraseDetected: true,
      recognizedWordCount: 7,
    });
    expect(JSON.stringify(onResult.mock.calls)).not.toContain("PRIVATE");

    instance?.onend?.();
    expect(cloneStop).toHaveBeenCalledOnce();
  });
});
