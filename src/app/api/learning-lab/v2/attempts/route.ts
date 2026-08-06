import { type NextRequest, NextResponse } from "next/server";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { evaluateLearningActivity } from "@/modules/learning/application/evaluate-learning-activity";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import {
  learningLabAttemptRequestSchema,
  learningLabAttemptResponseSchema,
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

    const parsed = learningLabAttemptRequestSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    const blueprint = createFixtureLearningBlueprint();
    const activity = blueprint.activities.find(
      (candidate) => candidate.id === parsed.data.activityId,
    );
    if (!activity) throw authErrors.rejected();

    const evaluation = evaluateLearningActivity(
      activity,
      parsed.data.response,
    );
    const evidenceIds = new Set(
      evaluation.evidenceRefs.flatMap((reference) =>
        reference.sourceSegmentIds,
      ),
    );
    const hydratedEvidence = blueprint.evidenceCatalog.filter((evidence) =>
      evidenceIds.has(evidence.segmentId),
    );

    const payload = learningLabAttemptResponseSchema.parse({
      activityId: activity.id,
      idempotencyKey: parsed.data.idempotencyKey,
      evaluation,
      hydratedEvidence,
      ...(activity.activityType === "guided_transfer"
        ? { selfCheckCriteriaVi: activity.evaluation.criteriaVi }
        : {}),
    });

    return NextResponse.json(payload, {
      status: 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
