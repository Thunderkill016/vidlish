import "server-only";

import { NextResponse } from "next/server";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createGenerateLesson } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";

export const dynamic = "force-dynamic";

const JOB_ID = "c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f";
const OWNER_USER_ID = "0764b1b5-0c98-49aa-9360-8149ce078209";

export async function GET() {
  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const job = await generationRepository.findOwnedById(JOB_ID, OWNER_USER_ID);
  if (!job) {
    return NextResponse.json({ ok: false, reason: "job_missing" }, { status: 404 });
  }

  const transcript = await transcriptRuntime.repository.findCanonicalForJob(
    OWNER_USER_ID,
    JOB_ID,
  );
  if (!transcript) {
    return NextResponse.json(
      { ok: false, reason: "transcript_missing" },
      { status: 409 },
    );
  }

  const generateLesson = createGenerateLesson(
    generationRepository,
    transcriptRuntime.repository,
  );
  const outcome = await generateLesson.execute(job, transcript.normalizedHash);
  const latest = await generationRepository.findOwnedById(JOB_ID, OWNER_USER_ID);

  return NextResponse.json({
    ok: true,
    outcome: outcome.kind,
    status: latest?.status ?? "missing",
  });
}
