import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";

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
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold text-[var(--accent)]">Thư viện của bạn</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bài học từ những nguồn bạn chọn</h1>
          <p className="max-w-2xl leading-7 text-[var(--muted-foreground)]">
            Đây là nơi giữ những bài học bạn đã tạo từ video. Buổi học A0 hằng ngày vẫn bắt đầu ở Lộ trình.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex min-h-11 w-fit items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <BookOpen aria-hidden="true" size={18} />
          Thêm video
        </Link>
      </header>

      {activeJobs.length > 0 ? (
        <section className="space-y-3" aria-labelledby="active-jobs-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--accent)]">Đang chuẩn bị</p>
              <h2 id="active-jobs-heading" className="mt-1 text-xl font-bold">Bài học mới của bạn</h2>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)]">
              <Clock3 aria-hidden="true" size={16} />
              {activeJobs.length}
            </span>
          </div>
          <ul className="grid gap-3 md:grid-cols-2" data-testid="active-jobs">
            {activeJobs.map((job) => (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="block h-full">
                  <Card className="h-full space-y-2 border-dashed transition-colors hover:border-[var(--accent)]">
                    <p className="text-sm font-semibold text-[var(--accent)]">Đang chuẩn bị · {job.cefrLevel}</p>
                    <h3 className="text-lg font-bold">{job.videoTitle}</h3>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Bạn có thể rời trang và quay lại sau. Nếp sẽ báo khi bài học sẵn sàng.
                    </p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lessons.length === 0 && activeJobs.length === 0 ? (
        <Card className="grid gap-6 border-dashed bg-[var(--primary-wash)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--primary)]">Chưa có bài học từ video</p>
            <h2 className="mt-1 text-2xl font-bold">Buổi học đầu tiên không cần video</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
              Nếu bạn đang bắt đầu từ số 0, hãy nghe câu đầu tiên trước. Khi đã sẵn sàng, bạn vẫn có thể thêm video mình quan tâm ở đây.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/start"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Bắt đầu buổi học đầu tiên
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link
              href="/create"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Thêm video
            </Link>
          </div>
        </Card>
      ) : lessons.length > 0 ? (
        <section className="space-y-4" aria-labelledby="saved-lessons-heading">
          <div className="flex items-end justify-between gap-3">
            <h2 id="saved-lessons-heading" className="text-xl font-bold">Bài học đã lưu</h2>
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
              const status = progress?.completedAt
                ? "Đã học xong"
                : percent > 0
                  ? `Đang học ${percent}%`
                  : "Chưa bắt đầu";

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
                          <span>{status}</span>
                          {percent > 0 && !progress?.completedAt ? null : <span>{percent}%</span>}
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
