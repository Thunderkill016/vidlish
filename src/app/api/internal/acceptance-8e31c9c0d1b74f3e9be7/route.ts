import "server-only";

import { NextResponse } from "next/server";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import {
  generateLessonStep,
  resolveLessonFailureStep,
} from "@/workflows/generate-lesson.steps";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const JOB_ID = "c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f";
const OWNER_USER_ID = "0764b1b5-0c98-49aa-9360-8149ce078209";

export async function GET() {
  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );

  const existing = await lessonRepository.findOwnedByJobId(JOB_ID, OWNER_USER_ID);
  if (existing) {
    return NextResponse.json({
      ok: true,
      outcome: "already_published",
      status: "completed",
    });
  }

  const job = await generationRepository.findOwnedById(JOB_ID, OWNER_USER_ID);
  const transcript = await transcriptRuntime.repository.findCanonicalForJob(
    OWNER_USER_ID,
    JOB_ID,
  );
  if (!job || !transcript) {
    return NextResponse.json(
      { ok: false, reason: !job ? "job_missing" : "transcript_missing" },
      { status: 404 },
    );
  }

  const permitted = await lessonRepository.listPermittedSegments(
    JOB_ID,
    OWNER_USER_ID,
  );

  if (job.status === "failed") {
    await generationRepository.updateStatus(
      JOB_ID,
      "analyzing_video",
      "analyzing_video",
      null,
    );
  }

  const startedAt = Date.now();
  try {
    const outcome = await generateLessonStep({
      jobId: JOB_ID,
      ownerUserId: OWNER_USER_ID,
    });

    if (outcome.kind === "no_permitted_segments") {
      await resolveLessonFailureStep({
        jobId: JOB_ID,
        ownerUserId: OWNER_USER_ID,
      });
    }

    const latest = await generationRepository.findOwnedById(
      JOB_ID,
      OWNER_USER_ID,
    );

    return NextResponse.json({
      ok: outcome.kind === "published" || outcome.kind === "already_published",
      permittedSegments: permitted.length,
      outcome: outcome.kind,
      status: latest?.status ?? "missing",
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    await resolveLessonFailureStep({
      jobId: JOB_ID,
      ownerUserId: OWNER_USER_ID,
    });

    return NextResponse.json(
      {
        ok: false,
        permittedSegments: permitted.length,
        errorName: error instanceof Error ? error.name : "UnknownError",
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
