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
  /** Opaque server authority for the attempt on this exact sentence. */
  challengeId: z.string().uuid(),
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
 * zero known words no sentence can satisfy the current one-new-word policy.
 * They arrive on their own but still receive a server-owned evidence challenge.
 */
export const beginnerWordIntroductionSchema = z.object({
  kind: z.literal("introduce_word"),
  target: z.string().min(1).max(64),
  challengeId: z.string().uuid(),
  knownWordCount: z.number().int().min(0),
});

const beginnerAttemptBase = {
  challengeId: z.string().uuid(),
  /** True when the learner opened any support before answering. */
  usedSupport: z.boolean(),
};

/**
 * A browser reports learner action only. It never sends the word receiving
 * evidence or the authoritative dictation sentence; both live on the server
 * challenge identified by `challengeId`.
 */
/**
 * One curriculum activity, ready to serve.
 *
 * It is a separate response shape from the word and sentence ones because it is
 * a different kind of work: the unit decides what is practised and why, and the
 * runtime only plays it. Folding it into the sentence shape would have meant
 * pretending a communicative task is a dictation.
 */
export const beginnerUnitActivitySchema = z.object({
  kind: z.literal("unit_activity"),
  unitId: z.string().min(1).max(64),
  activityId: z.string().min(1).max(64),
  strand: z.enum([
    "meaning_focused_input",
    "meaning_focused_output",
    "language_focused",
    "fluency_development",
  ]),
  skill: z.enum(["listening", "speaking", "reading", "writing"]),
  promptVi: z.string().min(1).max(300),
  listen: z.array(z.string().min(1).max(200)).max(20),
  targets: z
    .array(
      z.object({
        text: z.string().min(1).max(80),
        vi: z.string().max(200),
      }),
    )
    .min(1)
    .max(6),
  supportAllowed: z.boolean(),
  /**
   * Present only for a retrieval. The browser never sends the chunk it is being
   * graded on; the server holds it against this single-use challenge, exactly
   * as it does for a dictated sentence.
   */
  challengeId: z.string().uuid().optional(),
});

export type BeginnerUnitActivity = z.infer<typeof beginnerUnitActivitySchema>;

export const beginnerAttemptRequestSchema = z.discriminatedUnion("kind", [
  z
    .object({
      ...beginnerAttemptBase,
      kind: z.literal("dictation"),
      heard: z.string().max(400),
    })
    .strict(),
  z
    .object({
      ...beginnerAttemptBase,
      kind: z.literal("introduce_word"),
      claimedIndependent: z.boolean(),
    })
    .strict(),
]);

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
 * The answers carry no claim about which items were real. POST independently
 * reconstructs the exact current item set before classifying any answer.
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
