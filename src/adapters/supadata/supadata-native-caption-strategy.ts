import "server-only";

import { z } from "zod";

import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import {
  NATIVE_CAPTION_STRATEGY_ID,
  transcriptCandidateSchema,
  transcriptStrategyResultSchema,
  type TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

const supadataChunkSchema = z
  .object({
    text: z.string(),
    offset: z.number().int().nonnegative(),
    duration: z.number().int().nonnegative(),
    lang: z.string().min(1).max(35),
  })
  .strict();

const supadataTranscriptSchema = z
  .object({
    content: z.array(supadataChunkSchema),
    lang: z.string().min(1).max(35),
    availableLangs: z.array(z.string().min(1).max(35)).max(100),
  })
  .strict();

const supadataErrorSchema = z
  .object({
    error: z.string().min(1).max(100),
    message: z.string().optional(),
    details: z.string().optional(),
    documentationUrl: z.string().url().optional(),
  })
  .passthrough();

export class SupadataNativeCaptionStrategy implements TranscriptStrategy {
  readonly id = NATIVE_CAPTION_STRATEGY_ID;

  constructor(
    private readonly options: {
      apiKey: string;
      timeoutMs: number;
      fetchImpl?: typeof fetch;
    },
  ) {}

  async acquire(input: {
    videoId: string;
    signal?: AbortSignal;
  }): Promise<TranscriptStrategyResult> {
    const fetchImpl = this.options.fetchImpl ?? fetch;
    const url = new URL("https://api.supadata.ai/v1/transcript");
    url.searchParams.set(
      "url",
      `https://www.youtube.com/watch?v=${input.videoId}`,
    );
    url.searchParams.set("text", "false");
    url.searchParams.set("mode", "native");

    const timeoutSignal = AbortSignal.timeout(this.options.timeoutMs);
    const signal = input.signal
      ? AbortSignal.any([input.signal, timeoutSignal])
      : timeoutSignal;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: { "x-api-key": this.options.apiKey },
        signal,
        cache: "no-store",
      });
    } catch (error) {
      const timedOut =
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      return transcriptStrategyResultSchema.parse({
        kind: "retryable_failure",
        reason: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
      });
    }

    if (response.status === 202) {
      return transcriptStrategyResultSchema.parse({
        kind: "retryable_failure",
        reason: "ASYNC_NATIVE_RESPONSE",
      });
    }

    const raw = await response.json().catch(() => undefined);
    if (response.status === 206) {
      const parsedError = supadataErrorSchema.safeParse(raw);
      if (parsedError.success && parsedError.data.error === "transcript-unavailable") {
        return transcriptStrategyResultSchema.parse({
          kind: "not_applicable",
          reason: "NO_USABLE_CAPTIONS",
        });
      }
      return transcriptStrategyResultSchema.parse({
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      });
    }
    if (response.status === 401) {
      return transcriptStrategyResultSchema.parse({
        kind: "terminal_failure",
        reason: "PROVIDER_UNAUTHORIZED",
      });
    }
    if (response.status === 402) {
      return transcriptStrategyResultSchema.parse({
        kind: "terminal_failure",
        reason: "PROVIDER_PAYMENT_REQUIRED",
      });
    }
    if (response.status === 429) {
      return transcriptStrategyResultSchema.parse({
        kind: "retryable_failure",
        reason: "PROVIDER_RATE_LIMITED",
      });
    }
    if (response.status >= 500) {
      return transcriptStrategyResultSchema.parse({
        kind: "retryable_failure",
        reason: "PROVIDER_UNAVAILABLE",
      });
    }
    if (!response.ok) {
      return transcriptStrategyResultSchema.parse({
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      });
    }

    const transcript = supadataTranscriptSchema.safeParse(raw);
    if (!transcript.success) {
      return transcriptStrategyResultSchema.parse({
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      });
    }
    if (transcript.data.content.length === 0) {
      return transcriptStrategyResultSchema.parse({
        kind: "not_applicable",
        reason: "NO_USABLE_CAPTIONS",
      });
    }

    return transcriptStrategyResultSchema.parse({
      kind: "success",
      candidate: transcriptCandidateSchema.parse({
        strategyId: NATIVE_CAPTION_STRATEGY_ID,
        provider: "supadata",
        sourceType: "native_caption",
        videoId: input.videoId,
        declaredLanguage: transcript.data.lang,
        availableLanguages: transcript.data.availableLangs,
        trackKind: "unknown",
        translationStatus: "unknown",
        chunks: transcript.data.content.map((chunk) => ({
          text: chunk.text,
          offsetMs: chunk.offset,
          durationMs: chunk.duration,
          language: chunk.lang,
        })),
      }),
    });
  }
}
