import { z } from "zod";

import { cefrLevelSchema } from "@/shared/contracts/lesson-draft";
import { videoIdSchema } from "@/shared/contracts/video";

export const LESSON_V2_SCHEMA_VERSION = "lesson:v2" as const;
export const LESSON_V2_PIPELINE_VERSION = "learning-pipeline:v2" as const;

const segmentIdSchema = z.string().regex(/^seg_[a-f0-9]{32}$/);
const offsetDateTimeSchema = z.string().datetime({ offset: true });
const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);

export const learningPhaseSchema = z.enum([
  "orientation",
  "activation",
  "gist",
  "focus",
  "notice",
  "practice",
  "retrieve",
  "transfer",
  "reflect",
  "completed",
]);
export type LearningPhase = z.infer<typeof learningPhaseSchema>;

export const learnerContextSnapshotSchema = z
  .object({
    targetCefr: cefrLevelSchema,
    goals: z
      .array(
        z.enum([
          "listening",
          "vocabulary",
          "conversation",
          "pronunciation",
          "comprehension",
        ]),
      )
      .min(1)
      .max(5),
    timeBudgetMinutes: z.union([
      z.literal(5),
      z.literal(10),
      z.literal(15),
      z.literal(20),
    ]),
    supportPreference: z.enum([
      "more_support",
      "balanced",
      "more_challenge",
    ]),
    knownItemKeys: z.array(z.string().min(1).max(160)).max(200),
    weakItemKeys: z.array(z.string().min(1).max(160)).max(200),
    recentReviewOutcomes: z
      .array(
        z
          .object({
            itemKey: z.string().min(1).max(160),
            outcome: z.enum(["again", "hard", "good"]),
            occurredAt: offsetDateTimeSchema,
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export type LearnerContextSnapshot = z.infer<
  typeof learnerContextSnapshotSchema
>;

export const sourceEvidenceSchema = z
  .object({
    origin: z.literal("source_quote"),
    segmentId: segmentIdSchema,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    text: z.string().min(1).max(20_000),
  })
  .strict()
  .refine((value) => value.endMs > value.startMs, {
    message: "Evidence must end after it starts.",
    path: ["endMs"],
  });
export type SourceEvidence = z.infer<typeof sourceEvidenceSchema>;

export const evidenceRefSchema = z
  .object({
    sourceSegmentIds: z.array(segmentIdSchema).min(1).max(8),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    captionPolicy: z.enum(["hidden_first", "toggle", "shown"]),
    replayAllowed: z.literal(true),
  })
  .strict()
  .refine((value) => value.endMs > value.startMs, {
    message: "Evidence range must end after it starts.",
    path: ["endMs"],
  });
export type EvidenceRef = z.infer<typeof evidenceRefSchema>;

export const canDoOutcomeSchema = z
  .object({
    id: entityIdSchema,
    canDoVi: z.string().min(12).max(300),
    successEvidenceVi: z.string().min(12).max(300),
  })
  .strict();
export type CanDoOutcome = z.infer<typeof canDoOutcomeSchema>;

export const targetLanguageItemSchema = z
  .object({
    id: entityIdSchema,
    itemKey: z.string().min(1).max(160),
    surfaceForm: z.string().min(1).max(160),
    kind: z.enum([
      "chunk",
      "word",
      "grammar_function",
      "discourse_marker",
      "pronunciation_pattern",
    ]),
    contextualMeaningVi: z.string().min(1).max(500),
    communicativeFunctionVi: z.string().min(1).max(500),
    register: z.enum([
      "neutral",
      "informal",
      "slang",
      "technical",
      "formal",
    ]),
    pronunciationNoteVi: z.string().min(1).max(400).nullable(),
    sourceSegmentIds: z.array(segmentIdSchema).min(1).max(5),
  })
  .strict();
export type TargetLanguageItem = z.infer<typeof targetLanguageItemSchema>;

const activityBaseShape = {
  id: entityIdSchema,
  outcomeIds: z.array(entityIdSchema).min(1).max(4),
  instructionVi: z.string().min(5).max(500),
  evidence: z.array(evidenceRefSchema).max(2),
  estimatedSeconds: z.number().int().min(10).max(600),
};

const choiceOptionSchema = z
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

export const gistChoiceActivitySchema = z
  .object({
    ...activityBaseShape,
    phase: z.literal("gist"),
    activityType: z.literal("gist_choice"),
    promptVi: z.string().min(5).max(500),
    options: z.array(choiceOptionSchema).min(2).max(4),
    evaluation: z
      .object({
        kind: z.literal("single_choice"),
        correctOptionId: entityIdSchema,
      })
      .strict(),
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
    if (!optionIds.has(value.evaluation.correctOptionId)) {
      context.addIssue({
        code: "custom",
        path: ["evaluation", "correctOptionId"],
        message: "The correct option must exist in the activity options.",
      });
    }
  });

export const meaningInContextActivitySchema = z
  .object({
    ...activityBaseShape,
    phase: z.literal("practice"),
    activityType: z.literal("meaning_in_context"),
    targetItemId: entityIdSchema,
    promptVi: z.string().min(5).max(500),
    options: z.array(choiceOptionSchema).min(2).max(4),
    evaluation: z
      .object({
        kind: z.literal("single_choice"),
        correctOptionId: entityIdSchema,
      })
      .strict(),
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
    if (!optionIds.has(value.evaluation.correctOptionId)) {
      context.addIssue({
        code: "custom",
        path: ["evaluation", "correctOptionId"],
        message: "The correct option must exist in the activity options.",
      });
    }
  });

export const chunkRecallActivitySchema = z
  .object({
    ...activityBaseShape,
    phase: z.literal("retrieve"),
    activityType: z.literal("chunk_recall"),
    targetItemId: entityIdSchema,
    promptVi: z.string().min(5).max(500),
    hintVi: z.string().min(1).max(300).nullable(),
    evaluation: z
      .object({
        kind: z.literal("normalized_text_set"),
        accepted: z.array(z.string().min(1).max(160)).min(1).max(10),
      })
      .strict(),
    reveal: z
      .object({
        answer: z.string().min(1).max(160),
        explanationVi: z.string().min(5).max(500),
      })
      .strict(),
    feedback: z
      .object({
        goalVi: z.string().min(5).max(300),
        correctEvidenceVi: z.string().min(5).max(500),
        incorrectEvidenceVi: z.string().min(5).max(500),
        nextStepVi: z.string().min(5).max(300),
      })
      .strict(),
  })
  .strict();

export const guidedTransferActivitySchema = z
  .object({
    ...activityBaseShape,
    phase: z.literal("transfer"),
    activityType: z.literal("guided_transfer"),
    targetItemIds: z.array(entityIdSchema).min(1).max(3),
    scenarioVi: z.string().min(10).max(700),
    promptVi: z.string().min(5).max(500),
    evaluation: z
      .object({
        kind: z.literal("self_check"),
        criteriaVi: z.array(z.string().min(5).max(300)).min(2).max(4),
        exemplarAfterAttempt: z.string().min(1).max(700).optional(),
      })
      .strict(),
    feedback: z
      .object({
        goalVi: z.string().min(5).max(300),
        nextStepVi: z.string().min(5).max(300),
      })
      .strict(),
  })
  .strict();

export const exitTicketActivitySchema = z
  .object({
    ...activityBaseShape,
    phase: z.literal("reflect"),
    activityType: z.literal("exit_ticket"),
    promptVi: z.string().min(5).max(500),
    evaluation: z
      .object({
        kind: z.literal("unscored_reflection"),
      })
      .strict(),
    feedback: z
      .object({
        goalVi: z.string().min(5).max(300),
        nextStepVi: z.string().min(5).max(300),
      })
      .strict(),
  })
  .strict();

export const learningActivitySchema = z.discriminatedUnion("activityType", [
  gistChoiceActivitySchema,
  meaningInContextActivitySchema,
  chunkRecallActivitySchema,
  guidedTransferActivitySchema,
  exitTicketActivitySchema,
]);
export type LearningActivity = z.infer<typeof learningActivitySchema>;

export const lessonBlueprintV2Schema = z
  .object({
    schemaVersion: z.literal(LESSON_V2_SCHEMA_VERSION),
    pipelineVersion: z.literal(LESSON_V2_PIPELINE_VERSION),
    blueprintId: z.string().uuid(),
    source: z
      .object({
        jobId: z.string().uuid(),
        videoId: videoIdSchema,
        videoTitle: z.string().min(1).max(500),
        channelName: z.string().min(1).max(300),
        transcriptHash: z.string().regex(/^[a-f0-9]{64}$/),
      })
      .strict(),
    learnerSnapshot: learnerContextSnapshotSchema,
    videoProfile: z
      .object({
        durationMs: z.number().int().positive(),
        challengeSummaryVi: z.string().min(5).max(500),
        challengeDimensions: z
          .array(
            z.enum([
              "fast_speech",
              "overlap",
              "noise",
              "accent",
              "reduction",
              "slang",
              "topic_shifts",
              "background_knowledge",
            ]),
          )
          .max(8),
        lexicalCoverageEstimate: z.number().min(0).max(1).nullable(),
      })
      .strict(),
    outcomes: z.array(canDoOutcomeSchema).min(1).max(4),
    targetItems: z.array(targetLanguageItemSchema).max(5),
    evidenceCatalog: z.array(sourceEvidenceSchema).min(1).max(40),
    activities: z.array(learningActivitySchema).min(3).max(12),
    provenance: z
      .object({
        diagnosisVersion: z.string().min(1).max(64),
        authoringVersion: z.string().min(1).max(64),
        modelId: z.string().min(1).max(120),
        createdAt: offsetDateTimeSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    const outcomeIds = new Set(value.outcomes.map((outcome) => outcome.id));
    const targetIds = new Set(value.targetItems.map((item) => item.id));
    const evidenceIds = new Set(
      value.evidenceCatalog.map((evidence) => evidence.segmentId),
    );
    const activityIds = new Set<string>();
    const phaseOrder: Record<LearningPhase, number> = {
      orientation: 0,
      activation: 1,
      gist: 2,
      focus: 3,
      notice: 4,
      practice: 5,
      retrieve: 6,
      transfer: 7,
      reflect: 8,
      completed: 9,
    };

    let previousPhase = -1;
    for (const [index, activity] of value.activities.entries()) {
      if (activityIds.has(activity.id)) {
        context.addIssue({
          code: "custom",
          path: ["activities", index, "id"],
          message: "Activity IDs must be unique.",
        });
      }
      activityIds.add(activity.id);

      const currentPhase = phaseOrder[activity.phase];
      if (currentPhase < previousPhase) {
        context.addIssue({
          code: "custom",
          path: ["activities", index, "phase"],
          message: "Activities must follow the learning phase order.",
        });
      }
      previousPhase = currentPhase;

      for (const outcomeId of activity.outcomeIds) {
        if (!outcomeIds.has(outcomeId)) {
          context.addIssue({
            code: "custom",
            path: ["activities", index, "outcomeIds"],
            message: `Unknown outcome ID: ${outcomeId}`,
          });
        }
      }

      for (const evidence of activity.evidence) {
        for (const segmentId of evidence.sourceSegmentIds) {
          if (!evidenceIds.has(segmentId)) {
            context.addIssue({
              code: "custom",
              path: ["activities", index, "evidence"],
              message: `Activity cites evidence outside the catalog: ${segmentId}`,
            });
          }
        }
      }

      if (
        (activity.activityType === "meaning_in_context" ||
          activity.activityType === "chunk_recall") &&
        !targetIds.has(activity.targetItemId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["activities", index, "targetItemId"],
          message: `Unknown target item ID: ${activity.targetItemId}`,
        });
      }
      if (activity.activityType === "guided_transfer") {
        for (const targetItemId of activity.targetItemIds) {
          if (!targetIds.has(targetItemId)) {
            context.addIssue({
              code: "custom",
              path: ["activities", index, "targetItemIds"],
              message: `Unknown target item ID: ${targetItemId}`,
            });
          }
        }
      }
    }

    for (const [index, item] of value.targetItems.entries()) {
      for (const segmentId of item.sourceSegmentIds) {
        if (!evidenceIds.has(segmentId)) {
          context.addIssue({
            code: "custom",
            path: ["targetItems", index, "sourceSegmentIds"],
            message: `Target item cites evidence outside the catalog: ${segmentId}`,
          });
        }
      }
    }

    const estimatedSeconds = value.activities.reduce(
      (sum, activity) => sum + activity.estimatedSeconds,
      0,
    );
    const budgetSeconds = value.learnerSnapshot.timeBudgetMinutes * 60;
    if (estimatedSeconds > budgetSeconds * 1.25) {
      context.addIssue({
        code: "custom",
        path: ["activities"],
        message: "The activity plan exceeds the learner time budget tolerance.",
      });
    }
  });
export type LessonBlueprintV2 = z.infer<typeof lessonBlueprintV2Schema>;

export const activityResponseSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("choice"),
      optionId: entityIdSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("text"),
      text: z.string().min(1).max(2_000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("self_check"),
      text: z.string().min(1).max(4_000),
      checkedCriteria: z.array(z.number().int().nonnegative()).max(4),
    })
    .strict(),
  z
    .object({
      kind: z.literal("reflection"),
      text: z.string().min(1).max(2_000),
    })
    .strict(),
]);
export type ActivityResponse = z.infer<typeof activityResponseSchema>;

export const activityEvaluationSchema = z.discriminatedUnion("verdict", [
  z
    .object({
      verdict: z.literal("correct"),
      goalVi: z.string(),
      evidenceVi: z.string(),
      nextStepVi: z.string(),
      evidenceRefs: z.array(evidenceRefSchema),
      reveal: z
        .object({
          answer: z.string().optional(),
          explanationVi: z.string().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  z
    .object({
      verdict: z.literal("incorrect"),
      goalVi: z.string(),
      evidenceVi: z.string(),
      nextStepVi: z.string(),
      evidenceRefs: z.array(evidenceRefSchema),
      reveal: z
        .object({
          answer: z.string().optional(),
          explanationVi: z.string().optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  z
    .object({
      verdict: z.literal("self_check"),
      goalVi: z.string(),
      evidenceVi: z.string(),
      nextStepVi: z.string(),
      evidenceRefs: z.array(evidenceRefSchema),
      checkedCriteria: z.array(z.number().int().nonnegative()),
      exemplarAfterAttempt: z.string().optional(),
    })
    .strict(),
  z
    .object({
      verdict: z.literal("unscored"),
      goalVi: z.string(),
      evidenceVi: z.string(),
      nextStepVi: z.string(),
      evidenceRefs: z.array(evidenceRefSchema),
    })
    .strict(),
]);
export type ActivityEvaluation = z.infer<typeof activityEvaluationSchema>;

export const lessonSessionSchema = z
  .object({
    id: z.string().uuid(),
    ownerUserId: z.string().uuid(),
    lessonVersionId: z.string().uuid(),
    status: z.enum(["not_started", "in_progress", "completed", "abandoned"]),
    currentPhase: learningPhaseSchema,
    currentActivityId: entityIdSchema,
    startedAt: offsetDateTimeSchema.nullable(),
    completedAt: offsetDateTimeSchema.nullable(),
    updatedAt: offsetDateTimeSchema,
  })
  .strict();
export type LessonSession = z.infer<typeof lessonSessionSchema>;

export const activityAttemptSchema = z
  .object({
    id: z.string().uuid(),
    sessionId: z.string().uuid(),
    activityId: entityIdSchema,
    attemptNumber: z.number().int().positive(),
    idempotencyKey: z.string().uuid(),
    response: activityResponseSchema,
    evaluation: activityEvaluationSchema,
    submittedAt: offsetDateTimeSchema,
  })
  .strict();
export type ActivityAttempt = z.infer<typeof activityAttemptSchema>;
