import {
  learningCapabilityObservationSchema,
  type LearningCapabilityObservation,
} from "@/shared/contracts/learning-capability";
import type { PrivacySafeLearningReviewAttempt } from "@/shared/contracts/learning-review";

/**
 * Project a durable delayed-review attempt into four-skill evidence.
 *
 * Review recall is a typed production from a meaning-only prompt, so it is
 * objective writing evidence. The first recall attempt is independent. Every
 * later recall is conservatively supported because the server reveals the
 * answer after the preceding attempt.
 *
 * Transfer is also written production, but it is learner self-check and happens
 * after the recall answer has been revealed. Keep it unscored + supported; it
 * can document changed-context practice without masquerading as verified
 * transfer or independent writing success.
 */
export function projectLearningReviewCapabilityEvidence(input: {
  itemKey: string;
  attempt: PrivacySafeLearningReviewAttempt;
}): LearningCapabilityObservation[] {
  const { attempt } = input;

  if (attempt.step === "recall") {
    if (attempt.responseEvidence.kind !== "text") return [];
    if (attempt.evaluation.step !== "recall") return [];

    return [
      learningCapabilityObservationSchema.parse({
        subject: { kind: "language_item", key: input.itemKey },
        targetSkill: "writing",
        support: attempt.attemptNumber === 1 ? "independent" : "supported",
        responseMode: "writing",
        verification: "objective",
        outcome:
          attempt.evaluation.verdict === "correct"
            ? "successful"
            : "unsuccessful",
        evidenceKind: "learning_review",
        observedAt: attempt.submittedAt,
      }),
    ];
  }

  if (attempt.step === "transfer") {
    if (attempt.responseEvidence.kind !== "self_check") return [];
    if (attempt.evaluation.step !== "transfer") return [];

    return [
      learningCapabilityObservationSchema.parse({
        subject: { kind: "language_item", key: input.itemKey },
        targetSkill: "writing",
        support: "supported",
        responseMode: "writing",
        verification: "self_check",
        outcome: "unscored",
        evidenceKind: "learning_review",
        observedAt: attempt.submittedAt,
      }),
    ];
  }

  return [];
}
