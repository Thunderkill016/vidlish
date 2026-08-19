import Link from "next/link";
import { redirect } from "next/navigation";

import { studyCompletionPercent } from "@/modules/study/application/score-study-progress";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
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
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );
  const [lessons, activeJobs, progressSummaries] = await Promise.all([
    lessonRepository.listOwned(access.userId),
    generationRepository.listActiveOwned(access.userId),
    createStudyProgressRepository(lessonRepository).listOwnedSummaries(access.userId),
  ]);
  const progressByJobId = new Map(
    progressSummaries.map((summary) => [summary.jobId, summary]),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--accent)]">Thư viện</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bài học đã lưu</h1>
          <p className="max-w-2xl text-[var(--muted-foreground)]">
            Mở lại đúng bài đang học, theo dõi completion và quay về nguồn gốc khi cần kiểm chứng.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          + Tạo bài mới
        </Link>
      </div>

      {activeJobs.length > 0 ? (
        <section className="space-y-3" aria-labelledby="active-jobs-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="active-jobs-heading" className="text-lg font-bold">Đang tạo</h2>
            <span className="text-sm text-[var(--muted-foreground)]">{activeJobs.length} job</span>
          </div>
          <ul className="grid gap-3 md:grid-cols-2" data-testid="active-jobs">
            {activeJobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="block h-full">
                  <Card className="h-full space-y-2 border-dashed transition-colors hover:border-[var(--accent)]">
                    <p className="text-sm font-semibold text-[var(--accent)]">Đang tạo · {job.cefrLevel}</p>
                    <h3 className="text-lg font-bold">{job.videoTitle}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Bấm để xem tiến trình. Job vẫn chạy khi bạn rời trang.
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lessons.length === 0 && activeJobs.length === 0 ? (
        <Card className="space-y-4 bg-[var(--primary-wash)]">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">Kho học đang trống</p>
            <h2 className="mt-1 text-xl font-bold">Tạo lesson đầu tiên từ một video bạn thật sự quan tâm</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Các bài đã xuất bản và tiến độ Study Mode sẽ xuất hiện tại đây.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex min-h-11 w-fit items-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Tạo bài học đầu tiên
          </Link>
        </Card>
      ) : lessons.length > 0 ? (
        <section className="space-y-4" aria-labelledby="saved-lessons-heading">
          <div className="flex items-end justify-between gap-3">
            <h2 id="saved-lessons-heading" className="text-xl font-bold">Bài đã xuất bản</h2>
            <span className="text-sm text-[var(--muted-foreground)]">{lessons.length} bài</span>
          </div>
          <ul className="grid gap-4 md:grid-cols-2" data-testid="lesson-library">
            {lessons.map((lesson) => {
              const progress = progressByJobId.get(lesson.jobId);
              const percent = progress
                ? studyCompletionPercent(
                    {
                      activityCount: lesson.activityCount,
                      vocabularyCount: lesson.vocabularyCount,
                    },
                    progress,
                  )
                : 0;

              return (
                <li key={lesson.id}>
                  <Link href={`/lessons/${lesson.jobId}`} className="block h-full">
                    <Card className="flex h-full flex-col gap-4 transition-colors hover:border-[var(--accent)]">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--accent)]">
                          {lesson.cefrLevel} · {lesson.vocabularyCount} từ vựng
                        </p>
                        <p className="shrink-0 text-xs text-[var(--muted-foreground)]">
                          {formatDate(lesson.createdAt)}
                        </p>
                      </div>
                      <div className="min-h-0 flex-1">
                        <h3 className="text-lg font-bold">{lesson.titleVi}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                          {lesson.videoTitle} — {lesson.channelName}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--muted-foreground)]">
                          <span>
                            {progress?.completedAt
                              ? "Đã hoàn thành"
                              : percent > 0
                                ? "Đang học"
                                : "Chưa bắt đầu"}
                          </span>
                          <span>{percent}%</span>
                        </div>
                        <div
                          className="h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"
                          role="progressbar"
                          aria-valuenow={percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Tiến độ học ${lesson.titleVi}`}
                        >
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
