import { z } from "zod";

import { MAX_EVIDENCE_SEGMENTS } from "@/shared/contracts/lesson-v2";

import {
  canDoOutcomeSchema,
  learnerContextSnapshotSchema,
} from "@/shared/contracts/lesson-v2";
import { videoIdSchema } from "@/shared/contracts/video";

export const LEARNING_DIAGNOSIS_VERSION =
  "video-diagnosis:v2-deterministic-v1" as const;
export const LEARNING_DIAGNOSIS_PROPOSAL_VERSION =
  "learning-diagnosis-proposal:v2" as const;
export const LEARNING_CANDIDATE_SELECTION_VERSION =
  "candidate-selection:v2-deterministic-v1" as const;
export const LEARNING_AUTHORING_BRIEF_VERSION =
  "learning-authoring-brief:v2" as const;

const segmentIdSchema = z.string().regex(/^seg_[a-f0-9]{32}$/);
const entityIdSchema = z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/);

export const learningWindowCandidateSchema = z
  .object({
    id: entityIdSchema,
    // Bounded by what a blueprint's evidence range can hold. A window wider than
    // that reaches the model, gets cited, and is only refused after both calls
    // are paid for.
    sourceSegmentIds: z
      .array(segmentIdSchema)
      .min(1)
      .max(MAX_EVIDENCE_SEGMENTS),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    wordCount: z.number().int().positive(),
    evidenceConfidence: z.number().min(0).max(1),
  })
  .strict()
  .refine((window) => window.endMs > window.startMs, {
    message: "Learning window must end after it starts.",
    path: ["endMs"],
  });
export type LearningWindowCandidate = z.infer<
  typeof learningWindowCandidateSchema
>;

export const videoLearningProfileV2Schema = z
  .object({
    diagnosisVersion: z.literal(LEARNING_DIAGNOSIS_VERSION),
    durationMs: z.number().int().positive(),
    speechDensity: z.enum(["low", "medium", "high"]),
    estimatedSpeechRateWpm: z.number().min(0).max(500).nullable(),
    topicShiftCount: z.number().int().nonnegative(),
    register: z
      .array(
        z.enum([
          "neutral",
          "informal",
          "slang",
          "technical",
          "argumentative",
        ]),
      )
      .min(1)
      .max(5),
    audioChallenge: z
      .array(z.enum(["fast", "overlap", "noise", "accent", "reduction", "none"]))
      .min(1)
      .max(6),
    lexicalCoverageEstimate: z.number().min(0).max(1).nullable(),
    backgroundKnowledgeDependency: z.enum(["low", "medium", "high"]),
    candidateWindows: z.array(learningWindowCandidateSchema).min(1).max(100),
  })
  .strict();
export type VideoLearningProfileV2 = z.infer<
  typeof videoLearningProfileV2Schema
>;

export const candidateScoringHintsSchema = z
  .object({
    outcomeRelevance: z.number().min(0).max(1),
    transferValue: z.number().min(0).max(1),
    contextualClarity: z.number().min(0).max(1),
    pragmaticRegisterValue: z.number().min(0).max(1),
    acousticTeachability: z.number().min(0).max(1),
  })
  .strict();
export type CandidateScoringHints = z.infer<
  typeof candidateScoringHintsSchema
>;

export const candidateLanguageProposalSchema = z
  .object({
    id: entityIdSchema,
    key: z.string().min(1).max(160),
    surfaceForm: z.string().min(1).max(160),
    normalizedForm: z.string().min(1).max(160),
    sourceSegmentIds: z.array(segmentIdSchema).min(1).max(5),
    outcomeIds: z.array(entityIdSchema).min(1).max(4),
    kind: z.enum([
      "chunk",
      "word",
      "grammar_function",
      "discourse_marker",
      "pronunciation_pattern",
    ]),
    contextualMeaningVi: z.string().min(5).max(500),
    communicativeFunctionVi: z.string().min(5).max(500).nullable(),
    register: z.enum([
      "neutral",
      "informal",
      "slang",
      "technical",
      "formal",
    ]),
    corpusFrequencyBand: z.enum(["high", "mid", "low", "unknown"]),
    evidenceConfidence: z.number().min(0).max(1),
    properNounOrTrivia: z.boolean(),
    generatedScenarioPossible: z.boolean(),
    scoringHints: candidateScoringHintsSchema,
    rationaleVi: z.string().min(10).max(700),
  })
  .strict();
export type CandidateLanguageProposal = z.infer<
  typeof candidateLanguageProposalSchema
>;

export const diagnosisWindowProposalSchema = z
  .object({
    windowId: entityIdSchema,
    gistVi: z.string().min(10).max(500),
    discourseFunctionVi: z.string().min(5).max(300),
    outcomeCandidates: z
      .array(
        canDoOutcomeSchema.extend({
          confidence: z.number().min(0).max(1),
        }),
      )
      .min(1)
      .max(4),
    itemCandidates: z.array(candidateLanguageProposalSchema).max(20),
  })
  .strict();
export type DiagnosisWindowProposal = z.infer<
  typeof diagnosisWindowProposalSchema
>;

export const constrainedDiagnosisProposalSchema = z
  .object({
    proposalVersion: z.literal(LEARNING_DIAGNOSIS_PROPOSAL_VERSION),
    windows: z.array(diagnosisWindowProposalSchema).max(20),
    abstainReason: z.string().min(5).max(500).nullable(),
  })
  .strict()
  .superRefine((proposal, context) => {
    if (proposal.abstainReason === null && proposal.windows.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["windows"],
        message: "A non-abstaining diagnosis requires at least one window.",
      });
    }
    if (proposal.abstainReason !== null && proposal.windows.length > 0) {
      context.addIssue({
        code: "custom",
        path: ["windows"],
        message: "An abstaining diagnosis cannot also propose windows.",
      });
    }
  });
