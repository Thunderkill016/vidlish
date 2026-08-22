import { z } from "zod";

/**
 * What a beginner session is, on the wire.
 *
 * `source` is on the response on purpose. A learner never needs to know whether
 * a sentence was written by a person or generated, but the product does: the
 * two fail in different ways, and an attempt recorded without it cannot later
 * answer which kind of sentence a learner struggled with.
 */

export const beginnerSentenceSchema = z.object({
  text: z.string().min(1).max(200),
  /** Present only where a human translation exists. Most sentences have none. */
  vi: z.string().min(1).max(400).optional(),
});

export const beginnerSessionResponseSchema = z.object({
  target: z.string().min(1).max(64),
  source: z.enum(["retrieved", "generated"]),
  sentences: z.array(beginnerSentenceSchema).min(1).max(12),
  /** How many words the learner can already produce unaided. */
  knownWordCount: z.number().int().min(0),
});

/**
 * The first words of a language cannot arrive inside a sentence, because at
 * zero known words no sentence can satisfy i+1. They arrive on their own.
 */
export const beginnerWordIntroductionSchema = z.object({
  kind: z.literal("introduce_word"),
  target: z.string().min(1).max(64),
  knownWordCount: z.number().int().min(0),
});

export const beginnerAttemptRequestSchema = z.object({
  word: z.string().min(1).max(64),
  /** True when the learner opened any support before answering. */
  usedSupport: z.boolean(),
  /**
   * The sentence that was played and what the learner wrote down.
   *
   * When both are present the server scores the answer and decides
   * independence itself. When they are absent — the very first words, which
   * arrive alone and cannot be dictated — the learner's own report is all
   * there is, and the nonword check is what keeps it honest.
   */
  sentence: z.string().min(1).max(200).optional(),
  heard: z.string().max(400).optional(),
  claimedIndependent: z.boolean().optional(),
});

export const beginnerAttemptResponseSchema = z.object({
  word: z.string(),
  successfulRetrievals: z.number().int().min(0),
  known: z.boolean(),
  /** Present when the answer was checked rather than reported. */
  dictation: z
    .object({
      correct: z.number().int().min(0),
      total: z.number().int().min(0),
      missed: z.array(z.string()),
      perfect: z.boolean(),
    })
    .optional(),
});

/**
 * A check that the learner's "I know this" means something.
 *
 * The answers carry no claim about which items were real. The server knows, and
 * a browser that could say so could clear every check it ever took.
 */
export const beginnerCalibrationRequestSchema = z.object({
  answers: z
    .array(
      z.object({
        item: z.string().min(1).max(64),
        claimedKnown: z.boolean(),
      }),
    )
    .min(4)
    .max(24),
});

export const beginnerCalibrationResponseSchema = z.object({
  reliable: z.boolean(),
  falseAlarmRate: z.number().min(0).max(1),
  /** Share of real words known once guessing is removed. */
  corrected: z.number().min(0).max(1),
});

export const beginnerCalibrationItemsSchema = z.object({
  items: z.array(z.string().min(1).max(64)).min(4).max(24),
});

export type BeginnerCalibrationItems = z.infer<
  typeof beginnerCalibrationItemsSchema
>;
export type BeginnerCalibrationResponse = z.infer<
  typeof beginnerCalibrationResponseSchema
>;

export type BeginnerSessionResponse = z.infer<
  typeof beginnerSessionResponseSchema
>;
export type BeginnerAttemptResponse = z.infer<
  typeof beginnerAttemptResponseSchema
>;
