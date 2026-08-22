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
  /**
   * Whether the learner produced it with every support closed. The client
   * reports it; the server records nothing else as independence, and the
   * database keeps proof of independence from ever being erased.
   */
  independent: z.boolean(),
});

export const beginnerAttemptResponseSchema = z.object({
  word: z.string(),
  successfulRetrievals: z.number().int().min(0),
  known: z.boolean(),
});

export type BeginnerSessionResponse = z.infer<
  typeof beginnerSessionResponseSchema
>;
export type BeginnerAttemptResponse = z.infer<
  typeof beginnerAttemptResponseSchema
>;
