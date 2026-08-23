import { deriveCanonicalReadingContext } from "./derive-canonical-reading-context";

import type { BeginnerWordEvidence } from "@/modules/learning/ports/beginner-progress-repository";
import {
  learningCapabilityObservationSchema,
  type LearningCapabilityObservation,
} from "@/shared/contracts/learning-capability";
import type { LearningReviewItemState } from "@/shared/contracts/learning-review";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import type {
  PrivacySafeActivityAttempt,
  PrivacySafeLearningSupportEvent,
} from "@/shared/contracts/privacy-safe-learning-evidence";

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
   * The current `introduce_word` flow does not record that modality.
   */
  readonly unclassifiedProductiveRetrievals: number;
};

/**
 * Project durable beginner evidence into the four-skill capability model.
 * Dictation measures listening through a written response; writing the answer
 * does not by itself prove free-writing capability.
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
        subject: { kind: "language_item", key: evidence.word },
        targetSkill: "listening",
        support: independent ? "independent" : "supported",
        responseMode: "writing",
        verification: "objective",
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

function supportWasOpenBeforeAttempt(input: {
  attempt: PrivacySafeActivityAttempt;
  supportEvents: readonly PrivacySafeLearningSupportEvent[];
}): boolean {
  const submittedAt = Date.parse(input.attempt.submittedAt);
  return input.supportEvents.some(
    (event) =>
      event.sessionId === input.attempt.sessionId &&
      event.activityId === input.attempt.activityId &&
      event.eventKind === "support_opened" &&
      Date.parse(event.occurredAt) <= submittedAt,
  );
}

/**
 * Project only lesson activities whose measured modality is defensible from the
 * immutable activity shape and whose verification strength is known.
 *
 * - `meaning_in_context` becomes objective lexical-reading evidence only when
 *   its cited canonical source context can be resolved. The learner view shows
 *   that exact text before the response; the model never supplies the passage.
 * - `chunk_recall` is an objectively checked typed production of one target
 *   item, so it can create item-level writing success/failure evidence.
 * - `guided_transfer` is genuinely written production, but the evaluator is a
 *   learner self-check across the whole changed-context task. Keep it at
 *   activity scope so checking a multi-item task cannot inflate every target
 *   item's mastery.
 * - Gist/reflection remain unprojected because the current blueprint does not
 *   establish a defensible measured modality for them here.
 */
export function projectLessonActivityCapabilityEvidence(input: {
  blueprint: LessonBlueprintV2;
  attempt: PrivacySafeActivityAttempt;
  supportEvents: readonly PrivacySafeLearningSupportEvent[];
}): LearningCapabilityObservation[] {
  const activity = input.blueprint.activities.find(
    (candidate) => candidate.id === input.attempt.activityId,
  );
  if (!activity) return [];

  const supportOpened = supportWasOpenBeforeAttempt(input);

  if (activity.activityType === "meaning_in_context") {
    if (input.attempt.responseEvidence.kind !== "choice") return [];
    if (
      input.attempt.evaluation.verdict !== "correct" &&
      input.attempt.evaluation.verdict !== "incorrect"
    ) {
      return [];
    }
    if (deriveCanonicalReadingContext(input.blueprint, activity) === null) {
      return [];
    }

    return [
      learningCapabilityObservationSchema.parse({
        subject: { kind: "activity", key: activity.id },
        targetSkill: "reading",
        support: supportOpened ? "supported" : "independent",
        responseMode: "selection",
        verification: "objective",
        outcome:
          input.attempt.evaluation.verdict === "correct"
            ? "successful"
            : "unsuccessful",
        evidenceKind: "lesson_activity",
        observedAt: input.attempt.submittedAt,
      }),
    ];
  }

  if (activity.activityType === "chunk_recall") {
    if (input.attempt.responseEvidence.kind !== "text") return [];
    if (
      input.attempt.evaluation.verdict !== "correct" &&
      input.attempt.evaluation.verdict !== "incorrect"
    ) {
      return [];
    }

    const target = input.blueprint.targetItems.find(
      (item) => item.id === activity.targetItemId,
    );
    if (!target) return [];

    // `hintVi` is part of the immutable activity. Until runtime evidence can
    // prove it remained hidden, treat its presence conservatively as support.
    const supported = supportOpened || activity.hintVi !== null;

    return [
      learningCapabilityObservationSchema.parse({
        subject: { kind: "language_item", key: target.itemKey },
        targetSkill: "writing",
        support: supported ? "supported" : "independent",
        responseMode: "writing",
        verification: "objective",
        outcome:
          input.attempt.evaluation.verdict === "correct"
            ? "successful"
            : "unsuccessful",
        evidenceKind: "lesson_activity",
        observedAt: input.attempt.submittedAt,
      }),
    ];
  }

  if (activity.activityType === "guided_transfer") {
    if (input.attempt.responseEvidence.kind !== "self_check") return [];
    if (input.attempt.evaluation.verdict !== "self_check") return [];

    return [
      learningCapabilityObservationSchema.parse({
        subject: { kind: "activity", key: activity.id },
        targetSkill: "writing",
        support: supportOpened ? "supported" : "independent",
        responseMode: "writing",
        verification: "self_check",
        outcome: "unscored",
        evidenceKind: "lesson_activity",
        observedAt: input.attempt.submittedAt,
      }),
    ];
  }

  return [];
}
