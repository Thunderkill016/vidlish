import Link from "next/link";
import { redirect } from "next/navigation";

import { classifyLearningReviewQueue } from "@/modules/learning/application/classify-learning-review-queue";
import { studyCompletionPercent } from "@/modules/study/application/score-study-progress";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { resolveLearningReviewPlan } from "@/platform/learning/resolve-review-plan";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

function formatReviewTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );
  const [lessons, activeJobs, progressSummaries, scheduledReviews] =
    await Promise.all([
      lessonRepository.listOwned(access.userId),
      generationRepository.listActiveOwned(access.userId),
      createStudyProgressRepository(lessonRepository).listOwnedSummaries(
        access.userId,
      ),
      createLearningReviewRepository().listScheduled(access.userId),
    ]);
  const progressByJobId = new Map(
    progressSummaries.map((summary) => [summary.jobId, summary]),
  );
  const lessonRows = lessons.map((lesson) => {
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
    return { lesson, progress, percent };
  });
  const continueRow =
    lessonRows.find((row) => row.percent > 0 && row.percent < 100) ??
    lessonRows[0];
  const completedCount = progressSummaries.filter(
    (summary) => summary.completedAt,
  ).length;
  const { due: dueReviews, upcoming: upcomingReview } =
    await classifyLearningReviewQueue(
      scheduledReviews,
      async (itemKey) =>
        (await resolveLearningReviewPlan(access.userId, itemKey)) !== null,
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--accent)]">Tổng quan</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Học tiếp từ nơi bạn dừng lại
          </h1>
          <p className="max-w-2xl text-[var(--muted-foreground)]">
            Bắt đầu từ input vừa sức, làm review khi đến hạn và chỉ tăng claim
            khi bạn tạo ra evidence thật. Video là một nguồn học nâng cao, không
            phải cửa vào bắt buộc.
          </p>
        </div>
        <Link
          href="/start"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Học ngay
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        {continueRow ? (
          <Card className="overflow-hidden p-0">
            <div className="border-b border-[var(--border)] bg-[var(--primary-wash)] px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                {continueRow.percent > 0
                  ? "Tiếp tục bài nguồn"
                  : "Bài nguồn gần nhất"}
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                {continueRow.lesson.titleVi}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {continueRow.lesson.videoTitle} — {continueRow.lesson.channelName}
              </p>
            </div>
            <div className="space-y-5 p-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold">Tiến độ phiên học</span>
                  <span className="font-semibold text-[var(--muted-foreground)]">
                    {continueRow.percent}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)]"
                    style={{ width: `${continueRow.percent}%` }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/lessons/${continueRow.lesson.jobId}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  {continueRow.percent > 0 ? "Học tiếp" : "Bắt đầu bài nguồn"}
                </Link>
                <Link
                  href="/library"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                >
                  Mở thư viện
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex min-h-72 flex-col justify-between bg-[var(--primary-wash)]">
            <div>
              <p className="text-sm font-semibold text-[var(--primary)]">
                Bắt đầu từ trình độ hiện tại
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Chưa có bài nguồn — không sao
              </h2>
              <p className="mt-3 max-w-xl text-[var(--muted-foreground)]">
                Nếu tiếng Anh thật còn quá khó, Vidlish bắt đầu bằng input ngắn
                và support tiếng Việt. Khi evidence đủ mạnh, video thật mới trở
                thành nguồn học hợp lý.
              </p>
            </div>
            <Link
              href="/start"
              className="mt-6 inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Bắt đầu học
            </Link>
          </Card>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Card
            className={
              dueReviews.length > 0
                ? "space-y-3 border-[var(--solved)] bg-[var(--solved-wash)]"
                : "space-y-3"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--accent)]">
                  Ôn tập dài hạn
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {dueReviews.length > 0
                    ? `${dueReviews.length} mục đến hạn`
                    : upcomingReview?.nextReviewAt
                      ? "Đã có lịch ôn tiếp theo"
                      : "Chưa có mục được schedule"}
                </h2>
              </div>
              <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-foreground)]">
                V2
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {dueReviews.length > 0
                ? "Queue được tính từ next_review_at thật. Phiên sau kiểm tra recall rồi changed-context transfer."
                : upcomingReview?.nextReviewAt
                  ? `Lượt gần nhất: ${formatReviewTime(upcomingReview.nextReviewAt)}. Scheduler không phải mastery evidence.`
                  : "Source-lesson item sẽ xuất hiện ở đây khi có lịch review. Beginner delayed review chưa được nối vào queue này."}
            </p>
            <Link
              href="/review"
              className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
            >
              {dueReviews.length > 0 ? "Ôn ngay →" : "Xem lịch ôn →"}
            </Link>
          </Card>

          {activeJobs.length > 0 ? (
            <Card className="space-y-3 border-dashed">
              <p className="text-sm font-semibold text-[var(--accent)]">
                Đang tạo nguồn video
              </p>
              <h2 className="text-lg font-bold">{activeJobs[0].videoTitle}</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Job vẫn chạy khi bạn rời trang. Mở lại để xem tiến trình thật.
              </p>
              <Link
                href={`/jobs/${activeJobs[0].id}`}
                className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
              >
                Xem tiến trình →
              </Link>
            </Card>
          ) : (
            <Card className="space-y-3">
              <p className="text-sm font-semibold text-[var(--accent)]">
                Nguồn nâng cao
              </p>
              <h2 className="text-lg font-bold">Có video muốn hiểu kỹ hơn?</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                YouTube vẫn ở đây khi authentic English đã đủ vừa sức. Nó là một
                nguồn input, không phải việc bắt buộc phải làm mỗi ngày.
              </p>
              <Link
                href="/create"
                className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
              >
                Tạo bài từ YouTube →
              </Link>
            </Card>
          )}
        </div>
      </div>

      <section
        className="space-y-4"
        aria-labelledby="learning-snapshot-heading"
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Learning snapshot
            </p>
            <h2
              id="learning-snapshot-heading"
              className="mt-1 text-2xl font-bold"
            >
              Dữ liệu đang có thật
            </h2>
          </div>
          <Link
            href="/progress"
            className="text-sm font-semibold text-[var(--primary)]"
          >
            Xem tiến bộ →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{lessons.length}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Bài nguồn đã lưu
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{completedCount}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Phiên Study Mode đã hoàn tất
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{activeJobs.length}</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Job nguồn đang xử lý
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
