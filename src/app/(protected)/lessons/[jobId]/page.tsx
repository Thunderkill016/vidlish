import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonVersionRepository } from "@/platform/learning/create-learning-authoring-runtime";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
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
  const [transcript, progress, publishedV2] = await Promise.all([
    lessonRepository.listPermittedSegments(jobId.data, access.userId),
    createStudyProgressRepository(lessonRepository).findOwnedByJobId(
      jobId.data,
      access.userId,
    ),
    createLessonVersionRepository().findForJob({
      ownerUserId: access.userId,
      jobId: jobId.data,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      {publishedV2 ? (
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--primary-wash)] p-5">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Buổi học có hướng dẫn
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Video này đã có một buổi học từng bước: nghe lấy ý chính, chú ý
            ngôn ngữ, tự nhớ lại, rồi dùng lại trong tình huống khác.
          </p>
          <a
            className="mt-3 inline-block rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)]"
            href={`/lessons/${jobId.data}/session`}
          >
            Bắt đầu buổi học
          </a>
        </div>
      ) : null}
      <LessonView
        lesson={lesson}
        transcript={transcript}
        initialProgress={progress}
      />
    </div>
  );
}
