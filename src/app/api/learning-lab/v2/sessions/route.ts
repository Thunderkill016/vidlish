import { type NextRequest, NextResponse } from "next/server";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningSessionRepository } from "@/platform/learning/create-learning-session-repository";
import { resolveLearningLabLessonVersionId } from "@/platform/learning/learning-lab-session-config";
import { learningLabSessionResponseSchema } from "@/shared/contracts/learning-lab";
import { authErrors } from "@/shared/errors/product-error";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const blueprint = createGoldenSessionLearningBlueprint();
    const firstActivity = blueprint.activities[0];
    if (!firstActivity) throw authErrors.rejected();

    const result = await createLearningSessionRepository().start({
      ownerUserId: access.userId,
      lessonVersionId: resolveLearningLabLessonVersionId(),
      initialPhase: firstActivity.phase,
      initialActivityId: firstActivity.id,
    });

    return NextResponse.json(learningLabSessionResponseSchema.parse(result), {
      status: result.created ? 201 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
