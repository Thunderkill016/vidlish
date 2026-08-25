/**
 * Scores one shadowed line on timing, which is the axis shadowing actually
 * moves and the axis word error rate cannot see.
 *
 * The repo already scores speech by WER, and that scorer is validated against
 * human raters — but it counts words. Shadowing's measured gains are
 * suprasegmental: intonation (d = 1.50), linking (d = 1.16), stress (d = 1.08)
 * on Vietnamese A2 learners, with no significant gain in segmental production
 * at all (Niimoto 2022). A learner can score a perfect WER while flattening
 * every contour, which is precisely the shape of illusory progress this product
 * exists to refuse. So timing is scored separately and the two numbers are
 * never averaged into one.
 *
 * Two measures, both from the amplitude envelope:
 *
 *   - articulation rate — syllables over voiced time, excluding pauses. The
 *     syllable count is not estimated here; it comes from CMUdict at build
 *     time, so this is a measurement rather than a guess.
 *   - envelope correlation — the shape of loudness over time, after both
 *     recordings are normalised to the same length. This is what carries the
 *     alternation of prominence that rhythm consists of.
 *
 * Both are established acoustic measures of speech rhythm, and articulation
 * rate together with interval-based rhythm measures predicts human similarity
 * ratings of L2 speech. Neither is a phonetic transcription: this reports
 * rhythm, and must never be presented to a learner as pronunciation accuracy.
 *
 * See docs/product/SHADOWING_SPEC.md.
 */

export type SpeechEnvelope = {
  /** Amplitude per frame, non-negative, in any consistent unit. */
  readonly frames: readonly number[];
  readonly frameRate: number;
};

/**
 * A frame counts as voiced when it reaches this fraction of the recording's own
 * peak. Relative rather than absolute because microphone gain varies by an
 * order of magnitude between devices and an absolute floor would call a quiet
 * laptop mic silent.
 */
const VOICED_FRACTION_OF_PEAK = 0.1;

/**
 * Below this peak the recording is treated as no speech at all rather than as
 * very quiet speech. Envelope frames are normalised to 0..1 by the capture
 * layer, so this is 1% of full scale — room tone, not a voice.
 */
const SILENT_RECORDING_PEAK = 0.01;

/** Both envelopes are resampled to this many points before correlating. */
const RHYTHM_COMPARISON_POINTS = 64;

/**
 * How far the learner's articulation rate may sit from the reference before the
 * product says so. Shadowing asks the learner to track the speaker, so rate is
 * the thing being trained; ±25% is wide enough not to punish natural variation
 * and narrow enough to catch the two failures that matter — reciting far slower
 * than the model, and racing ahead of it.
 */
const ACCEPTABLE_RATE_DEVIATION = 0.25;

/**
 * Envelope correlation at or above this is called matching. Chosen as the
 * conventional threshold for a strong linear relationship; it is a product
 * threshold, not a finding, and is stated as such wherever it is shown.
 */
const MATCHING_ENVELOPE_CORRELATION = 0.7;

/**
 * Below this summed squared deviation a contour is flat and there is nothing to
 * correlate. Envelope frames are normalised to 0..1, so even a contour varying
 * by 0.01 RMS across the 64 comparison points sums to ~6e-3 — four orders of
 * magnitude above this floor. What it does catch is floating-point residue:
 * interpolating a constant leaves variance around 1e-32, and dividing that
 * noise by itself yields an arbitrary correlation rather than the honest zero.
 */
const FLAT_CONTOUR_VARIANCE = 1e-9;

export type ShadowingRhythmScore =
  | { readonly kind: "no_speech" }
  | {
      readonly kind: "scored";
      readonly learnerArticulationRate: number;
      readonly referenceArticulationRate: number;
      /** learner / reference. 1 is identical, <1 is slower than the model. */
      readonly rateRatio: number;
      /** Pearson correlation of the two loudness contours, -1..1. */
      readonly envelopeCorrelation: number;
      readonly timing: "slower_than_model" | "faster_than_model" | "tracking";
      readonly contour: "matching" | "drifting";
    };

