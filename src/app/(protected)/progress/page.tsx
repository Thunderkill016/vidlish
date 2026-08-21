import { redirect } from "next/navigation";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { summariseCapabilityEvidence } from "@/modules/learning/application/summarise-capability-evidence";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
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
  const [scheduledItems, progressSummaries] = await Promise.all([
    createLearningReviewRepository().listScheduled(access.userId),
    createStudyProgressRepository(lessonRepository).listOwnedSummaries(access.userId),
  ]);
  const capability = summariseCapabilityEvidence(scheduledItems);

  // Average completion and started-lesson counts are gone from the page. Both
  // measure attendance, and this page's own headline rejects that; keeping them
  // computed but unshown would be dead work.
  const completedLessons = progressSummaries.filter((summary) => summary.completedAt).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Tiến bộ</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Đo evidence, không cộng XP cho đẹp</h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Con số bên dưới đếm thứ bạn đã TẠO RA, không phải số bài đã xem. Không
          có mốc nào ở đây nói bạn đã thành thạo — nhớ lại được hôm nay và nhớ
          được sau nhiều tuần là hai chuyện khác nhau.
        </p>
      </div>

      {/*
        What the learner has produced, not how many lessons they sat through.
        `last_independent_at` was recorded on every item and shown to nobody,
        while this page counted lesson completions — the "XP for looks" its own
        headline rejects.
      */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{capability.independent.length}</p>
          <p className="text-sm font-semibold">Tự nói ra được, không cần trợ giúp</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Bạn đã tạo ra đúng cụm này ít nhất một lần khi không mở mức hỗ trợ
            nào. Đây là bằng chứng gần nhất với dùng độc lập.
          </p>
        </Card>
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{capability.supported.length}</p>
          <p className="text-sm font-semibold">Nói ra được khi có trợ giúp</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Đúng, nhưng có mức hỗ trợ đang mở. Vidlish sẽ đưa lại để bạn thử
            không cần chúng.
          </p>
        </Card>
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{capability.encountered.length}</p>
          <p className="text-sm font-semibold">Mới gặp, chưa tự nói ra</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Gặp một cụm trong bài không phải là dùng được nó. Đếm lượt gặp thành
            năng lực chính là thứ trang này từ chối làm.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{capability.transferred.length}</p>
          <p className="text-sm font-semibold">
            Tự nói ra được VÀ dùng lại trong tình huống khác
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Đòi cả hai. Dùng lại sau một lần nhớ có trợ giúp là tuyên bố yếu hơn,
            và gộp chúng lại sẽ để nhãn mạnh kiếm được bằng đường yếu.
          </p>
        </Card>
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{completedLessons}</p>
          <p className="text-sm font-semibold">Bài đã hoàn tất</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Để đối chiếu, không phải để khoe: hoàn tất một bài nghĩa là bạn đã đi
            hết nó, không nói lên bạn nhớ được gì.
          </p>
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
