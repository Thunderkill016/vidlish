import Link from "next/link";
import { redirect } from "next/navigation";

import { classifyLearningReviewQueue } from "@/modules/learning/application/classify-learning-review-queue";
import { studyCompletionPercent } from "@/modules/study/application/score-study-progress";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import {
  panelValue,
  readPanel,
  unavailablePanels,
} from "@/platform/reliability/read-panel";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { createLearningSpeakingReviewQueueReader } from "@/platform/learning/create-learning-speaking-review-queue-reader";
import { resolveLearningReviewPlan } from "@/platform/learning/resolve-review-plan";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { resolveTodaysAction } from "@/platform/learning/resolve-todays-action";
import { Card } from "@/shared/ui/card";

import { TodaysAction } from "./_components/todays-action";

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

  // Six independent reads. They used to share one Promise.all, so a single
  // missing table returned 500 for the whole page and the learner could not get
  // in at all — which is exactly what happened when the speaking-attempts table
  // had never been migrated to production. Each read now fails on its own and
  // says so, both in the logs and on the page.
  const [
    lessonsRead,
    activeJobsRead,
    progressRead,
    scheduledRead,
    knownWordsRead,
    speakingRead,
    todaysActionRead,
  ] = await Promise.all([
    readPanel("thư viện bài học", () => lessonRepository.listOwned(access.userId)),
    readPanel("bài đang tạo", () =>
      generationRepository.listActiveOwned(access.userId),
    ),
    readPanel("tiến độ bài học", () =>
      createStudyProgressRepository(lessonRepository).listOwnedSummaries(
        access.userId,
      ),
    ),
    readPanel("lịch ôn", () =>
      createLearningReviewRepository().listScheduled(access.userId),
    ),
    readPanel("từ nền", async () =>
(await createBeginnerProgressRepository()).knownWords(access.userId),
    ),
    readPanel("hàng chờ luyện nói", () =>
      createLearningSpeakingReviewQueueReader().read(access.userId),
    ),
    // One question drives the page. Everything below it is detail on the answer.
    readPanel("việc hôm nay", () => resolveTodaysAction(access.userId)),
  ]);

  const lessons = panelValue(lessonsRead, []);
  const activeJobs = panelValue(activeJobsRead, []);
  const progressSummaries = panelValue(progressRead, []);
  const scheduledReviews = panelValue(scheduledRead, []);
  const knownWords = panelValue(knownWordsRead, []);
  const speakingQueue = panelValue(speakingRead, { due: [], upcoming: null });
  // Deliberately not defaulted to "rest". Falling back to "nothing due today"
  // would answer the page's only question with a guess, and the learner would
  // read it as "you are done" on a day the product simply could not tell.
  const todaysAction =
    todaysActionRead.kind === "ready" ? todaysActionRead.value : null;

  const broken = unavailablePanels([
    lessonsRead,
    activeJobsRead,
    progressRead,
    scheduledRead,
    knownWordsRead,
    speakingRead,
    todaysActionRead,
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
  const nextSpeaking = speakingQueue.due[0] ?? null;
  const dueToday = dueReviews.length + speakingQueue.due.length;
  const nextDueAt = [
    upcomingReview?.nextReviewAt,
    speakingQueue.upcoming?.dueAt,
  ]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(left).getTime() - new Date(right).getTime())[0] ?? null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--accent)]">Hôm nay</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Một bước tiếng Anh vừa sức hôm nay
          </h1>
          <p className="max-w-2xl text-[var(--muted-foreground)]">
            Một việc mỗi lần, chọn theo bằng chứng bạn để lại — không phải theo
            thứ bạn thấy dễ nhất.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          + Tạo bài từ video
        </Link>
      </div>

      {broken.length > 0 ? (
        <Card
          className="border-[var(--danger,#9a4a2f)] bg-[var(--danger-wash,#f8ebe5)]"
          data-testid="dashboard-degraded"
        >
          <p className="text-sm font-semibold">
            {broken.length} phần của trang này đang không đọc được.
          </p>
          <p className="mt-1 text-sm">
            Phần còn lại vẫn dùng bình thường. Những phần lỗi:{" "}
            {broken.map((panel) => panel.panel).join(", ")}. Sản phẩm không giấu
            lỗi và cũng không lấy nó làm lý do để chặn bạn học.
          </p>
        </Card>
      ) : null}

      {todaysAction ? (
        <TodaysAction action={todaysAction} />
      ) : (
        <Card className="flex flex-col gap-2" data-testid="todays-action-unavailable">
          <p className="text-sm font-semibold">
            Chưa xác định được việc hôm nay.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Không phải là hôm nay bạn không có gì để làm — là sản phẩm chưa đọc
            được tiến độ của bạn để quyết định. Nói &ldquo;nghỉ đi&rdquo; lúc này
            sẽ là nói dối.
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
        {continueRow ? (
          <Card className="overflow-hidden p-0">
            <div className="border-b border-[var(--border)] bg-[var(--primary-wash)] px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                {continueRow.percent > 0 ? "Học tiếp" : "Bài học gần nhất"}
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
                  <span className="font-semibold">Tiến độ bài này</span>
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
                  {continueRow.percent > 0 ? "Học tiếp" : "Bắt đầu bài học"}
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
                Học từ nội dung bạn thật sự muốn hiểu
              </p>
              <h2 className="mt-2 text-2xl font-bold">Chưa có bài từ video</h2>
              <p className="mt-3 max-w-xl text-[var(--muted-foreground)]">
                Dán một video tiếng Anh để tạo một bài ngắn gồm nghe, hiểu, nhớ và dùng lại. Nếu chưa muốn chọn video, bắt đầu ngay từ phần Từ nền bên cạnh.
              </p>
            </div>
            <Link
              href="/create"
              className="mt-6 inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Tạo bài học đầu tiên
            </Link>
          </Card>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="space-y-3">
            <p className="text-sm font-semibold text-[var(--accent)]">Từ nền</p>
            <h2 className="text-xl font-bold">
              {knownWords.length === 0
                ? "Bắt đầu từ số 0"
                : `${knownWords.length} từ đã tự gọi lại được`}
            </h2>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {knownWords.length === 0
                ? "Bắt đầu bằng câu ngắn, mỗi lượt chỉ thêm một từ mới để không phải đoán mò."
                : "Tiếp tục mở rộng vốn từ bằng những câu mà phần lớn nội dung đã quen thuộc."}
            </p>
            <Link
              href="/start"
              className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
            >
              {knownWords.length === 0 ? "Bắt đầu học →" : "Học tiếp từ nền →"}
            </Link>
          </Card>

          <Card
            className={
              dueToday > 0
                ? "space-y-3 border-[var(--solved)] bg-[var(--solved-wash)]"
                : "space-y-3"
            }
          >
            <p className="text-sm font-semibold text-[var(--accent)]">Ôn hôm nay</p>
            <h2 className="text-xl font-bold">
              {dueToday > 0
                ? `${dueToday} lượt đã đến lúc làm`
                : nextDueAt
                  ? "Chưa có lượt nào đến hạn"
                  : "Chưa có lịch ôn"}
            </h2>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {dueToday > 0
                ? "Làm lượt đã đến hạn trước khi học thêm để kiểm tra xem bạn còn tự nhớ và tự dùng được không."
                : nextDueAt
                  ? `Lượt gần nhất mở vào ${formatReviewTime(nextDueAt)}.`
                  : "Sau khi hoàn tất bài có nội dung cần nhớ, Vidlish sẽ đưa lượt ôn vào đây."}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {nextSpeaking ? (
                <Link
                  href={`/learning-lab/v2/speaking?session=${nextSpeaking.sessionId}`}
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
                >
                  Nói lại ngay →
                </Link>
              ) : null}
              {dueReviews.length > 0 ? (
                <Link
                  href="/learning-lab/v2/review"
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
                >
                  Ôn từ/cụm ngay →
                </Link>
              ) : null}
              {dueToday === 0 ? (
                <Link
                  href="/review"
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
                >
                  Xem lịch ôn →
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      </div>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Việc tiếp theo">
        {activeJobs.length > 0 ? (
          <Card className="space-y-3 border-dashed">
            <p className="text-sm font-semibold text-[var(--accent)]">Đang tạo bài</p>
            <h2 className="text-lg font-bold">{activeJobs[0].videoTitle}</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Bài vẫn được xử lý khi bạn rời trang. Mở lại để xem tiến trình.
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
            <p className="text-sm font-semibold text-[var(--accent)]">Nguồn mới</p>
            <h2 className="text-lg font-bold">Có video muốn hiểu kỹ hơn?</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Chọn một đoạn ngắn bạn thật sự quan tâm thay vì cố học hết một video dài.
            </p>
            <Link
              href="/create"
              className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
            >
              Dán URL YouTube →
            </Link>
          </Card>
        )}

        {/* The mobile bottom bar is a five-column grid and full, so this is how
            Luyện tai reaches a learner on a phone. A page nobody can find has
            not shipped, whatever the test suite says about it. */}
        <Card className="space-y-3" data-testid="listen-entry">
          <p className="text-sm font-semibold text-[var(--accent)]">Luyện tai</p>
          <h2 className="text-lg font-bold">Nghe ra những âm tiếng Việt không có</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Có những âm tiếng Anh tai bạn chưa tách ra được, không phải vì nghe
            kém mà vì tiếng Việt không dùng đến chúng. Mỗi lượt vài phút.
          </p>
          <Link
            href="/listen"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
          >
            Luyện nghe phân biệt âm →
          </Link>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm font-semibold text-[var(--accent)]">Thư viện</p>
          <h2 className="text-lg font-bold">Quay lại bài cũ bất cứ lúc nào</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Mở các bài đã tạo để học tiếp hoặc xem lại nội dung đã lưu.
          </p>
          <Link
            href="/library"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
          >
            Mở thư viện →
          </Link>
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="learning-snapshot-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">Tiến độ</p>
            <h2 id="learning-snapshot-heading" className="mt-1 text-2xl font-bold">
              Những gì đã tích lũy
            </h2>
          </div>
          <Link href="/progress" className="text-sm font-semibold text-[var(--primary)]">
            Xem chi tiết →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{knownWords.length}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Từ nền đã gọi lại được</p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{lessons.length}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Bài từ video đã lưu</p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{completedCount}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Bài học đã hoàn tất</p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{dueToday}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Lượt ôn đang đến hạn</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
