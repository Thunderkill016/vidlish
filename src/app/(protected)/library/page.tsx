import Link from "next/link";
import { redirect } from "next/navigation";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function LibraryPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const [lessons, activeJobs] = await Promise.all([
    createLessonRepository(
      generationRepository,
      transcriptRuntime.repository,
    ).listOwned(access.userId),
    // A job keeps running after the learner navigates away. Without it listed
    // here they lose the only link to it and believe the work was thrown away.
    generationRepository.listActiveOwned(access.userId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Thư viện</p>
        <h1 className="text-3xl font-bold tracking-tight">Bài học đã lưu</h1>
      </div>

      {activeJobs.length > 0 ? (
        <ul className="space-y-3" data-testid="active-jobs">
          {activeJobs.map((job) => (
            <li key={job.id}>
              <Link href={`/jobs/${job.id}`} className="block">
                <Card className="space-y-1 border-dashed transition-colors hover:border-[var(--accent)]">
                  <p className="text-sm font-semibold text-[var(--accent)]">
                    Đang tạo · {job.cefrLevel}
                  </p>
                  <h2 className="text-lg font-semibold">{job.videoTitle}</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Bấm để xem tiến trình. Bài học vẫn đang được soạn.
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {lessons.length === 0 && activeJobs.length === 0 ? (
        <Card className="space-y-3">
          <p className="text-[var(--muted-foreground)]">
            Chưa có bài học nào. Các bài đã tạo sẽ xuất hiện tại đây.
          </p>
          <Link
            href="/create"
            className="inline-block text-sm font-semibold text-[var(--accent)] underline"
          >
            Tạo bài học đầu tiên
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3" data-testid="lesson-library">
          {lessons.map((lesson) => (
            <li key={lesson.id}>
              <Link href={`/lessons/${lesson.jobId}`} className="block">
                <Card className="space-y-2 transition-colors hover:border-[var(--accent)]">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--accent)]">
                      {lesson.cefrLevel} · {lesson.vocabularyCount} từ vựng
                    </p>
                    <p className="shrink-0 text-xs text-[var(--muted-foreground)]">
                      {formatDate(lesson.createdAt)}
                    </p>
                  </div>
                  <h2 className="text-lg font-semibold">{lesson.titleVi}</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {lesson.videoTitle} — {lesson.channelName}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
