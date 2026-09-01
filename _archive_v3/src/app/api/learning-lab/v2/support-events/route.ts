import { type NextRequest, NextResponse } from "next/server";

import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { RecordLearningSupportEvidence } from "@/modules/learning/application/record-learning-support-evidence";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningSessionRepository } from "@/platform/learning/create-learning-session-repository";
import { resolveSessionBlueprint } from "@/platform/learning/resolve-session-blueprint";
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

    // VLR-002. The support boundary — how much help a learner may open before
    // an answer is revealed — has to be decided by the policy of the lesson
    // they are in. Deciding it from a fixture meant the boundary was right only
    // when the two happened to agree.
    const blueprint = await resolveSessionBlueprint({
      ownerUserId: access.userId,
      sessionId: parsed.data.sessionId,
    });
    if (!blueprint) throw authErrors.rejected();

    const result = await new RecordLearningSupportEvidence(
      createLearningSessionRepository(),
    ).execute({
      ownerUserId: access.userId,
      blueprint,
      policy: deriveLearningRuntimePolicy(blueprint),
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
