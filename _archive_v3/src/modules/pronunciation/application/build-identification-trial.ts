import {
  CONTRASTS,
  TRAINING_VOICES,
  type Contrast,
  type ContrastId,
} from "../content/minimal-pairs";

/**
 * Builds one forced-choice identification trial: play a word, ask which of two
 * spellings it was.
 *
 * This is the task the whole HVPT literature is built on — Logan and colleagues
 * ran it as "is this rock or lock?" over 68 minimal pairs and six talkers, and
 * the design has barely changed since because it works. Two properties do the
 * work, and both are easy to lose by accident:
 *
 *   - The learner must choose between two spellings that differ only in the
 *     trained sound. Given any other cue, they will use it, and the trial then
 *     measures that cue instead.
 *   - The voice must change. Hearing one speaker teaches that speaker; the
 *     point is a category that survives a stranger.
 *
 * What this is not: evidence. It is practice. A perceptual gain is a claim
 * about what the learner can hear, and the only honest way to make it is a
 * pre/post identification test — including one voice never trained on, to tell
 * a formed category apart from three memorised speakers. Until that exists,
 * nothing here is stored as if the learner had proved anything.
 */

export type IdentificationTrial = {
  readonly contrastId: ContrastId;
  /** The word that is actually played. */
  readonly spoken: string;
  readonly voice: string;
  /** Both spellings, in the order they should be offered. */
  readonly options: readonly [string, string];
};

/** Deterministic when given a seeded generator, so trials can be tested. */
export function buildIdentificationTrial(input: {
  readonly contrastId: ContrastId;
  readonly random?: () => number;
}): IdentificationTrial {
  const random = input.random ?? Math.random;
  const contrast = CONTRASTS.find((candidate) => candidate.id === input.contrastId);
  if (!contrast) throw new Error(`Unknown contrast: ${input.contrastId}`);

  const pair = pick(contrast.pairs, random);
  const spokenIsA = random() < 0.5;
  const spoken = spokenIsA ? pair.a : pair.b;

  // The two options are always presented in the same order as the contrast
  // defines them. Shuffling position as well as which word is spoken would let
  // a learner who never hears the difference still land on 50% while feeling
  // like the task moved — the position carries no information either way, and a
  // stable layout keeps the choice about the sound.
  return {
    contrastId: contrast.id,
    spoken,
    voice: pick(TRAINING_VOICES, random),
    options: [pair.a, pair.b],
  };
}

/**
 * Which contrast to work on next.
 *
 * Lowest accuracy first, and untried contrasts before tried ones: there is no
 * value in drilling a distinction the learner already hears, and the cost of
 * getting this wrong is spending the session on the easy one.
 */
export function nextContrast(
  accuracyById: Readonly<Record<string, { correct: number; total: number }>>,
): Contrast {
  const scored = CONTRASTS.map((contrast) => {
    const record = accuracyById[contrast.id];
    return {
      contrast,
      // Untried sorts ahead of everything, including a contrast at zero.
      accuracy: !record || record.total === 0 ? -1 : record.correct / record.total,
    };
  });
  scored.sort((a, b) => a.accuracy - b.accuracy);
  return scored[0]!.contrast;
}

function pick<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) throw new Error("nothing to pick from");
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))]!;
}
