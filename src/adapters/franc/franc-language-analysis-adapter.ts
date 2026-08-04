import "server-only";

import { francAll } from "franc-min";

import type { LanguageAnalysisPort } from "@/modules/language/ports/language-analysis-port";
import {
  LANGUAGE_DETECTOR_ID,
  LANGUAGE_DETECTOR_VERSION,
  languageAnalysisResultSchema,
  languageWindowResultSchema,
  type LanguageAnalysisResult,
  type LanguageAnalysisWindow,
  type LanguageReliabilityBand,
} from "@/shared/contracts/language-eligibility";

function mapDetectorCode(code: string): string {
  if (code === "eng") return "en";
  if (code === "und") return "und";
  return code;
}

function reliabilityFor(
  code: string,
  wordCount: number,
  characterCount: number,
  minWindowWords: number,
): LanguageReliabilityBand {
  if (
    code === "und" ||
    wordCount < minWindowWords ||
    characterCount < 40
  ) {
    return "low";
  }
  if (wordCount >= 40 && characterCount >= 180) return "high";
  return "medium";
}

export class FrancLanguageAnalysisAdapter implements LanguageAnalysisPort {
  constructor(
    private readonly options: {
      minWindowWords: number;
      detectorMinLength?: number;
    },
  ) {}

  async analyze(
    windows: LanguageAnalysisWindow[],
  ): Promise<LanguageAnalysisResult> {
    return languageAnalysisResultSchema.parse({
      detectorId: LANGUAGE_DETECTOR_ID,
      detectorVersion: LANGUAGE_DETECTOR_VERSION,
      windows: windows.map((window) => {
        const ranking = francAll(window.text, {
          minLength: this.options.detectorMinLength ?? 20,
        });
        const detectorCode = ranking[0]?.[0] ?? "und";
        const bestScore = ranking[0]?.[1];
        const secondScore = ranking[1]?.[1];
        const characterCount = [...window.text].length;

        return languageWindowResultSchema.parse({
          windowId: window.id,
          segmentIds: window.segmentIds,
          startMs: window.startMs,
          endMs: window.endMs,
          wordCount: window.wordCount,
          characterCount,
          detectorCode,
          detectedLanguage: mapDetectorCode(detectorCode),
          reliability: reliabilityFor(
            detectorCode,
            window.wordCount,
            characterCount,
            this.options.minWindowWords,
          ),
          ...(bestScore !== undefined && Number.isFinite(bestScore)
            ? { rawBestScore: bestScore }
            : {}),
          ...(secondScore !== undefined && Number.isFinite(secondScore)
            ? { rawSecondScore: secondScore }
            : {}),
        });
      }),
    });
  }
}
