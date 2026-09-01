import { z } from "zod";

import { cefrLevelSchema } from "@/shared/contracts/lesson-draft";
import { videoIdSchema } from "@/shared/contracts/video";

export const LESSON_SCHEMA_VERSION = "lesson:v1" as const;
export const LESSON_PIPELINE_VERSION = "lesson-pipeline:v1" as const;

const segmentIdSchema = z.string().regex(/^seg_[a-f0-9]{32}$/);

/**
 * Every teachable item cites the transcript segments it came from. The model
 * only ever returns segment IDs — never quotes. Quotes are hydrated server-side
 * from the canonical transcript, so a fabricated quote is not representable.
 */
const groundedSchema = z.object({
  sourceSegmentIds: z.array(segmentIdSchema).min(1).max(5),
});

export const vocabularyItemSchema = groundedSchema
  .extend({
    term: z.string().min(1).max(120),
    partOfSpeech: z.string().min(1).max(40),
    meaningVi: z.string().min(1).max(400),
    definitionEn: z.string().min(1).max(400),
    exampleEn: z.string().min(1).max(400),
  })
  .strict();

export const phraseItemSchema = groundedSchema
  .extend({
    phrase: z.string().min(1).max(160),
    kind: z.enum(["collocation", "phrasal_verb", "idiom", "slang", "expression"]),
    meaningVi: z.string().min(1).max(400),
    usageNoteVi: z.string().min(1).max(500),
  })
  .strict();

export const grammarPointSchema = groundedSchema
  .extend({
    titleVi: z.string().min(1).max(160),
    explanationVi: z.string().min(1).max(900),
    pattern: z.string().min(1).max(200),
    exampleEn: z.string().min(1).max(300),
  })
  .strict();

export const comprehensionQuestionSchema = groundedSchema
  .extend({
    questionVi: z.string().min(1).max(400),
    options: z.array(z.string().min(1).max(300)).length(4),
    correctIndex: z.number().int().min(0).max(3),
    explanationVi: z.string().min(1).max(500),
  })
  .strict();

export const clozeItemSchema = groundedSchema
  .extend({
    /** The sentence with exactly one blank written as `___`. */
    sentence: z.string().min(1).max(400),
    answer: z.string().min(1).max(80),
    hintVi: z.string().min(1).max(200),
  })
  .strict();

/** What the model returns. No quotes, no timestamps, no IDs it could invent. */
export const lessonDraftSchema = z
  .object({
    titleVi: z.string().min(1).max(200),
    topicVi: z.string().min(1).max(200),
    summaryVi: z.string().min(1).max(1500),
    summaryEn: z.string().min(1).max(1500),
    estimatedLevel: cefrLevelSchema,
    difficultyReasonsVi: z.array(z.string().min(1).max(300)).min(1).max(4),
    vocabulary: z.array(vocabularyItemSchema).min(6).max(20),
    phrases: z.array(phraseItemSchema).min(3).max(8),
    grammarPoints: z.array(grammarPointSchema).min(1).max(3),
    comprehensionQuestions: z.array(comprehensionQuestionSchema).min(3).max(6),
    clozeItems: z.array(clozeItemSchema).min(1).max(4),
  })
  .strict();

export type LessonDraft = z.infer<typeof lessonDraftSchema>;

/** One hydrated citation: the exact transcript text and where it is in the video. */
export const lessonCitationSchema = z
  .object({
    segmentId: segmentIdSchema,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().min(1).max(20_000),
  })
  .strict();

export type LessonCitation = z.infer<typeof lessonCitationSchema>;

export const lessonProvenanceSchema = z
  .object({
    schemaVersion: z.literal(LESSON_SCHEMA_VERSION),
    pipelineVersion: z.literal(LESSON_PIPELINE_VERSION),
    promptVersion: z.string().min(1).max(64),
    modelId: z.string().min(1).max(120),
    transcriptHash: z.string().regex(/^[a-f0-9]{64}$/),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    // Supabase serializes timestamptz with an explicit UTC offset, which a
    // bare .datetime() rejects. Same fix as generation.ts — this one was
    // missed, so every lesson page 500'd while generation itself worked.
    generatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

/** The published lesson: model draft + server-hydrated citations + provenance. */
export const lessonSchema = z
  .object({
    id: z.string().uuid(),
    jobId: z.string().uuid(),
    videoId: videoIdSchema,
    videoTitle: z.string().min(1).max(500),
    channelName: z.string().min(1).max(300),
    cefrLevel: cefrLevelSchema,
    draft: lessonDraftSchema,
    citations: z.array(lessonCitationSchema).min(1),
    provenance: lessonProvenanceSchema,
    createdAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type Lesson = z.infer<typeof lessonSchema>;
