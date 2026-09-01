import { describe, expect, it } from "vitest";

import { defaultLanguageEligibilityPolicy } from "@/modules/language/application/default-language-policy";
import { evaluateLanguageEligibility } from "@/modules/language/application/evaluate-language-eligibility";
import {
  LANGUAGE_DETECTOR_ID,
  LANGUAGE_DETECTOR_VERSION,
  type LanguageAnalysisResult,
  type LanguageReliabilityBand,
  type LanguageWindowResult,
} from "@/shared/contracts/language-eligibility";

function languageWindow(input: {
  index: number;
  startMs: number;
  durationMs: number;
  words: number;
  language: "en" | "vie" | "und";
  reliability?: LanguageReliabilityBand;
}): LanguageWindowResult {
  const hex = input.index.toString(16);
  return {
    windowId: `win_${hex.repeat(24).slice(0, 24)}`,
    segmentIds: [`seg_${hex.repeat(32).slice(0, 32)}`],
    startMs: input.startMs,
    endMs: input.startMs + input.durationMs,
    wordCount: input.words,
    characterCount: Math.max(40, input.words * 6),
    detectorCode:
      input.language === "en"
        ? "eng"
        : input.language === "vie"
          ? "vie"
          : "und",
    detectedLanguage: input.language,
    reliability: input.reliability ?? "high",
  };
}

function analysis(windows: LanguageWindowResult[]): LanguageAnalysisResult {
  return {
    detectorId: LANGUAGE_DETECTOR_ID,
    detectorVersion: LANGUAGE_DETECTOR_VERSION,
    windows,
  };
}

function evaluate(windows: LanguageWindowResult[]) {
  return evaluateLanguageEligibility({
    transcriptHash: "a".repeat(64),
    allSegmentIds: windows.flatMap((window) => window.segmentIds),
    analysis: analysis(windows),
    policy: defaultLanguageEligibilityPolicy,
  });
}

describe("evaluateLanguageEligibility", () => {
  it("accepts a predominantly English source through the main policy path", () => {
    const windows = Array.from({ length: 4 }, (_, index) =>
      languageWindow({
        index: index + 1,
        startMs: index * 30_000,
        durationMs: 30_000,
        words: 40,
        language: "en",
      }),
    );

    const report = evaluate(windows);

    expect(report).toMatchObject({
      status: "eligible",
      reason: "SUFFICIENT_ORIGINAL_ENGLISH",
      englishShare: 1,
      coherentEnglishDurationMs: 120_000,
      reliableEnglishWordCount: 160,
    });
    expect(report.permittedSegmentIds).toEqual(report.englishSegmentIds);
    expect(report.excludedSegmentIds).toEqual([]);
  });

  it("accepts a long coherent English portion inside a mixed-language source", () => {
    const windows: LanguageWindowResult[] = [];
    for (let index = 0; index < 4; index += 1) {
      windows.push(
        languageWindow({
          index: index + 1,
          startMs: index * 45_000,
          durationMs: 45_000,
          words: 80,
          language: "en",
        }),
      );
    }
    for (let index = 0; index < 8; index += 1) {
      windows.push(
        languageWindow({
          index: index + 5,
          startMs: (index + 4) * 45_000,
          durationMs: 45_000,
          words: 50,
          language: "vie",
        }),
      );
    }

    const report = evaluate(windows);

    expect(report.status).toBe("eligible");
    expect(report.reason).toBe(
      "SUFFICIENT_MIXED_LANGUAGE_ENGLISH_PORTION",
    );
    expect(report.englishShare).toBeCloseTo(1 / 3, 5);
    expect(report.coherentEnglishDurationMs).toBe(180_000);
    expect(report.reliableEnglishWordCount).toBe(320);
    expect(report.permittedSegmentIds).toHaveLength(4);
    expect(report.excludedSegmentIds).toHaveLength(8);
  });

  it("rejects reliable non-English speech and ignores isolated low-confidence English words", () => {
    const windows = [
      languageWindow({
        index: 1,
        startMs: 0,
        durationMs: 10_000,
        words: 3,
        language: "en",
        reliability: "low",
      }),
      ...Array.from({ length: 5 }, (_, index) =>
        languageWindow({
          index: index + 2,
          startMs: 10_000 + index * 30_000,
          durationMs: 30_000,
          words: 50,
          language: "vie",
        }),
      ),
    ];

    const report = evaluate(windows);

    expect(report).toMatchObject({
      status: "ineligible",
      reason: "INSUFFICIENT_ORIGINAL_ENGLISH",
      reliableEnglishWordCount: 0,
      coherentEnglishDurationMs: 0,
    });
    expect(report.englishSegmentIds).toEqual([]);
    expect(report.permittedSegmentIds).toEqual([]);
    expect(report.excludedSegmentIds).toHaveLength(6);
  });

  it("returns insufficient evidence instead of a false unsupported-language decision", () => {
    const report = evaluate([
      languageWindow({
        index: 1,
        startMs: 0,
        durationMs: 30_000,
        words: 50,
        language: "en",
      }),
    ]);

    expect(report).toMatchObject({
      status: "insufficient_evidence",
      reason: "TRANSCRIPT_EVIDENCE_TOO_WEAK",
      confidenceBand: "low",
    });
    expect(report.permittedSegmentIds).toEqual([]);
  });
});
