import { z } from "zod";

/**
 * Study progress is the learner's side of a lesson: which activities they
 * answered, which words they marked as learned, and whether they finished.
 *
 * It is deliberately a separate artifact from the lesson. A published lesson is
 * immutable — one row per `(job, pipeline_version)` — so answers can safely be
 * addressed by their position in the draft arrays. Nothing here is model
 * output, so none of it can weaken the grounding invariant.
 */
export const STUDY_PROGRESS_VERSION = "study-progress:v1" as const;

/** Upper bounds mirror `lessonDraftSchema`, so a payload can never claim more
 *  answers than the lesson has activities. */
const MAX_COMPREHENSION_QUESTIONS = 6;
const MAX_CLOZE_ITEMS = 4;
const MAX_VOCABULARY = 20;

export const comprehensionAnswerSchema = z
  .object({
    index: z.number().int().min(0).max(MAX_COMPREHENSION_QUESTIONS - 1),
    selectedIndex: z.number().int().min(0).max(3),
  })
  .strict();

export type ComprehensionAnswer = z.infer<typeof comprehensionAnswerSchema>;

export const clozeAttemptSchema = z
  .object({
    index: z.number().int().min(0).max(MAX_CLOZE_ITEMS - 1),
    /** True only when the learner typed a matching answer themselves. */
    solved: z.boolean(),
    /** True once they asked to see the answer. A revealed item is not solved. */
    revealed: z.boolean(),
  })
  .strict();

export type ClozeAttempt = z.infer<typeof clozeAttemptSchema>;

function unique(values: number[]): boolean {
  return new Set(values).size === values.length;
}

export const studyProgressStateSchema = z
  .object({
    version: z.literal(STUDY_PROGRESS_VERSION),
    comprehensionAnswers: z
      .array(comprehensionAnswerSchema)
      .max(MAX_COMPREHENSION_QUESTIONS),
    clozeAttempts: z.array(clozeAttemptSchema).max(MAX_CLOZE_ITEMS),
    masteredVocabulary: z
      .array(z.number().int().min(0).max(MAX_VOCABULARY - 1))
      .max(MAX_VOCABULARY),
  })
  .strict()
  .superRefine((state, context) => {
    // One record per activity. Without this a client could inflate its own
    // score by posting the same correct answer repeatedly.
    if (!unique(state.comprehensionAnswers.map((answer) => answer.index))) {
      context.addIssue({
        code: "custom",
        path: ["comprehensionAnswers"],
        message: "One answer per question.",
      });
    }
    if (!unique(state.clozeAttempts.map((attempt) => attempt.index))) {
      context.addIssue({
        code: "custom",
        path: ["clozeAttempts"],
        message: "One attempt record per cloze item.",
      });
    }
    if (!unique(state.masteredVocabulary)) {
      context.addIssue({
        code: "custom",
        path: ["masteredVocabulary"],
        message: "One entry per vocabulary item.",
      });
    }
  });

export type StudyProgressState = z.infer<typeof studyProgressStateSchema>;

export const emptyStudyProgressState: StudyProgressState = {
  version: STUDY_PROGRESS_VERSION,
  comprehensionAnswers: [],
  clozeAttempts: [],
  masteredVocabulary: [],
};

export const studyProgressSchema = z
  .object({
    jobId: z.string().uuid(),
    lessonId: z.string().uuid(),
    state: studyProgressStateSchema,
    completedAt: z.string().datetime({ offset: true }).nullable(),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type StudyProgress = z.infer<typeof studyProgressSchema>;

/** What the browser may send. The server owns the timestamps. */
export const saveStudyProgressRequestSchema = z
  .object({
    state: studyProgressStateSchema,
    completed: z.boolean(),
  })
  .strict();

export type SaveStudyProgressRequest = z.infer<
  typeof saveStudyProgressRequestSchema
>;

export const studyProgressResponseSchema = z
  .object({ progress: studyProgressSchema })
  .strict();

/** The library only needs the headline numbers, not every answer. */
export const studyProgressSummarySchema = z
  .object({
    jobId: z.string().uuid(),
    answeredActivities: z.number().int().nonnegative(),
    masteredVocabularyCount: z.number().int().nonnegative(),
    completedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export type StudyProgressSummary = z.infer<typeof studyProgressSummarySchema>;
