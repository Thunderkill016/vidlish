import "server-only";

import { NextResponse } from "next/server";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import {
  createGenerateLesson,
  createLessonRepository,
} from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";

export const dynamic = "force-dynamic";

const JOB_ID = "c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f";
const OWNER_USER_ID = "0764b1b5-0c98-49aa-9360-8149ce078209";

export async function GET() {
  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );

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
  const startedAt = Date.now();

  try {
    const outcome = await createGenerateLesson(
      generationRepository,
      transcriptRuntime.repository,
    ).execute(job, transcript.normalizedHash);
    const latest = await generationRepository.findOwnedById(
      JOB_ID,
      OWNER_USER_ID,
    );

    return NextResponse.json({
      ok: true,
      permittedSegments: permitted.length,
      outcome: outcome.kind,
      status: latest?.status ?? "missing",
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        permittedSegments: permitted.length,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage:
          error instanceof Error ? error.message.slice(0, 300) : "unknown error",
        elapsedMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
