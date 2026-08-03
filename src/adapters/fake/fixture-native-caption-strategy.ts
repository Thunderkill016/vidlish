import "server-only";

import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import {
  NATIVE_CAPTION_STRATEGY_ID,
  transcriptStrategyResultSchema,
  type TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

export class FixtureNativeCaptionStrategy implements TranscriptStrategy {
  readonly id = NATIVE_CAPTION_STRATEGY_ID;

  async acquire(input: { videoId: string }): Promise<TranscriptStrategyResult> {
    if (input.videoId === "nocaptions01") {
      return transcriptStrategyResultSchema.parse({
        kind: "not_applicable",
        reason: "NO_USABLE_CAPTIONS",
      });
    }
    if (input.videoId === "translated01") {
      return transcriptStrategyResultSchema.parse({
        kind: "success",
        candidate: {
          strategyId: NATIVE_CAPTION_STRATEGY_ID,
          provider: "supadata",
          sourceType: "native_caption",
          videoId: input.videoId,
          declaredLanguage: "en",
          availableLanguages: ["en", "vi"],
          trackKind: "unknown",
          translationStatus: "translated",
          chunks: [
            { text: "Synthetic translated text.", offsetMs: 0, durationMs: 1500, language: "en" },
          ],
        },
      });
    }
    if (input.videoId === "captionrate1") {
      return transcriptStrategyResultSchema.parse({
        kind: "retryable_failure",
        reason: "PROVIDER_RATE_LIMITED",
      });
    }

    return transcriptStrategyResultSchema.parse({
      kind: "success",
      candidate: {
        strategyId: NATIVE_CAPTION_STRATEGY_ID,
        provider: "supadata",
        sourceType: "native_caption",
        videoId: input.videoId,
        declaredLanguage: "en",
        availableLanguages: ["en"],
        trackKind: "unknown",
        translationStatus: "unknown",
        chunks: [
          {
            text: "  Learning from real speech helps you notice patterns. ",
            offsetMs: 0,
            durationMs: 3200,
            language: "en",
          },
          {
            text: "You can pause, listen again, and test your understanding.",
            offsetMs: 3400,
            durationMs: 4100,
            language: "en",
          },
        ],
      },
    });
  }
}
