import type { BeginnerWordEvidence } from "@/modules/learning/ports/beginner-progress-repository";
import {
  learningCapabilityObservationSchema,
  type LearningCapabilityObservation,
} from "@/shared/contracts/learning-capability";
import type { LearningReviewItemState } from "@/shared/contracts/learning-review";

/**
 * What a learner has produced without help, and what they have not.
 *
 * `last_independent_at` is recorded on every item and shown to nobody. It is
 * the closest thing this product observes to independent use — a correct
 * production with no support open — and it is the one signal none of the
 * dual-subtitle tools keep at all: they stop at giving access to input.
 *
 * The progress page meanwhile counts lessons started and finished, which is the
 * "XP for looks" its own headline rejects. Finishing a lesson says a learner
 * sat through it.
 */

export type CapabilityEvidence = {
  /** Produced correctly at least once with no support open. */
  independent: LearningReviewItemState[];
  /** Produced correctly, but only with support open. */
  supported: LearningReviewItemState[];
  /** Met, not yet produced correctly at all. */
  encountered: LearningReviewItemState[];
  /** Independent *and* reused in a changed context. */
  transferred: LearningReviewItemState[];
};

export function summariseCapabilityEvidence(
  items: readonly LearningReviewItemState[],
): CapabilityEvidence {
  const independent = items.filter((item) => item.lastIndependentAt !== null);
  const supported = items.filter(
    (item) => item.lastIndependentAt === null && item.successfulRetrievals > 0,
  );
  const encountered = items.filter(
    (item) => item.lastIndependentAt === null && item.successfulRetrievals === 0,
  );

  return {
    independent,
    supported,
    encountered,
    // Both, deliberately. Reuse after a supported retrieval is a weaker claim
    // than reuse after an unaided one, and collapsing them would let the
    // stronger label be earned by the weaker path.
    transferred: items.filter(
      (item) =>
        item.lastIndependentAt !== null && item.transferSucceededAt !== null,
    ),
  };
}

export type BeginnerCapabilityProjection = {
  readonly observations: LearningCapabilityObservation[];
  /**
   * Productive evidence that cannot yet be assigned to speaking or writing.
   *
   * The current `introduce_word` flow records a calibrated independent claim,
   * but it does not record whether the learner spoke or wrote the word. Keeping
   * this count visible prevents a future consumer from silently guessing a
   * modality and inflating one of the four skills.
   */
  readonly unclassifiedProductiveRetrievals: number;
};

/**
 * Project durable beginner evidence into the four-skill capability model.
 *
 * Only evidence whose measured skill is known is projected. Dictation measures
 * listening discrimination/recognition through a written response, so it
 * becomes listening evidence with `responseMode: writing`. The response mode is
 * not itself counted as writing capability.
 */
export function projectBeginnerCapabilityEvidence(
  evidence: BeginnerWordEvidence,
): BeginnerCapabilityProjection {
  const observations: LearningCapabilityObservation[] = [];

  if (
    evidence.successfulDictations > 0 &&
    evidence.lastSuccessfulDictationAt !== null
  ) {
    const independent = evidence.lastIndependentDictationAt !== null;
    observations.push(
      learningCapabilityObservationSchema.parse({
        itemKey: evidence.word,
        targetSkill: "listening",
        support: independent ? "independent" : "supported",
        responseMode: "writing",
        outcome: "successful",
        evidenceKind: "beginner_dictation",
        observedAt: independent
          ? evidence.lastIndependentDictationAt
          : evidence.lastSuccessfulDictationAt,
      }),
    );
  }

  return {
    observations,
    unclassifiedProductiveRetrievals: evidence.successfulRetrievals,
  };
}
