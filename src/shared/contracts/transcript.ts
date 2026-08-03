import { z } from "zod";

import { videoIdSchema } from "@/shared/contracts/video";

export const NATIVE_CAPTION_STRATEGY_ID = "supadata-native-caption" as const;
export const TRANSCRIPT_NORMALIZATION_VERSION = "transcript-normalization:v1" as const;

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
    strategyId: z.literal(NATIVE_CAPTION_STRATEGY_ID),
    provider: z.literal("supadata"),
    sourceType: z.literal("native_caption"),
    videoId: videoIdSchema,
    declaredLanguage: z.string().min(1).max(35).optional(),
    availableLanguages: z.array(z.string().min(1).max(35)).max(100),
    trackKind: transcriptTrackKindSchema,
    translationStatus: transcriptTranslationStatusSchema,
    chunks: z.array(transcriptCandidateChunkSchema).max(100_000),
  })
  .strict();

export type TranscriptCandidate = z.infer<typeof transcriptCandidateSchema>;

export const transcriptStrategyResultSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("success"), candidate: transcriptCandidateSchema })
    .strict(),
  z
    .object({
      kind: z.literal("not_applicable"),
      reason: z.enum([
        "NO_USABLE_CAPTIONS",
        "TRANSLATED_CAPTION_REJECTED",
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
    strategyId: z.literal(NATIVE_CAPTION_STRATEGY_ID),
    provider: z.literal("supadata"),
    sourceType: z.literal("native_caption"),
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