export type ConstrainedDiagnosisProposal = z.infer<
  typeof constrainedDiagnosisProposalSchema
>;

export const candidateScoreComponentsSchema = z
  .object({
    learnerGap: z.number().min(0).max(1),
    outcomeRelevance: z.number().min(0).max(1),
    transferValue: z.number().min(0).max(1),
    contextualClarity: z.number().min(0).max(1),
    recurrenceOrFrequency: z.number().min(0).max(1),
    pragmaticRegisterValue: z.number().min(0).max(1),
    acousticTeachability: z.number().min(0).max(1),
    evidenceConfidence: z.number().min(0).max(1),
    redundancyPenalty: z.number().min(0).max(1),
    cognitiveCostPenalty: z.number().min(0).max(1),
    properNounOrTriviaPenalty: z.number().min(0).max(1),
    total: z.number().min(-1).max(1),
  })
  .strict();
export type CandidateScoreComponents = z.infer<
  typeof candidateScoreComponentsSchema
>;

export const selectedLearningCandidateSchema = candidateLanguageProposalSchema
  .extend({
    windowId: entityIdSchema,
    recurrenceCount: z.number().int().positive(),
    score: candidateScoreComponentsSchema,
  })
  .strict();
export type SelectedLearningCandidate = z.infer<
  typeof selectedLearningCandidateSchema
>;

export const learningCandidateRejectionReasonSchema = z.enum([
  "WINDOW_NOT_FOUND",
  "SEGMENT_NOT_PERMITTED",
  "SEGMENT_OUTSIDE_WINDOW",
  "OUTCOME_NOT_FOUND",
  "NORMALIZED_FORM_MISMATCH",
  "SOURCE_FORM_NOT_FOUND",
  "KNOWN_ITEM_NOT_DUE",
  "PROPER_NOUN_OR_TRIVIA",
  "NO_TRANSFER_SCENARIO",
  "CONTEXT_TOO_UNCLEAR",
  "EVIDENCE_CONFIDENCE_TOO_LOW",
  "DUPLICATE_NORMALIZED_FORM",
  "DIVERSITY_LIMIT",
  "BUDGET_LIMIT",
]);
export type LearningCandidateRejectionReason = z.infer<
  typeof learningCandidateRejectionReasonSchema
>;

export const learningCandidateSelectionSchema = z
  .object({
    selectionVersion: z.literal(LEARNING_CANDIDATE_SELECTION_VERSION),
    selectedWindowIds: z.array(entityIdSchema).min(1).max(3),
    selectedOutcomeIds: z.array(entityIdSchema).min(1).max(4),
    selectedItems: z.array(selectedLearningCandidateSchema).min(1).max(5),
    rejections: z
      .array(
        z
          .object({
            candidateId: entityIdSchema,
            reason: learningCandidateRejectionReasonSchema,
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export type LearningCandidateSelection = z.infer<
  typeof learningCandidateSelectionSchema
>;

const authoringPermissionSchema = z.enum([
  "instruction_vi",
  "distractors_vi",
  "explanation_vi",
  "transfer_scenario_vi",
  "transfer_example_en",
  "self_check_criteria_vi",
]);
const forbiddenAuthoringFieldSchema = z.enum([
  "source_quote",
  "source_timestamp",
  "canonical_evidence_text",
  "segment_id_outside_allowlist",
  "authoritative_runtime_evaluation",
]);

export const learningAuthoringBriefSchema = z
  .object({
    briefVersion: z.literal(LEARNING_AUTHORING_BRIEF_VERSION),
    jobId: z.string().uuid(),
    videoId: videoIdSchema,
    transcriptHash: z.string().regex(/^[a-f0-9]{64}$/),
    learner: learnerContextSnapshotSchema.pick({
      targetCefr: true,
      goals: true,
      timeBudgetMinutes: true,
      supportPreference: true,
    }),
    diagnosis: videoLearningProfileV2Schema.pick({
      speechDensity: true,
      estimatedSpeechRateWpm: true,
      topicShiftCount: true,
      register: true,
      audioChallenge: true,
      lexicalCoverageEstimate: true,
      backgroundKnowledgeDependency: true,
    }),
    windows: z
      .array(
        z
          .object({
            id: entityIdSchema,
            // Bounded by what a blueprint's evidence range can hold. A window wider than
    // that reaches the model, gets cited, and is only refused after both calls
    // are paid for.
    sourceSegmentIds: z
      .array(segmentIdSchema)
      .min(1)
      .max(MAX_EVIDENCE_SEGMENTS),
            gistVi: z.string().min(10).max(500),
            discourseFunctionVi: z.string().min(5).max(300),
            evidenceConfidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .min(1)
      .max(3),
    outcomes: z.array(canDoOutcomeSchema).min(1).max(4),
    targetItems: z.array(selectedLearningCandidateSchema).min(1).max(5),
    authoringPermissions: z.array(authoringPermissionSchema).min(1),
    forbiddenFields: z.array(forbiddenAuthoringFieldSchema).min(1),
  })
  .strict();
export type LearningAuthoringBrief = z.infer<
  typeof learningAuthoringBriefSchema
>;
