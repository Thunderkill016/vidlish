import { type NextRequest, NextResponse } from "next/server";

import { RecordLearningProductEvent } from "@/modules/learning/application/record-learning-product-event";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import {
  createLearningProductEventRepository,
  createLearningSessionRepository,
} from "@/platform/learning/create-learning-session-repository";
import { resolveSessionBlueprint } from "@/platform/learning/resolve-session-blueprint";
import {
  learningProductEventResponseSchema,
  recordLearningProductEventRequestSchema,
} from "@/shared/contracts/learning-product-events";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = recordLearningProductEventRequestSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    const blueprint = await resolveSessionBlueprint({
      ownerUserId: access.userId,
      sessionId: parsed.data.sessionId,
    });
    if (!blueprint) throw authErrors.rejected();

    const result = await new RecordLearningProductEvent(
      createLearningSessionRepository(),
      createLearningProductEventRepository(),
    ).execute({
      ownerUserId: access.userId,
      blueprint,
      ...parsed.data,
    });

    const payload = learningProductEventResponseSchema.parse(result);
    return NextResponse.json(payload, {
      status: result.created ? 201 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
