import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import {
  saveStudyProgressRequestSchema,
  studyProgressResponseSchema,
} from "@/shared/contracts/study";
import { authErrors, studyErrors } from "@/shared/errors/product-error";
import { readJsonBody } from "@/shared/http/json-body";
import { productErrorResponse } from "@/shared/http/product-error-response";
import { assertSameOrigin } from "@/shared/http/same-origin";

export const dynamic = "force-dynamic";

/** A full progress payload is a few hundred bytes; 8 KiB is already generous. */
const MAX_PROGRESS_JSON_BYTES = 8 * 1024;

function createRepositories() {
  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );
  return {
    lessonRepository,
    studyRepository: createStudyProgressRepository(lessonRepository),
  };
}

async function resolveOwnedJobId(
  params: Promise<{ jobId: string }>,
): Promise<{ userId: string; jobId: string }> {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) throw authErrors.sessionRequired();

  const { jobId } = await params;
  const parsed = z.string().uuid().safeParse(jobId);
  if (!parsed.success) throw studyErrors.lessonNotFound();

  return { userId: access.userId, jobId: parsed.data };
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { userId, jobId } = await resolveOwnedJobId(context.params);

    const body = saveStudyProgressRequestSchema.safeParse(
      await readJsonBody(request, MAX_PROGRESS_JSON_BYTES),
    );
    if (!body.success) throw authErrors.rejected();

    const { lessonRepository, studyRepository } = createRepositories();
    const lesson = await lessonRepository.findOwnedByJobId(jobId, userId);
    if (!lesson) throw studyErrors.lessonNotFound();

    const progress = await studyRepository.save({
      ownerUserId: userId,
      jobId,
      state: body.data.state,
      completed: body.data.completed,
    });

    return NextResponse.json(studyProgressResponseSchema.parse({ progress }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return productErrorResponse(error, studyErrors.saveFailed());
  }
}
