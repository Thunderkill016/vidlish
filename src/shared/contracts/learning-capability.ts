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
 * Whether bounded help was open while the observation was produced.
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

/**
 * What the observation is evidence about.
 *
 * Item evidence can feed lexical/item progress. Activity evidence is kept at
 * activity scope so comprehension or multi-item transfer cannot masquerade as
 * mastery of one vocabulary item.
 */
export const learningCapabilitySubjectSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("language_item"),
      key: z.string().min(1).max(160),
    })
    .strict(),
  z
    .object({
      kind: z.literal("activity"),
      key: z.string().regex(/^[a-z][a-z0-9_-]{2,63}$/),
    })
    .strict(),
]);
export type LearningCapabilitySubject = z.infer<
  typeof learningCapabilitySubjectSchema
>;

/**
 * How strongly the product verified the observation.
 *
 * Only `objective` evidence may claim success/failure. Self-check and
 * self-report observations are still useful history, but they remain unscored.
 */
export const learningCapabilityVerificationSchema = z.enum([
  "objective",
  "self_check",
  "self_report",
]);
export type LearningCapabilityVerification = z.infer<
  typeof learningCapabilityVerificationSchema
>;

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
 * This records what a task actually measured without learner free text,
 * transcript, audio or generated answer keys. Consumers must not infer
 * capability for `responseMode`; only `targetSkill` is measured. `subject`
 * controls what entity may receive that evidence.
 */
export const learningCapabilityObservationSchema = z
  .object({
    subject: learningCapabilitySubjectSchema,
    targetSkill: learningSkillSchema,
    support: learningSupportLevelSchema,
    responseMode: learningResponseModeSchema,
    verification: learningCapabilityVerificationSchema,
    outcome: z.enum(["successful", "unsuccessful", "unscored"]),
    evidenceKind: learningCapabilityEvidenceKindSchema,
    observedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((observation, context) => {
    if (
      observation.verification !== "objective" &&
      observation.outcome !== "unscored"
    ) {
      context.addIssue({
        code: "custom",
        path: ["outcome"],
        message:
          "Self-check and self-report evidence cannot claim successful or unsuccessful capability.",
      });
    }
  });

export type LearningCapabilityObservation = z.infer<
  typeof learningCapabilityObservationSchema
>;
