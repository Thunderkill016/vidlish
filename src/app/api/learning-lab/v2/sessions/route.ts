import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningSessionRepository } from "@/platform/learning/create-learning-session-repository";
import { createLessonVersionRepository } from "@/platform/learning/create-learning-authoring-runtime";
import { resolveLearningLabLessonVersionId } from "@/platform/learning/learning-lab-session-config";
import { learningLabSessionResponseSchema } from "@/shared/contracts/learning-lab";
import { authErrors } from "@/shared/errors/product-error";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

const requestSchema = z.object({ jobId: z.string().uuid() }).strict();

/** Returns the job id when the caller sent one, or null for the fixture lab. */
async function readOptionalJobId(request: NextRequest): Promise<string | null> {
  const raw = await request.text();
  if (!raw) return null;
  const parsed = requestSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw authErrors.rejected();
  return parsed.data.jobId;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    // A job id, never a lesson version id. The browser names the lesson it is
    // looking at; the server decides which row that is, so a crafted request
    // cannot open a session against somebody else's content.
    const body = await readOptionalJobId(request);
    const owned = body
      ? await createLessonVersionRepository().findForJob({
          ownerUserId: access.userId,
          jobId: body,
        })
      : null;
    if (body && !owned) throw authErrors.rejected();

    // The fixture lab has no learner lesson behind it and keeps its demo
    // blueprint. Everything else runs on the learner's own.
    const blueprint = owned?.blueprint ?? createGoldenSessionLearningBlueprint();
    const firstActivity = blueprint.activities[0];
    if (!firstActivity) throw authErrors.rejected();

    const result = await createLearningSessionRepository().start({
      ownerUserId: access.userId,
      lessonVersionId: owned?.lessonVersionId ?? resolveLearningLabLessonVersionId(),
      // The real blueprint's first activity, not the fixture's. Starting a
      // session on an activity id the lesson does not contain is refused by the
      // database, and rightly.
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
