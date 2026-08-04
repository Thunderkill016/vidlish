import { z } from "zod";

import { videoIdSchema } from "@/shared/contracts/video";

export const NATIVE_CAPTION_STRATEGY_ID = "supadata-native-caption" as const;
export const GENERATED_TRANSCRIPT_STRATEGY_ID =
  "supadata-generated-transcript" as const;
export const TRANSCRIPT_NORMALIZATION_VERSION = "transcript-normalization:v1" as const;

export const transcriptStrategyIdSchema = z.enum([
  NATIVE_CAPTION_STRATEGY_ID,
  GENERATED_TRANSCRIPT_STRATEGY_ID,
]);
export type TranscriptStrategyId = z.infer<typeof transcriptStrategyIdSchema>;

export const transcriptProviderSchema = z.literal("supadata");
export type TranscriptProvider = z.infer<typeof transcriptProviderSchema>;

export const transcriptSourceTypeSchema = z.enum([
  "native_caption",
  "hosted_generated_transcript",
]);
export type TranscriptSourceType = z.infer<typeof transcriptSourceTypeSchema>;

export const transcriptCostBandSchema = z.enum([
  "none",
  "metered_low",
  "metered_medium",
  "metered_high",
]);
export type TranscriptCostBand = z.infer<typeof transcriptCostBandSchema>;

export const transcriptTrackKindSchema = z.enum(["unknown", "manual", "auto"]);
export const transcriptTranslationStatusSchema = z.enum([
  "unknown",
  "original",
  "translated",
]);

export const transcriptCandidateChunkSchema = z
  .object({
    text: z.string().max(20_000),
    offsetMs: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    language: z.string().min(1).max(35).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();

export const transcriptCandidateSchema = z
  .object({
    strategyId: transcriptStrategyIdSchema,
    provider: transcriptProviderSchema,
    sourceType: transcriptSourceTypeSchema,
    videoId: videoIdSchema,
    providerRequestId: z.string().min(1).max(256).optional(),
    declaredLanguage: z.string().min(1).max(35).optional(),
    availableLanguages: z.array(z.string().min(1).max(35)).max(100),
    trackKind: transcriptTrackKindSchema,
    translationStatus: transcriptTranslationStatusSchema,
    chunks: z.array(transcriptCandidateChunkSchema).max(100_000),
  })
  .strict()
  .superRefine((candidate, context) => {
    if (
      candidate.strategyId === NATIVE_CAPTION_STRATEGY_ID &&
      candidate.sourceType !== "native_caption"
    ) {
      context.addIssue({
        code: "custom",
        path: ["sourceType"],
        message: "Native strategy requires native-caption provenance.",
      });
    }
    if (
      candidate.strategyId === GENERATED_TRANSCRIPT_STRATEGY_ID &&
      candidate.sourceType !== "hosted_generated_transcript"
    ) {
      context.addIssue({
        code: "custom",
        path: ["sourceType"],
        message: "Generated strategy requires hosted-generation provenance.",
      });
    }
  });

export type TranscriptCandidate = z.infer<typeof transcriptCandidateSchema>;

export const transcriptStrategyResultSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("success"), candidate: transcriptCandidateSchema })
    .strict(),
  z
    .object({
      kind: z.literal("pending"),
      providerJobId: z.string().min(1).max(256),
      providerRequestId: z.string().min(1).max(256).optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("not_applicable"),
      reason: z.enum([
        "NO_USABLE_CAPTIONS",
        "NO_SPEECH_DETECTED",
        "TRANSLATED_CAPTION_REJECTED",
        "GENERATED_TRANSCRIPT_POLICY_BLOCKED",
      ]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("retryable_failure"),
      reason: z.enum([
        "PROVIDER_TIMEOUT",
        "PROVIDER_RATE_LIMITED",
        "PROVIDER_UNAVAILABLE",
        "PROVIDER_JOB_FAILED",
        "PROVIDER_JOB_TIMEOUT",
        "ASYNC_NATIVE_RESPONSE",
      ]),
    })
    .strict(),
  z
    .object({
      kind: z.literal("terminal_failure"),
      reason: z.enum([
        "PROVIDER_UNAUTHORIZED",
        "PROVIDER_PAYMENT_REQUIRED",
        "PROVIDER_RESPONSE_INVALID",
        "PROVIDER_JOB_NOT_FOUND",
        "UNSUPPORTED_RESOURCE",
        "STRATEGY_DISABLED",
      ]),
    })
    .strict(),
]);

export type TranscriptStrategyResult = z.infer<
  typeof transcriptStrategyResultSchema
>;

export const canonicalTranscriptSegmentSchema = z
  .object({
    id: z.string().regex(/^seg_[a-f0-9]{32}$/),
    position: z.number().int().nonnegative(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().min(1).max(20_000),
    confidence: z.number().min(0).max(1).optional(),
    detectedLanguage: z.string().min(1).max(35).optional(),
  })
  .strict()
  .refine((segment) => segment.endMs > segment.startMs, {
    message: "Transcript segment must have positive duration.",
  });

export const canonicalTranscriptSchema = z
  .object({
    videoId: videoIdSchema,
    strategyId: transcriptStrategyIdSchema,
    provider: transcriptProviderSchema,
    sourceType: transcriptSourceTypeSchema,
    providerRequestId: z.string().min(1).max(256).optional(),
    declaredLanguage: z.string().min(1).max(35).optional(),
    availableLanguages: z.array(z.string().min(1).max(35)).max(100),
    trackKind: transcriptTrackKindSchema,
    translationStatus: transcriptTranslationStatusSchema,
    normalizedHash: z.string().regex(/^[a-f0-9]{64}$/),
    normalizationVersion: z.literal(TRANSCRIPT_NORMALIZATION_VERSION),
    durationMs: z.number().int().positive(),
    segments: z.array(canonicalTranscriptSegmentSchema).min(1).max(100_000),
  })
  .strict();

export type CanonicalTranscript = z.infer<typeof canonicalTranscriptSchema>;

export const transcriptPersistResultSchema = z
  .object({
    transcriptId: z.string().uuid(),
    created: z.boolean(),
  })
  .strict();

export type TranscriptPersistResult = z.infer<
  typeof transcriptPersistResultSchema
>;
