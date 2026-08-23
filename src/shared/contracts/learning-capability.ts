import { z } from "zod";

/** The four language skills Vidlish may accumulate evidence about. */
export const learningSkillSchema = z.enum([
  "listening",
  "reading",
  "speaking",
  "writing",
]);
export type LearningSkill = z.infer<typeof learningSkillSchema>;

/**
 * Whether the measured success happened after bounded help was opened.
 *
 * `independent` is stronger evidence, not a synonym for mastery.
 */
export const learningSupportLevelSchema = z.enum(["supported", "independent"]);
export type LearningSupportLevel = z.infer<typeof learningSupportLevelSchema>;

/**
 * How the learner answered a task. This is deliberately separate from the skill
 * the task measures. A dictation response is written, but that does not turn
 * dictation into evidence of free-writing ability.
 */
export const learningResponseModeSchema = z.enum([
  "selection",
  "writing",
  "speaking",
  "self_report",
]);
export type LearningResponseMode = z.infer<typeof learningResponseModeSchema>;

export const learningCapabilityEvidenceKindSchema = z.enum([
  "beginner_dictation",
  "lesson_activity",
]);
export type LearningCapabilityEvidenceKind = z.infer<
  typeof learningCapabilityEvidenceKindSchema
>;

/**
 * One privacy-safe observation about a skill.
 *
 * This object records what a task actually measured. It intentionally carries
 * no learner free text, transcript, audio or generated answer key. Consumers
 * must not infer capability for `responseMode`; only `targetSkill` is measured.
 */
export const learningCapabilityObservationSchema = z
  .object({
    itemKey: z.string().min(1).max(160),
    targetSkill: learningSkillSchema,
    support: learningSupportLevelSchema,
    responseMode: learningResponseModeSchema,
    outcome: z.enum(["successful", "unsuccessful"]),
    evidenceKind: learningCapabilityEvidenceKindSchema,
    observedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export type LearningCapabilityObservation = z.infer<
  typeof learningCapabilityObservationSchema
>;
