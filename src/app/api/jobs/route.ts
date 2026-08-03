import { type NextRequest, NextResponse } from "next/server";

import { CreateLessonJob } from "@/modules/generation/application/create-lesson-job";
import { createGenerationRuntime } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createVideoMetadataProvider } from "@/platform/video/create-video-metadata-provider";
import {
  createLessonJobRequestSchema,
  createLessonJobResponseSchema,
} from "@/shared/contracts/generation";
import { authErrors, generationErrors } from "@/shared/errors/product-error";
import { readAuthJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const access = await (await createIdentityService()).resolveCurrentAccess();
    if (!access) throw authErrors.sessionRequired();

    const raw = await readAuthJsonBody(request);
    const parsed = createLessonJobRequestSchema.safeParse(raw);
    if (!parsed.success) throw authErrors.rejected();

    const { repository, dispatcher, policy } = createGenerationRuntime();
    const result = await new CreateLessonJob(
      repository,
      createVideoMetadataProvider(),
      dispatcher,
      policy,
    ).execute(access.userId, parsed.data);
    const payload = createLessonJobResponseSchema.parse(result);

    return NextResponse.json(payload, {
      status: payload.reused ? 200 : 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, generationErrors.createFailed());
  }
}
