import { z } from "zod";

export const LANGUAGE_DETECTOR_ID = "franc-min" as const;
export const LANGUAGE_DETECTOR_VERSION = "franc-min:6.2.0" as const;
export const LANGUAGE_POLICY_VERSION = "original-english:v1" as const;

export const languageReliabilityBandSchema = z.enum(["low", "medium", "high"]);
export type LanguageReliabilityBand = z.infer<
  typeof languageReliabilityBandSchema
>;

const segmentIdSchema = z.string().regex(/^seg_[a-f0-9]{32}$/);
const segmentIdArraySchema = z.array(segmentIdSchema).max(100_000);

export const languageAnalysisWindowSchema = z
  .object({
    id: z.string().regex(/^win_[a-f0-9]{24}$/),
    segmentIds: z.array(segmentIdSchema).min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().min(1).max(40_000),
    wordCount: z.number().int().positive(),
  })
  .strict()
  .refine((window) => window.endMs > window.startMs, {
    message: "Language window requires positive duration.",
  });

export type LanguageAnalysisWindow = z.infer<
  typeof languageAnalysisWindowSchema
>;

export const languageWindowResultSchema = z
  .object({
    windowId: z.string().regex(/^win_[a-f0-9]{24}$/),
    segmentIds: z.array(segmentIdSchema).min(1),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    wordCount: z.number().int().positive(),
    characterCount: z.number().int().positive(),
    detectorCode: z.string().min(3).max(3),
    detectedLanguage: z.string().min(2).max(3),
    reliability: languageReliabilityBandSchema,
    rawBestScore: z.number().nonnegative().optional(),
    rawSecondScore: z.number().nonnegative().optional(),
  })
  .strict();

export type LanguageWindowResult = z.infer<typeof languageWindowResultSchema>;

export const languageAnalysisResultSchema = z
  .object({
    detectorId: z.literal(LANGUAGE_DETECTOR_ID),
    detectorVersion: z.literal(LANGUAGE_DETECTOR_VERSION),
    windows: z.array(languageWindowResultSchema).min(1),
  })
  .strict();

export type LanguageAnalysisResult = z.infer<
  typeof languageAnalysisResultSchema
>;

export const languageEligibilityPolicySchema = z
  .object({
    policyVersion: z.literal(LANGUAGE_POLICY_VERSION),
    minWindowWords: z.number().int().min(5).max(100),
    targetWindowWords: z.number().int().min(10).max(200),
    maxWindowDurationMs: z.number().int().min(5_000).max(120_000),
    maxWindowGapMs: z.number().int().min(0).max(30_000),
    evidenceMinReliableCoverage: z.number().min(0).max(1),
    evidenceMinReliableWords: z.number().int().positive(),
    evidenceMinWindows: z.number().int().positive(),
    mainMinEnglishShare: z.number().min(0).max(1),
    mainMinCoherentDurationMs: z.number().int().positive(),
    mainMinEnglishWords: z.number().int().positive(),
    mixedMinEnglishShare: z.number().min(0).max(1),
    mixedMinCoherentDurationMs: z.number().int().positive(),
    mixedMinEnglishWords: z.number().int().positive(),
  })
  .strict();

export type LanguageEligibilityPolicy = z.infer<
  typeof languageEligibilityPolicySchema
>;

export const languageEligibilityStatusSchema = z.enum([
  "eligible",
  "ineligible",
  "insufficient_evidence",
]);

export const languageEligibilityReasonSchema = z.enum([
  "SUFFICIENT_ORIGINAL_ENGLISH",
  "SUFFICIENT_MIXED_LANGUAGE_ENGLISH_PORTION",
  "INSUFFICIENT_ORIGINAL_ENGLISH",
  "TRANSCRIPT_EVIDENCE_TOO_WEAK",
]);

export const languageEligibilityReportSchema = z
  .object({
    transcriptHash: z.string().regex(/^[a-f0-9]{64}$/),
    detectorId: z.literal(LANGUAGE_DETECTOR_ID),
    detectorVersion: z.literal(LANGUAGE_DETECTOR_VERSION),
    policyVersion: z.literal(LANGUAGE_POLICY_VERSION),
    status: languageEligibilityStatusSchema,
    reason: languageEligibilityReasonSchema,
    englishShare: z.number().min(0).max(1),
    reliableCoverage: z.number().min(0).max(1),
    coherentEnglishDurationMs: z.number().int().nonnegative(),
    reliableEnglishWordCount: z.number().int().nonnegative(),
    reliableAnalyzedWordCount: z.number().int().nonnegative(),
    confidenceBand: languageReliabilityBandSchema,
    detectedLanguages: z.array(z.string().min(2).max(3)).max(100),
    englishSegmentIds: segmentIdArraySchema,
    permittedSegmentIds: segmentIdArraySchema,
    excludedSegmentIds: segmentIdArraySchema,
  })
  .strict();

export type LanguageEligibilityReport = z.infer<
  typeof languageEligibilityReportSchema
>;

export const languageEligibilityPersistResultSchema = z
  .object({
    reportId: z.string().uuid(),
    created: z.boolean(),
    status: languageEligibilityStatusSchema,
  })
  .strict();

export type LanguageEligibilityPersistResult = z.infer<
  typeof languageEligibilityPersistResultSchema
>;
