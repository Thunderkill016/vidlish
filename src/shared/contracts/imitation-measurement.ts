import { z } from "zod";

/**
 * One item as the browser receives it.
 *
 * There is no `text`. The learner is meant to hear the sentence and never to
 * read it — a sentence on screen turns the task into reading aloud, which
 * measures nothing about parsing. The server holds the text and grades against
 * it, so the browser cannot leak what it does not have.
 */
export const imitationItemSchema = z.object({
  id: z.string().regex(/^ei-\d{2}-[a-z]$/),
  audioUrl: z.string().startsWith("/audio/"),
  syllables: z.number().int().min(1).max(60),
});

export const imitationSittingSchema = z.object({
  bankVersion: z.string().min(3).max(64),
  items: z.array(imitationItemSchema).min(1).max(60),
});

export type ImitationSitting = z.infer<typeof imitationSittingSchema>;

export const imitationSubmissionSchema = z
  .object({
    bankVersion: z.string().min(3).max(64),
    attempts: z
      .array(
        z
          .object({
            itemId: z.string().regex(/^ei-\d{2}-[a-z]$/),
            /** What the on-device recogniser heard. Scored, then discarded. */
            transcript: z.string().max(400),
          })
          .strict(),
      )
      .min(1)
      .max(60),
  })
  .strict();

export const imitationResultSchema = z.object({
  attempted: z.number().int().min(1),
  passed: z.number().int().min(0),
  heldTo: z.number().int().min(0),
  brokeAt: z.number().int().min(0),
  aboveBank: z.boolean(),
  takenAt: z.string(),
  /**
   * Per item, so the learner can see which sentence the machine mis-heard
   * rather than being handed a number. A score nobody can inspect is an
   * assertion.
   */
  perItem: z.array(
    z.object({
      itemId: z.string(),
      syllables: z.number().int(),
      errors: z.number().int().min(0),
      reproduced: z.boolean(),
      heardBack: z.string(),
    }),
  ),
});

export type ImitationResult = z.infer<typeof imitationResultSchema>;
