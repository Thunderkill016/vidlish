import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { resolveLearnerLessonRoute } from "@/platform/learning/resolve-learner-lesson-route";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { LessonView } from "./_components/lesson-view";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const { jobId: rawJobId } = await params;
  const jobId = z.string().uuid().safeParse(rawJobId);
  if (!jobId.success) notFound();

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );
  const lesson = await lessonRepository.findOwnedByJobId(
    jobId.data,
    access.userId,
  );

  // A job still generating has no lesson yet; send the learner back to the
  // progress page rather than showing an empty shell.
  if (!lesson) redirect(`/jobs/${jobId.data}`);

  // Only the segments the original-English gate permitted reach the listening
  // panel — the same allowlist the Lesson Engine was given, never the raw
  // transcript.
  // The guided session is the lesson now, not an offer beside it. It used to sit
  // behind a banner the learner had to notice and choose; the reference lesson
  // below is the fallback for a video that has no session yet, and is reachable
  // from the session itself.
  const { view } = await searchParams;
  const route = await resolveLearnerLessonRoute({
    ownerUserId: access.userId,
    jobId: jobId.data,
  });
  if (route.kind === "v2" && view !== "reference") {
    redirect(`/lessons/${jobId.data}/session`);
  }

  const [transcript, progress] = await Promise.all([
    lessonRepository.listPermittedSegments(jobId.data, access.userId),
    createStudyProgressRepository(lessonRepository).findOwnedByJobId(
      jobId.data,
      access.userId,
    ),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <LessonView
        lesson={lesson}
        transcript={transcript}
        initialProgress={progress}
      />
    </div>
  );
}
