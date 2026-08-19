import { redirect } from "next/navigation";

import { studyCompletionPercent } from "@/modules/study/application/score-study-progress";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

const EVIDENCE_DIMENSIONS = [
  ["Comprehension", "Hiểu nội dung ở lần nghe/đọc hiện tại"],
  ["Productive recall", "Tự gọi lại ngôn ngữ mà không nhìn answer key"],
  ["Interactional use", "Dùng ngôn ngữ để giải quyết một tình huống giao tiếp"],
  ["Delayed transfer", "Làm lại được sau thời gian với input hoặc context khác"],
] as const;

export default async function ProgressPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );
  const [lessons, progressSummaries] = await Promise.all([
    lessonRepository.listOwned(access.userId),
    createStudyProgressRepository(lessonRepository).listOwnedSummaries(access.userId),
  ]);
  const progressByJobId = new Map(
    progressSummaries.map((summary) => [summary.jobId, summary]),
  );
  const percentages = lessons.map((lesson) => {
    const progress = progressByJobId.get(lesson.jobId);
    return progress
      ? studyCompletionPercent(
          {
            activityCount: lesson.activityCount,
            vocabularyCount: lesson.vocabularyCount,
          },
          progress,
        )
      : 0;
  });
  const averageCompletion = percentages.length
    ? Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length)
    : 0;
  const completedLessons = progressSummaries.filter((summary) => summary.completedAt).length;
  const startedLessons = percentages.filter((value) => value > 0).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Tiến bộ</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Đo evidence, không cộng XP cho đẹp</h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Study Mode hiện cung cấp completion/progress thật. Các claim năng lực dài hạn bên dưới chỉ được mở khi Learning Model v2 có delayed evidence.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{startedLessons}</p>
          <p className="text-sm text-[var(--muted-foreground)]">Bài đã bắt đầu học</p>
        </Card>
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{completedLessons}</p>
          <p className="text-sm text-[var(--muted-foreground)]">Bài Study Mode đã hoàn tất</p>
        </Card>
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{averageCompletion}%</p>
          <p className="text-sm text-[var(--muted-foreground)]">Completion trung bình của thư viện</p>
        </Card>
      </div>

      <section className="space-y-4" aria-labelledby="evidence-heading">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Capability evidence</p>
          <h2 id="evidence-heading" className="mt-1 text-2xl font-bold">Bốn lớp bằng chứng</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {EVIDENCE_DIMENSIONS.map(([title, description], index) => (
            <Card key={title} className="flex items-start gap-4 p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--muted)] text-sm font-bold text-[var(--muted-foreground)]">
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{title}</h3>
                  <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]">
                    Đang thu thập
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--evidence)]">Nguồn sự thật</p>
          <h2 className="mt-1 text-xl font-bold">Mỗi claim phải quay về được evidence</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Vidlish tách việc “đã làm xong activity” khỏi “đã dùng được sau một khoảng thời gian”. Khi delayed review được nối, trang này mới nên hiển thị xu hướng support giảm, successful retrieval và transfer theo thời gian.
        </p>
      </Card>
    </div>
  );
}