function voicedSeconds(envelope: SpeechEnvelope): number {
  const peak = Math.max(0, ...envelope.frames);
  if (peak < SILENT_RECORDING_PEAK) return 0;
  const floor = peak * VOICED_FRACTION_OF_PEAK;
  const voiced = envelope.frames.filter((frame) => frame >= floor).length;
  return voiced / envelope.frameRate;
}

/** Drops leading and trailing silence, which is device latency, not speech. */
function trimToSpeech(envelope: SpeechEnvelope): readonly number[] {
  const peak = Math.max(0, ...envelope.frames);
  if (peak < SILENT_RECORDING_PEAK) return [];
  const floor = peak * VOICED_FRACTION_OF_PEAK;
  const first = envelope.frames.findIndex((frame) => frame >= floor);
  if (first === -1) return [];
  let last = envelope.frames.length - 1;
  while (last > first && envelope.frames[last]! < floor) last -= 1;
  return envelope.frames.slice(first, last + 1);
}

/**
 * Resamples to a fixed length so two recordings of different duration can be
 * compared on shape. Linear interpolation: the envelope is already a smoothed
 * signal, so nothing sharper is warranted.
 */
function resample(frames: readonly number[], points: number): number[] {
  if (frames.length === 0) return [];
  if (frames.length === 1) return Array.from({ length: points }, () => frames[0]!);
  const out: number[] = [];
  for (let index = 0; index < points; index += 1) {
    const position = (index / (points - 1)) * (frames.length - 1);
    const low = Math.floor(position);
    const high = Math.min(low + 1, frames.length - 1);
    const fraction = position - low;
    out.push(frames[low]! * (1 - fraction) + frames[high]! * fraction);
  }
  return out;
}

function pearson(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  const meanA = a.reduce((sum, value) => sum + value, 0) / n;
  const meanB = b.reduce((sum, value) => sum + value, 0) / n;
  let covariance = 0;
  let varianceA = 0;
  let varianceB = 0;
  for (let index = 0; index < n; index += 1) {
    const deltaA = a[index]! - meanA;
    const deltaB = b[index]! - meanB;
    covariance += deltaA * deltaB;
    varianceA += deltaA * deltaA;
    varianceB += deltaB * deltaB;
  }
  // A flat recording has no contour to correlate. Zero says "no relationship",
  // which is the truthful answer; dividing would give either NaN or, worse,
  // a confident number computed from rounding error.
  if (varianceA <= FLAT_CONTOUR_VARIANCE || varianceB <= FLAT_CONTOUR_VARIANCE) {
    return 0;
  }
  return covariance / Math.sqrt(varianceA * varianceB);
}

export function scoreShadowingRhythm(input: {
  readonly learner: SpeechEnvelope;
  readonly reference: SpeechEnvelope;
  /** Syllables in the target line, counted from CMUdict at build time. */
  readonly syllables: number;
}): ShadowingRhythmScore {
  const learnerVoiced = voicedSeconds(input.learner);
  const referenceVoiced = voicedSeconds(input.reference);
  if (learnerVoiced === 0 || referenceVoiced === 0 || input.syllables <= 0) {
    return { kind: "no_speech" };
  }

  const learnerArticulationRate = input.syllables / learnerVoiced;
  const referenceArticulationRate = input.syllables / referenceVoiced;
  const rateRatio = learnerArticulationRate / referenceArticulationRate;

  const envelopeCorrelation = pearson(
    resample(trimToSpeech(input.learner), RHYTHM_COMPARISON_POINTS),
    resample(trimToSpeech(input.reference), RHYTHM_COMPARISON_POINTS),
  );

  return {
    kind: "scored",
    learnerArticulationRate,
    referenceArticulationRate,
    rateRatio,
    envelopeCorrelation,
    timing:
      rateRatio < 1 - ACCEPTABLE_RATE_DEVIATION
        ? "slower_than_model"
        : rateRatio > 1 + ACCEPTABLE_RATE_DEVIATION
          ? "faster_than_model"
          : "tracking",
    contour:
      envelopeCorrelation >= MATCHING_ENVELOPE_CORRELATION ? "matching" : "drifting",
  };
}
