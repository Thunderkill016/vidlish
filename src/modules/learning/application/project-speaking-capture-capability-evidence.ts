import {
  learningCapabilityObservationSchema,
  type LearningCapabilityObservation,
} from "@/shared/contracts/learning-capability";
import type { LearningSpeakingAttempt } from "@/shared/contracts/learning-speaking";

/**
 * A microphone capture proves that a speaking self-check happened, not that the
 * learner pronounced the language correctly or was intelligible to a listener.
 *
 * Feature 022 deliberately marks this supported: the capture happens after the
 * guided written transfer, where an exemplar/correction may already have been
 * shown. A later verifier can add stronger evidence without rewriting this one.
 */
export function projectSpeakingCaptureCapabilityEvidence(
  attempt: LearningSpeakingAttempt,
): LearningCapabilityObservation {
  return learningCapabilityObservationSchema.parse({
    subject: { kind: "activity", key: attempt.activityId },
    targetSkill: "speaking",
    support: "supported",
    responseMode: "speaking",
    verification: "self_check",
    outcome: "unscored",
    evidenceKind: "speaking_capture",
    observedAt: attempt.createdAt,
  });
}
