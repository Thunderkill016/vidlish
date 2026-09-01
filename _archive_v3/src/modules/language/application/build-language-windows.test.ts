import { describe, expect, it } from "vitest";

import {
  buildLanguageWindows,
  countLanguageWords,
} from "@/modules/language/application/build-language-windows";
import { defaultLanguageEligibilityPolicy } from "@/modules/language/application/default-language-policy";
import { canonicalTranscriptSchema } from "@/shared/contracts/transcript";

const transcript = canonicalTranscriptSchema.parse({
  videoId: "dQw4w9WgXcQ",
  strategyId: "supadata-native-caption",
  provider: "supadata",
  sourceType: "native_caption",
  declaredLanguage: "en",
  availableLanguages: ["en"],
  trackKind: "unknown",
  translationStatus: "unknown",
  normalizedHash: "a".repeat(64),
  normalizationVersion: "transcript-normalization:v1",
  durationMs: 55_000,
  segments: [
    {
      id: `seg_${"1".repeat(32)}`,
      position: 0,
      startMs: 0,
      endMs: 10_000,
      text: "People learn patterns when they listen to complete ideas in context.",
    },
    {
      id: `seg_${"2".repeat(32)}`,
      position: 1,
      startMs: 10_500,
      endMs: 20_000,
      text: "They can pause, repeat useful phrases, and compare the speaker's rhythm.",
    },
    {
      id: `seg_${"3".repeat(32)}`,
      position: 2,
      startMs: 45_000,
      endMs: 55_000,
      text: "A later section starts after a long silent gap in the source.",
    },
  ],
});

describe("buildLanguageWindows", () => {
  it("builds stable windows and splits on a policy-defined long gap", () => {
    const policy = {
      ...defaultLanguageEligibilityPolicy,
      targetWindowWords: 30,
      maxWindowGapMs: 4_000,
    };

    const first = buildLanguageWindows(transcript, policy);
    const second = buildLanguageWindows(transcript, policy);

    expect(first).toEqual(second);
    expect(first).toHaveLength(2);
    expect(first[0].segmentIds).toEqual([
      `seg_${"1".repeat(32)}`,
      `seg_${"2".repeat(32)}`,
    ]);
    expect(first[1].segmentIds).toEqual([`seg_${"3".repeat(32)}`]);
    expect(first.every((window) => /^win_[a-f0-9]{24}$/.test(window.id))).toBe(
      true,
    );
  });

  it("counts Unicode words and keeps apostrophe forms together", () => {
    expect(countLanguageWords("don't stop learning tiếng Việt mỗi ngày")).toBe(7);
  });
});
