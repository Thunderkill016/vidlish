import { type NextRequest, NextResponse } from "next/server";

import { resolveFixtureLearningReviewPlan } from "@/adapters/fake/fixture-learning-review-plan";
import { toLearnerReviewSession } from "@/modules/learning/application/learning-review-view";
import {
  LearningReviewUnavailableError,
  StartDueLearningReview,
} from "@/modules/learning/application/start-due-learning-review";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { learningReviewStartResponseSchema } from "@/shared/contracts/learning-review";
import { authErrors, reviewErrors } from "@/shared/errors/product-error";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const result = await new StartDueLearningReview(
      createLearningReviewRepository(),
      resolveFixtureLearningReviewPlan,
    ).execute({ ownerUserId: access.userId });

    if (result.session.currentStep === "completed") {
      throw new LearningReviewUnavailableError(
        "The active delayed review session is already completed.",
      );
    }

    const task =
      result.session.currentStep === "recall"
        ? {
            step: "recall" as const,
            promptVi: result.plan.recall.promptVi,
          }
        : {
            step: "transfer" as const,
            scenarioVi: result.plan.transfer.scenarioVi,
            promptVi: result.plan.transfer.promptVi,
          };

    const payload = learningReviewStartResponseSchema.parse({
      session: toLearnerReviewSession(result.session),
      task,
    });

    return NextResponse.json(payload, {
      status: result.created ? 201 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof LearningReviewUnavailableError) {
      return productErrorResponse(reviewErrors.notDue());
    }
    return productErrorResponse(error, reviewErrors.progressFailed());
  }
}
