import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { LessonView } from "./_components/lesson-view";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const { jobId: rawJobId } = await params;
  const jobId = z.string().uuid().safeParse(rawJobId);
  if (!jobId.success) notFound();

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lesson = await createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  ).findOwnedByJobId(jobId.data, access.userId);

  // A job still generating has no lesson yet; send the learner back to the
  // progress page rather than showing an empty shell.
  if (!lesson) redirect(`/jobs/${jobId.data}`);

  return (
    <div className="mx-auto max-w-[760px]">
      <LessonView lesson={lesson} />
    </div>
  );
}
