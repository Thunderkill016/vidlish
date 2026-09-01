import { z } from "zod";

/**
 * The curriculum, as data.
 *
 * Until now nothing in this product decided *what* a learner should be able to
 * do. Word order decided what they met next, and a word list is not a
 * curriculum: it can tell you `water` comes before `mountain` and it cannot
 * tell you whether the learner can order a drink.
 *
 * So a unit is defined by a can-do statement and by the evidence that would
 * settle it, and the language it teaches hangs off that rather than the other
 * way round. This is the piece that lets a model author material without ever
 * deciding what is worth learning.
 *
 * Units are content, not code. They live as data so that a person can read the
 * whole syllabus, review it, and change it without touching a component.
 */

/**
 * Nation's four strands: a balanced course gives each about a quarter of the
 * time, and no more than a quarter to the direct study of language items.
 *
 * Named in the schema rather than left implicit because this product has
 * already drifted once: the beginner path was built almost entirely out of
 * `language_focused` work — words gated, retrieved and spelled — with no
 * extended listening for meaning, no communicative output, and no fluency
 * practice at all. A unit that carries the strand on every activity makes that
 * imbalance visible to a validator instead of to a learner months later.
 */
export const learningStrandSchema = z.enum([
  "meaning_focused_input",
  "meaning_focused_output",
  "language_focused",
  "fluency_development",
]);

export const cefrStageSchema = z.enum(["Pre-A1", "A1", "A2"]);

/** A can-do statement. Vietnamese is what the learner reads. */
export const canDoSchema = z.object({
  vi: z.string().min(1).max(200),
  en: z.string().min(1).max(200),
});

/**
 * A stretch of language the learner meets whole.
 *
 * Chunks, not only single words, because fluent speech runs on multi-word
 * sequences — `my name is`, `can I have`, `nice to meet you` — and a learner
 * who assembles those from grammar rules each time is slow in exactly the
 * situations that need speed.
 */
export const chunkSchema = z.object({
  text: z.string().min(1).max(80),
  vi: z.string().min(1).max(200),
});

export const sceneSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),
  /** Spoken line, in the target language. */
  text: z.string().min(1).max(200),
  /** Who says it, so the scene reads as an exchange rather than a list. */
  speaker: z.string().min(1).max(40),
  vi: z.string().min(1).max(300).optional(),
});

export const curriculumActivitySchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),
  strand: learningStrandSchema,
  skill: z.enum(["listening", "speaking", "reading", "writing"]),
  /** What the learner is asked to do, in Vietnamese. */
  promptVi: z.string().min(1).max(300),
  /** Chunk texts this activity practises. Must exist in the unit. */
  targets: z.array(z.string().min(1).max(80)).min(1).max(6),
  /** Whether any support may be open. A retrieval with support is not one. */
  supportAllowed: z.boolean(),
});

/**
 * What would settle whether the learner can do the thing.
 *
 * Deliberately not "completed the unit". Completion measures attendance;
 * these measure the three properties this product already treats as evidence:
 * produced without support, reused in a situation it was not taught in, and
 * still there after a delay.
 */
export const evidenceCriterionSchema = z.object({
  chunk: z.string().min(1).max(80),
  independent: z.boolean(),
  changedContext: z.boolean(),
  delayed: z.boolean(),
});

export const foundationUnitSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),
    cefr: cefrStageSchema,
    canDo: canDoSchema,
    communicativeFunction: z.string().min(1).max(120),
    /** Unit ids that must be evidenced first. Never "units completed". */
    prerequisites: z.array(z.string()).max(8),
    targetChunks: z.array(chunkSchema).min(1).max(12),
    /**
     * Free-text notes for a reader. Not checkable against anything.
     */
    grammarFeatures: z.array(z.string().min(1).max(80)).max(8),
    /**
     * Which items of the published CEFR-J grammar inventory this unit teaches.
     *
     * `grammarFeatures` held phrases like `negative with don't`, which reads
     * well and can be compared with nothing — so "does this course cover A1?"
     * had no answer. These are shorthand codes from the CEFR-J Grammar Profile,
     * and a test both rejects a code that does not exist and prints the share
     * of the A1 inventory the syllabus actually reaches.
     */
    grammarCodes: z.array(z.string().min(1).max(40)).max(12).default([]),
    inputScenes: z.array(sceneSchema).min(2).max(20),
    activities: z.array(curriculumActivitySchema).min(3).max(24),
    evidenceCriteria: z.array(evidenceCriterionSchema).min(1).max(12),
  })
  .superRefine((unit, ctx) => {
    const chunks = new Set(unit.targetChunks.map((chunk) => chunk.text));

    unit.activities.forEach((activity, index) => {
      for (const target of activity.targets) {
        if (chunks.has(target)) continue;
        ctx.addIssue({
          code: "custom",
          path: ["activities", index, "targets"],
          message: `Activity practises "${target}", which the unit does not teach.`,
        });
      }
    });

    unit.evidenceCriteria.forEach((criterion, index) => {
      if (chunks.has(criterion.chunk)) return;
      ctx.addIssue({
        code: "custom",
        path: ["evidenceCriteria", index, "chunk"],
        message: `Evidence is claimed for "${criterion.chunk}", which the unit does not teach.`,
      });
    });

    // Every chunk the unit names must be sayable somewhere in its input, or the
    // learner is asked to produce language they have never heard.
    const spoken = unit.inputScenes
      .map((scene) => scene.text.toLocaleLowerCase("en-US"))
      .join(" | ");
    unit.targetChunks.forEach((chunk, index) => {
      if (spoken.includes(chunk.text.toLocaleLowerCase("en-US"))) return;
      ctx.addIssue({
        code: "custom",
        path: ["targetChunks", index, "text"],
        message: `"${chunk.text}" is taught but never appears in the unit's input.`,
      });
    });

    // The balance rule, enforced rather than hoped for.
    const languageFocused = unit.activities.filter(
      (activity) => activity.strand === "language_focused",
    ).length;
    if (languageFocused * 2 > unit.activities.length) {
      ctx.addIssue({
        code: "custom",
        path: ["activities"],
        message:
          "More than half of this unit is language-focused study. A balanced unit also needs input for meaning, output for meaning, and fluency work.",
      });
    }

    const strands = new Set(unit.activities.map((activity) => activity.strand));
    if (!strands.has("meaning_focused_input")) {
      ctx.addIssue({
        code: "custom",
        path: ["activities"],
        message: "A unit with no meaning-focused input teaches about the language rather than the language.",
      });
    }
    if (!strands.has("meaning_focused_output")) {
      ctx.addIssue({
        code: "custom",
        path: ["activities"],
        message: "A unit with no meaning-focused output cannot show the learner can use what it taught.",
      });
    }
  });

export type FoundationUnit = z.infer<typeof foundationUnitSchema>;
export type CurriculumActivity = z.infer<typeof curriculumActivitySchema>;
export type LearningStrand = z.infer<typeof learningStrandSchema>;
export type EvidenceCriterion = z.infer<typeof evidenceCriterionSchema>;
