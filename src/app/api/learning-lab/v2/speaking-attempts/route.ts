import { type NextRequest, NextResponse } from "next/server";

import { RecordLearningSpeakingAttempt } from "@/modules/learning/application/record-learning-speaking-attempt";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningSpeakingAttemptRepository } from "@/platform/learning/create-learning-speaking-attempt-repository";
import { resolveSessionBlueprint } from "@/platform/learning/resolve-session-blueprint";
import {
  learningSpeakingAttemptResponseSchema,
  recordLearningSpeakingAttemptInputSchema,
} from "@/shared/contracts/learning-speaking";
import { authErrors } from "@/shared/errors/product-error";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

const MAX_MULTIPART_BYTES = 5_500_000;

function formString(form: FormData, key: string): string | null {
  const value = form.get(key);
  return typeof value === "string" ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_MULTIPART_BYTES) {
      throw authErrors.rejected();
    }

    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) throw authErrors.rejected();

    const parsed = recordLearningSpeakingAttemptInputSchema.safeParse({
      ownerUserId: access.userId,
      sessionId: formString(form, "sessionId"),
      activityId: formString(form, "activityId"),
      idempotencyKey: formString(form, "idempotencyKey"),
      durationMs: Number(formString(form, "durationMs")),
      byteCount: audio.size,
      mimeType: audio.type,
      replayed: formString(form, "replayed") === "true",
      confirmedAudibleSpeech:
        formString(form, "confirmedAudibleSpeech") === "true",
    });
    if (!parsed.success) throw authErrors.rejected();

    // Bind the capture to an activity from the immutable lesson actually owned
    // by this session. The DB RPC repeats this check so neither the browser nor
    // the route can turn arbitrary uploaded audio into speaking evidence.
    const blueprint = await resolveSessionBlueprint({
      ownerUserId: access.userId,
      sessionId: parsed.data.sessionId,
    });
    const activity = blueprint?.activities.find(
      (candidate) => candidate.id === parsed.data.activityId,
    );
    if (!activity || activity.activityType !== "guided_transfer") {
      throw authErrors.rejected();
    }

    // `audio` is intentionally never read into application/domain state and is
    // never passed to the repository. Once this request ends, only its bounded
    // receipt metadata remains. No transcription or AI provider is invoked.
    const result = await new RecordLearningSpeakingAttempt(
      createLearningSpeakingAttemptRepository(),
    ).execute(parsed.data);

    return NextResponse.json(
      learningSpeakingAttemptResponseSchema.parse(result),
      {
        status: result.created ? 201 : 200,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    return productErrorResponse(error, authErrors.rejected());
  }
}
