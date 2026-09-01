import { describe, expect, it } from "vitest";

import {
  TranscriptNormalizationError,
  normalizeTranscript,
} from "@/modules/transcript/application/normalize-transcript";
import type { TranscriptCandidate } from "@/shared/contracts/transcript";

function candidate(): TranscriptCandidate {
  return {
    strategyId: "supadata-native-caption",
    provider: "supadata",
    sourceType: "native_caption",
    videoId: "dQw4w9WgXcQ",
    declaredLanguage: " en ",
    availableLanguages: ["vi", "en", "en"],
    trackKind: "unknown",
    translationStatus: "unknown",
    chunks: [
      { text: " Second\n line ", offsetMs: 2000, durationMs: 1000, language: "en" },
      { text: "  First   line  ", offsetMs: 0, durationMs: 1500, language: "en" },
      { text: "  First   line  ", offsetMs: 0, durationMs: 1500, language: "en" },
      { text: "   ", offsetMs: 4000, durationMs: 500, language: "en" },
      { text: "invalid", offsetMs: 5000, durationMs: 0, language: "en" },
    ],
  };
}

describe("normalizeTranscript", () => {
  it("sorts, cleans, deduplicates and creates stable IDs and hash", () => {
    const first = normalizeTranscript(candidate());
    const second = normalizeTranscript(candidate());

    expect(first).toEqual(second);
    expect(first.declaredLanguage).toBe("en");
    expect(first.availableLanguages).toEqual(["en", "vi"]);
    expect(first.segments).toHaveLength(2);
    expect(first.segments.map((segment) => segment.text)).toEqual([
      "First line",
      "Second line",
    ]);
    expect(first.segments[0]).toMatchObject({
      id: expect.stringMatching(/^seg_[a-f0-9]{32}$/),
      position: 0,
      startMs: 0,
      endMs: 1500,
    });
    expect(first.normalizedHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.durationMs).toBe(3000);
    expect(first).not.toHaveProperty("language");
  });

  it("changes the hash when source speech changes", () => {
    const original = normalizeTranscript(candidate());
    const changed = candidate();
    changed.chunks[0] = { ...changed.chunks[0], text: "Different source speech" };
    expect(normalizeTranscript(changed).normalizedHash).not.toBe(
      original.normalizedHash,
    );
  });

  it("rejects translated evidence and empty canonical results", () => {
    expect(() =>
      normalizeTranscript({ ...candidate(), translationStatus: "translated" }),
    ).toThrow(TranscriptNormalizationError);
    expect(() =>
      normalizeTranscript({
        ...candidate(),
        chunks: [{ text: " ", offsetMs: 0, durationMs: 100 }],
      }),
    ).toThrow(TranscriptNormalizationError);
  });
});
