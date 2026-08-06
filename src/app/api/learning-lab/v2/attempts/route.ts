import { type NextRequest, NextResponse } from "next/server";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { SubmitLearningActivityAttempt } from "@/modules/learning/application/submit-learning-activity-attempt";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningSessionRepository } from "@/platform/learning/create-learning-session-repository";
import {
  learningLabAttemptRequestSchema,
  learningLabAttemptResponseSchema,
} from "@/shared/contracts/learning-lab";
import { authErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

function chunkBoundaryText(sourceText: string, surfaceForm: string): string | null {
  const sourceLower = sourceText.toLocaleLowerCase("en");
  const targetLower = surfaceForm.toLocaleLowerCase("en");
  const start = sourceLower.indexOf(targetLower);
  if (start < 0) return null;

  const before = sourceText.slice(0, start).trim();
  const target = sourceText.slice(start, start + surfaceForm.length).trim();
  const after = sourceText.slice(start + surfaceForm.length).trim();
  return [before, target, after].filter(Boolean).join(" | ");
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const parsed = learningLabAttemptRequestSchema.safeParse(
      await readAuthJsonBody(request),
    );
    if (!parsed.success) throw authErrors.rejected();

    const blueprint = createGoldenSessionLearningBlueprint();
    const activity = blueprint.activities.find(
      (candidate) => candidate.id === parsed.data.activityId,
    );
    if (!activity) throw authErrors.rejected();

    const persisted = await new SubmitLearningActivityAttempt(
      createLearningSessionRepository(),
    ).execute({
      ownerUserId: access.userId,
      sessionId: parsed.data.sessionId,
      blueprint,
      activityId: parsed.data.activityId,
      idempotencyKey: parsed.data.idempotencyKey,
      response: parsed.data.response,
    });
    const evaluation = persisted.attempt.evaluation;
    const evidenceIds = new Set(
      evaluation.evidenceRefs.flatMap((reference) =>
        reference.sourceSegmentIds,
      ),
    );
    const hydratedEvidence = blueprint.evidenceCatalog.filter((evidence) =>
      evidenceIds.has(evidence.segmentId),
    );

    const targetItemId =
      activity.activityType === "meaning_in_context" ||
      activity.activityType === "chunk_recall"
        ? activity.targetItemId
        : activity.activityType === "guided_transfer"
          ? activity.targetItemIds[0]
          : null;
    const targetItem = targetItemId
      ? blueprint.targetItems.find((item) => item.id === targetItemId) ?? null
      : null;
    const sourceText = hydratedEvidence[0]?.text ?? "";

    const payload = learningLabAttemptResponseSchema.parse({
      activityId: activity.id,
      idempotencyKey: parsed.data.idempotencyKey,
      evaluation,
      persistedAttempt: persisted.attempt,
      session: persisted.session,
      created: persisted.created,
      hydratedEvidence,
      ...(activity.activityType === "guided_transfer"
        ? { selfCheckCriteriaVi: activity.evaluation.criteriaVi }
        : {}),
      postAttemptSupport: {
        targetItem: targetItem
          ? {
              id: targetItem.id,
              itemKey: targetItem.itemKey,
              surfaceForm: targetItem.surfaceForm,
              contextualMeaningVi: targetItem.contextualMeaningVi,
              communicativeFunctionVi: targetItem.communicativeFunctionVi,
              register: targetItem.register,
              pronunciationNoteVi: targetItem.pronunciationNoteVi,
            }
          : null,
        chunkBoundaryText:
          targetItem && sourceText
            ? chunkBoundaryText(sourceText, targetItem.surfaceForm)
            : null,
      },
    });

    return NextResponse.json(payload, {
      status: persisted.created ? 201 : 200,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
