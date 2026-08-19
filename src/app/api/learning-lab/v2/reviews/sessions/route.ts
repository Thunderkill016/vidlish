import { type NextRequest, NextResponse } from "next/server";

import { resolveFixtureLearningReviewPlan } from "@/adapters/fake/fixture-learning-review-plan";
import {
  LearningReviewUnavailableError,
  StartDueLearningReview,
} from "@/modules/learning/application/start-due-learning-review";
import { toLearnerReviewSession } from "@/modules/learning/application/learning-review-view";
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

    const payload = learningReviewStartResponseSchema.parse({
      session: toLearnerReviewSession(result.session),
      task: {
        step: "recall",
        promptVi: result.plan.recall.promptVi,
      },
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
