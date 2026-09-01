import {
  learningCapabilityObservationSchema,
  type LearningCapabilityObservation,
} from "@/shared/contracts/learning-capability";
import type { LearningSpeakingAttempt } from "@/shared/contracts/learning-speaking";

/**
 * A microphone capture proves that a speaking self-check happened, not that the
 * learner pronounced the language correctly or was intelligible to a listener.
 *
 * Feature 024 persists the support strength chosen by the authoritative DB RPC.
 * A first capture at least 24 hours after lesson completion may therefore be an
 * independent self-check; immediate captures and retries remain supported.
 */
export function projectSpeakingCaptureCapabilityEvidence(
  attempt: LearningSpeakingAttempt,
): LearningCapabilityObservation {
  return learningCapabilityObservationSchema.parse({
    subject: { kind: "activity", key: attempt.activityId },
    targetSkill: "speaking",
    support: attempt.support,
    responseMode: "speaking",
    verification: "self_check",
    outcome: "unscored",
    evidenceKind: "speaking_capture",
    observedAt: attempt.createdAt,
  });
}
