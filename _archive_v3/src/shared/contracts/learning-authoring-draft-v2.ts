import { z } from "zod";

export const LEARNING_AUTHORING_DRAFT_VERSION =
  "learning-authoring-draft:v2" as const;

const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);

const optionSchema = z
  .object({
    id: entityIdSchema,
    textVi: z.string().min(1).max(500),
  })
  .strict();

const choiceFeedbackSchema = z
  .object({
    goalVi: z.string().min(5).max(300),
    correctEvidenceVi: z.string().min(5).max(500),
    incorrectEvidenceVi: z.string().min(5).max(500),
    nextStepVi: z.string().min(5).max(300),
  })
  .strict();

const groundedActivityBaseShape = {
  id: entityIdSchema,
  outcomeIds: z.array(entityIdSchema).min(1).max(4),
  instructionVi: z.string().min(5).max(500),
  evidenceWindowIds: z.array(entityIdSchema).min(1).max(2),
  captionPolicy: z.enum(["hidden_first", "toggle", "shown"]),
  estimatedSeconds: z.number().int().min(10).max(600),
};

const ungroundedActivityBaseShape = {
  id: entityIdSchema,
  outcomeIds: z.array(entityIdSchema).min(1).max(4),
  instructionVi: z.string().min(5).max(500),
  estimatedSeconds: z.number().int().min(10).max(600),
};

const gistChoiceDraftSchema = z
  .object({
    ...groundedActivityBaseShape,
    phase: z.literal("gist"),
    activityType: z.literal("gist_choice"),
    promptVi: z.string().min(5).max(500),
    options: z.array(optionSchema).min(2).max(4),
    correctOptionId: entityIdSchema,
    feedback: choiceFeedbackSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const optionIds = new Set(value.options.map((option) => option.id));
    if (optionIds.size !== value.options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Choice option IDs must be unique.",
      });
    }
    if (!optionIds.has(value.correctOptionId)) {
      context.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: "The correct option must exist in the activity options.",
      });
    }
  });

const meaningInContextDraftSchema = z
  .object({
    ...groundedActivityBaseShape,
    phase: z.literal("practice"),
    activityType: z.literal("meaning_in_context"),
    candidateId: entityIdSchema,
    promptVi: z.string().min(5).max(500),
    options: z.array(optionSchema).min(2).max(4),
    correctOptionId: entityIdSchema,
    feedback: choiceFeedbackSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const optionIds = new Set(value.options.map((option) => option.id));
    if (optionIds.size !== value.options.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "Choice option IDs must be unique.",
      });
    }
    if (!optionIds.has(value.correctOptionId)) {
      context.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: "The correct option must exist in the activity options.",
      });
    }
  });

/**
 * The phase each activity type is pinned to.
 *
 * The schemas below bind these one-to-one, so a phase carries no judgement — it
 * restates the type. Exported because the provider derives the field instead of
 * asking the model for it: production rejected a draft at `activities.3.phase`
 * for getting that restatement wrong, after both model calls had been paid for,
 * and the prompt never stated the mapping at all.
 */
export const PHASE_BY_ACTIVITY_TYPE = {
  gist_choice: "gist",
  meaning_in_context: "practice",
  chunk_recall: "retrieve",
  guided_transfer: "transfer",
  exit_ticket: "reflect",
} as const;

const chunkRecallDraftSchema = z
  .object({
    ...groundedActivityBaseShape,
    phase: z.literal("retrieve"),
    activityType: z.literal("chunk_recall"),
    candidateId: entityIdSchema,
    promptVi: z.string().min(5).max(500),
    hintVi: z.string().min(1).max(300).nullable(),
    accepted: z.array(z.string().min(1).max(160)).min(1).max(10),
    revealAnswer: z.string().min(1).max(160),
    revealExplanationVi: z.string().min(5).max(500),
    feedback: choiceFeedbackSchema,
  })
  .strict();

const guidedTransferDraftSchema = z
  .object({
    ...ungroundedActivityBaseShape,
    phase: z.literal("transfer"),
    activityType: z.literal("guided_transfer"),
    candidateIds: z.array(entityIdSchema).min(1).max(3),
    scenarioVi: z.string().min(10).max(700),
    promptVi: z.string().min(5).max(500),
    criteriaVi: z.array(z.string().min(5).max(300)).min(2).max(4),
    exemplarAfterAttempt: z.string().min(1).max(700).optional(),
    feedback: z
      .object({
        goalVi: z.string().min(5).max(300),
        nextStepVi: z.string().min(5).max(300),
      })
      .strict(),
  })
  .strict();

const exitTicketDraftSchema = z
  .object({
    ...ungroundedActivityBaseShape,
    phase: z.literal("reflect"),
    activityType: z.literal("exit_ticket"),
    promptVi: z.string().min(5).max(500),
    feedback: z
      .object({
        goalVi: z.string().min(5).max(300),
        nextStepVi: z.string().min(5).max(300),
      })
      .strict(),
  })
  .strict();

export const learningActivityDraftV2Schema = z.discriminatedUnion(
  "activityType",
  [
    gistChoiceDraftSchema,
    meaningInContextDraftSchema,
    chunkRecallDraftSchema,
    guidedTransferDraftSchema,
    exitTicketDraftSchema,
  ],
);
export type LearningActivityDraftV2 = z.infer<
  typeof learningActivityDraftV2Schema
>;

export const learningAuthoringDraftV2Schema = z
  .object({
    draftVersion: z.literal(LEARNING_AUTHORING_DRAFT_VERSION),
    challengeSummaryVi: z.string().min(5).max(500),
    targetItemNotes: z
      .array(
        z
          .object({
            candidateId: entityIdSchema,
            communicativeFunctionVi: z.string().min(5).max(500),
            pronunciationNoteVi: z.string().min(1).max(400).nullable(),
          })
          .strict(),
      )
      .max(5),
    activities: z.array(learningActivityDraftV2Schema).min(3).max(12),
  })
  .strict();
export type LearningAuthoringDraftV2 = z.infer<
  typeof learningAuthoringDraftV2Schema
>;
