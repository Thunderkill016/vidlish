import type { LearningReviewPlanResolver } from "@/modules/learning/application/learning-review-plan";
import type { LearningReviewRepository } from "@/modules/learning/ports/learning-review-repository";
import type { ActivityResponse } from "@/shared/contracts/lesson-v2";
import type {
  LearningReviewAttemptEvaluation,
  LearningReviewOutcome,
} from "@/shared/contracts/learning-review";
import { createPrivacySafeActivityResponse } from "@/shared/contracts/privacy-safe-learning-evidence";

export class LearningReviewProgressError extends Error {
  readonly name = "LearningReviewProgressError";
}

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[“”\"'`’.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export class SubmitLearningReviewAttempt {
  constructor(
    private readonly repository: LearningReviewRepository,
    private readonly resolvePlan: LearningReviewPlanResolver,
  ) {}

  async execute(input: {
    ownerUserId: string;
    reviewSessionId: string;
    step: "recall" | "transfer";
    idempotencyKey: string;
    response: ActivityResponse;
  }) {
    const session = await this.repository.findOwnedReviewSession(
      input.reviewSessionId,
      input.ownerUserId,
    );
    if (!session) {
      throw new LearningReviewProgressError("Learning review session was not found.");
    }

    const plan = this.resolvePlan(session.itemKey);
    if (!plan || plan.variantId !== session.variantId) {
      throw new LearningReviewProgressError(
        "Review session does not match a bounded review variant.",
      );
    }

    let evaluation: LearningReviewAttemptEvaluation;
    let advance = false;
    let complete = false;
    let outcome: LearningReviewOutcome | null = null;

    if (input.step === "recall") {
      if (input.response.kind !== "text") {
        throw new LearningReviewProgressError(
          "Delayed recall requires a text response.",
        );
      }
      const normalized = normalizeAnswer(input.response.text);
      const correct = plan.recall.accepted.some(
        (accepted) => normalizeAnswer(accepted) === normalized,
      );
      evaluation = {
        step: "recall",
        verdict: correct ? "correct" : "incorrect",
      };
      advance = correct;
    } else {
      if (input.response.kind !== "self_check") {
        throw new LearningReviewProgressError(
          "Delayed transfer requires a self-check response.",
        );
      }
      const requiredCriteria = plan.transfer.criteriaVi.length;
      const checkedCriteria = [...new Set(input.response.checkedCriteria)];
      if (
        checkedCriteria.some(
          (criterion) => criterion < 0 || criterion >= requiredCriteria,
        )
      ) {
        throw new LearningReviewProgressError(
          "Review response refers to an unknown transfer criterion.",
        );
      }
      const confirmed =
        checkedCriteria.length === requiredCriteria && requiredCriteria > 0;
      evaluation = {
        step: "transfer",
        verdict: "self_check",
        checkedCriteria,
        requiredCriteria,
        confirmed,
      };
      complete = confirmed;
      if (confirmed) {
        const recallAttempts = await this.repository.countReviewAttempts(
          session.id,
          "recall",
          input.ownerUserId,
        );
        if (recallAttempts < 1) {
          throw new LearningReviewProgressError(
            "Delayed transfer cannot complete before a recall attempt.",
          );
        }
        outcome = recallAttempts === 1 ? "good" : "hard";
      }
    }

    return this.repository.recordReviewAttempt({
      ownerUserId: input.ownerUserId,
      reviewSessionId: session.id,
      step: input.step,
      idempotencyKey: input.idempotencyKey,
      responseEvidence: createPrivacySafeActivityResponse(input.response),
      evaluation,
      advance,
      complete,
      outcome,
    });
  }
}
