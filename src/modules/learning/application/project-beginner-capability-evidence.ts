import type { BeginnerWordEvidence } from "@/modules/learning/ports/beginner-progress-repository";
import {
  learningCapabilityObservationSchema,
  type LearningCapabilityObservation,
} from "@/shared/contracts/learning-capability";

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
