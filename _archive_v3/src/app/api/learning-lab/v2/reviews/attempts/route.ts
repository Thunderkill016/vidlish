import { type NextRequest, NextResponse } from "next/server";

import { toLearnerReviewSession } from "@/modules/learning/application/learning-review-view";
import {
  LearningReviewProgressError,
  SubmitLearningReviewAttempt,
} from "@/modules/learning/application/submit-learning-review-attempt";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { resolveLearningReviewPlan } from "@/platform/learning/resolve-review-plan";
import {
  learningReviewAttemptRequestSchema,
  learningReviewAttemptResponseSchema,
} from "@/shared/contracts/learning-review";
import { authErrors, reviewErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = learningReviewAttemptRequestSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    const persisted = await new SubmitLearningReviewAttempt(
      createLearningReviewRepository(),
      // VLR-003. Built from the lesson that taught the item, so every durable
      // reviewable item has a task instead of the one hard-coded fixture.
      (itemKey) => resolveLearningReviewPlan(access.userId, itemKey),
    ).execute({
      ownerUserId: access.userId,
      reviewSessionId: parsed.data.sessionId,
      step: parsed.data.step,
      idempotencyKey: parsed.data.idempotencyKey,
      response: parsed.data.response,
    });

    const plan = await resolveLearningReviewPlan(
      access.userId,
      persisted.session.itemKey,
    );
    if (!plan || plan.variantId !== persisted.session.variantId) {
      throw new LearningReviewProgressError(
        "Persisted review session lost its bounded variant.",
      );
    }

    const payload = learningReviewAttemptResponseSchema.parse({
      session: toLearnerReviewSession(persisted.session),
      evaluation: persisted.attempt.evaluation,
      created: persisted.created,
      postAttempt:
        parsed.data.step === "recall"
          ? {
              step: "recall",
              answerAfterAttempt: plan.recall.answerAfterAttempt,
              correctionVi: plan.recall.correctionVi,
              nextTask:
                persisted.attempt.evaluation.step === "recall" &&
                persisted.attempt.evaluation.verdict === "correct"
                  ? {
                      step: "transfer",
                      scenarioVi: plan.transfer.scenarioVi,
                      promptVi: plan.transfer.promptVi,
                    }
                  : null,
            }
          : {
              step: "transfer",
              criteriaVi: plan.transfer.criteriaVi,
              exemplarAfterAttempt: plan.transfer.exemplarAfterAttempt,
              outcome:
                persisted.session.status === "completed"
                  ? persisted.itemState.lastOutcome
                  : null,
            },
    });

    return NextResponse.json(payload, {
      status: persisted.created ? 201 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, reviewErrors.progressFailed());
  }
}
