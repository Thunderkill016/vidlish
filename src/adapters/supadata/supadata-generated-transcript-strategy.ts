import "server-only";

import { z } from "zod";

import type { PollableTranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import {
  GENERATED_TRANSCRIPT_STRATEGY_ID,
  transcriptCandidateSchema,
  transcriptStrategyResultSchema,
  type TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

const providerJobIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,256}$/);

const supadataChunkSchema = z
  .object({
    text: z.string(),
    offset: z.number().int().nonnegative(),
    duration: z.number().int().nonnegative(),
    lang: z.string().min(1).max(35).optional(),
  })
  .strict();

const supadataTranscriptSchema = z
  .object({
    content: z.array(supadataChunkSchema),
    lang: z.string().min(1).max(35),
    availableLangs: z.array(z.string().min(1).max(35)).max(100),
  })
  .strict();

const supadataJobStartSchema = z
  .object({ jobId: providerJobIdSchema })
  .strict();

const supadataErrorSchema = z
  .object({
    error: z.string().min(1).max(100),
    message: z.string().optional(),
    details: z.string().optional(),
    documentationUrl: z.string().url().optional(),
  })
  .passthrough();

const supadataJobResultSchema = z
  .object({
    status: z.enum(["queued", "active", "completed", "failed"]),
    error: supadataErrorSchema.optional(),
    content: z.array(supadataChunkSchema).optional(),
    lang: z.string().min(1).max(35).optional(),
    availableLangs: z.array(z.string().min(1).max(35)).max(100).optional(),
  })
  .strict();

function requestId(response: Response): string | undefined {
  return (
    response.headers.get("x-request-id") ??
    response.headers.get("request-id") ??
    undefined
  );
}

function mapHttpFailure(response: Response): TranscriptStrategyResult {
  if (response.status === 401) {
    return { kind: "terminal_failure", reason: "PROVIDER_UNAUTHORIZED" };
  }
  if (response.status === 402) {
    return {
      kind: "terminal_failure",
      reason: "PROVIDER_PAYMENT_REQUIRED",
    };
  }
  if (response.status === 404) {
    return { kind: "terminal_failure", reason: "UNSUPPORTED_RESOURCE" };
  }
  if (response.status === 429) {
    return { kind: "retryable_failure", reason: "PROVIDER_RATE_LIMITED" };
  }
  if (response.status >= 500) {
    return { kind: "retryable_failure", reason: "PROVIDER_UNAVAILABLE" };
  }
  return { kind: "terminal_failure", reason: "PROVIDER_RESPONSE_INVALID" };
}

function mapFetchFailure(error: unknown): TranscriptStrategyResult {
  const timedOut =
    error instanceof DOMException &&
    (error.name === "TimeoutError" || error.name === "AbortError");
  return {
    kind: "retryable_failure",
    reason: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
  };
}

function transcriptResult(input: {
  raw: unknown;
  videoId: string;
  providerRequestId?: string;
}): TranscriptStrategyResult {
  const parsed = supadataTranscriptSchema.safeParse(input.raw);
  if (!parsed.success) {
    return { kind: "terminal_failure", reason: "PROVIDER_RESPONSE_INVALID" };
  }
  if (
    parsed.data.content.length === 0 ||
    parsed.data.content.every((chunk) => chunk.text.trim().length === 0)
  ) {
    return { kind: "not_applicable", reason: "NO_SPEECH_DETECTED" };
  }

  return transcriptStrategyResultSchema.parse({
    kind: "success",
    candidate: transcriptCandidateSchema.parse({
      strategyId: GENERATED_TRANSCRIPT_STRATEGY_ID,
      provider: "supadata",
      sourceType: "hosted_generated_transcript",
      videoId: input.videoId,
      ...(input.providerRequestId
        ? { providerRequestId: input.providerRequestId }
        : {}),
      declaredLanguage: parsed.data.lang,
      availableLanguages: parsed.data.availableLangs,
      trackKind: "unknown",
      translationStatus: "original",
      chunks: parsed.data.content.map((chunk) => ({
        text: chunk.text,
        offsetMs: chunk.offset,
        durationMs: chunk.duration,
        ...(chunk.lang ? { language: chunk.lang } : {}),
      })),
    }),
  });
}

