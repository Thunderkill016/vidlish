import { type NextRequest, NextResponse } from "next/server";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createFixtureLearningRuntimePolicy } from "@/adapters/fake/fixture-learning-runtime-policy";
import { RecordLearningSupportEvidence } from "@/modules/learning/application/record-learning-support-evidence";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningSessionRepository } from "@/platform/learning/create-learning-session-repository";
import {
  learningLabSupportEventRequestSchema,
  learningLabSupportEventResponseSchema,
} from "@/shared/contracts/learning-lab";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = learningLabSupportEventRequestSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    const result = await new RecordLearningSupportEvidence(
      createLearningSessionRepository(),
    ).execute({
      ownerUserId: access.userId,
      blueprint: createGoldenSessionLearningBlueprint(),
      policy: createFixtureLearningRuntimePolicy(),
      ...parsed.data,
    });

    const payload = learningLabSupportEventResponseSchema.parse(result);
    return NextResponse.json(payload, {
      status: result.created ? 201 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
