import Link from "next/link";
import { redirect } from "next/navigation";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { studyCompletionPercent } from "@/modules/study/application/score-study-progress";
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
    // A job keeps running after the learner navigates away. Without it listed
    // here they lose the only link to it and believe the work was thrown away.
    generationRepository.listActiveOwned(access.userId),
    // What the learner already did in each lesson, so the shelf answers "where
    // was I?" instead of only "what did I make?".
    createStudyProgressRepository(lessonRepository).listOwnedSummaries(
      access.userId,
    ),
  ]);
  const progressByJobId = new Map(
    progressSummaries.map((summary) => [summary.jobId, summary]),
  );

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
                    <div className="flex items-center gap-3 pt-1">
                      <div
                        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--muted)]"
                        role="progressbar"
                        aria-valuenow={percent}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Tiến độ học ${lesson.titleVi}`}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="shrink-0 text-xs font-semibold text-[var(--muted-foreground)]">
                        {progress?.completedAt
                          ? "Đã hoàn thành"
                          : percent > 0
                            ? `Đang học ${percent}%`
                            : "Chưa bắt đầu"}
                      </p>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