export class SupadataGeneratedTranscriptStrategy
  implements PollableTranscriptStrategy
{
  readonly id = GENERATED_TRANSCRIPT_STRATEGY_ID;
  readonly costBand = "metered_medium" as const;

  constructor(
    private readonly options: {
      apiKey: string;
      timeoutMs: number;
      fetchImpl?: typeof fetch;
    },
  ) {}

  private async request(
    url: URL,
    signal?: AbortSignal,
  ): Promise<Response | TranscriptStrategyResult> {
    const timeoutSignal = AbortSignal.timeout(this.options.timeoutMs);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutSignal])
      : timeoutSignal;
    try {
      return await (this.options.fetchImpl ?? fetch)(url, {
        method: "GET",
        headers: { "x-api-key": this.options.apiKey },
        signal: combinedSignal,
        cache: "no-store",
      });
    } catch (error) {
      return mapFetchFailure(error);
    }
  }

  async acquire(input: {
    videoId: string;
    signal?: AbortSignal;
  }): Promise<TranscriptStrategyResult> {
    const url = new URL("https://api.supadata.ai/v1/transcript");
    url.searchParams.set(
      "url",
      `https://www.youtube.com/watch?v=${input.videoId}`,
    );
    url.searchParams.set("text", "false");
    url.searchParams.set("mode", "generate");

    const response = await this.request(url, input.signal);
    if (!(response instanceof Response)) return response;

    const raw = await response.json().catch(() => undefined);
    if (response.status === 202) {
      const pending = supadataJobStartSchema.safeParse(raw);
      if (!pending.success) {
        return {
          kind: "terminal_failure",
          reason: "PROVIDER_RESPONSE_INVALID",
        };
      }
      return transcriptStrategyResultSchema.parse({
        kind: "pending",
        providerJobId: pending.data.jobId,
        ...(requestId(response)
          ? { providerRequestId: requestId(response) }
          : {}),
      });
    }
    if (!response.ok) return mapHttpFailure(response);
    return transcriptResult({
      raw,
      videoId: input.videoId,
      providerRequestId: requestId(response),
    });
  }

  async poll(input: {
    providerJobId: string;
    videoId: string;
    signal?: AbortSignal;
  }): Promise<TranscriptStrategyResult> {
    const providerJobId = providerJobIdSchema.safeParse(input.providerJobId);
    if (!providerJobId.success) {
      return {
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      };
    }

    const url = new URL(
      `https://api.supadata.ai/v1/transcript/${providerJobId.data}`,
    );
    const response = await this.request(url, input.signal);
    if (!(response instanceof Response)) return response;

    if (response.status === 404) {
      return {
        kind: "terminal_failure",
        reason: "PROVIDER_JOB_NOT_FOUND",
      };
    }
    const raw = await response.json().catch(() => undefined);
    if (!response.ok) return mapHttpFailure(response);

    const job = supadataJobResultSchema.safeParse(raw);
    if (!job.success) {
      return {
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      };
    }
    if (job.data.status === "queued" || job.data.status === "active") {
      return transcriptStrategyResultSchema.parse({
        kind: "pending",
        providerJobId: providerJobId.data,
        ...(requestId(response)
          ? { providerRequestId: requestId(response) }
          : {}),
      });
    }
    if (job.data.status === "failed") {
      const terminalErrors = new Set([
        "invalid-request",
        "unsupported-url",
        "video-unavailable",
      ]);
      return terminalErrors.has(job.data.error?.error ?? "")
        ? { kind: "terminal_failure", reason: "UNSUPPORTED_RESOURCE" }
        : { kind: "retryable_failure", reason: "PROVIDER_JOB_FAILED" };
    }

    return transcriptResult({
      raw: {
        content: job.data.content,
        lang: job.data.lang,
        availableLangs: job.data.availableLangs,
      },
      videoId: input.videoId,
      providerRequestId: requestId(response),
    });
  }
}
