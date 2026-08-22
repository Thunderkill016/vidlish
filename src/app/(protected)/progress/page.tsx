import Link from "next/link";
import { redirect } from "next/navigation";

import { derivePersonalLearningCheckpoint } from "@/modules/learning/application/derive-personal-learning-checkpoint";
import { summariseCapabilityEvidence } from "@/modules/learning/application/summarise-capability-evidence";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
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

const CHECKPOINT_COPY = {
  building_evidence: {
    title: "Chưa có bằng chứng dùng độc lập",
    body: "Vidlish không lấy số lần mở app hay số bài hoàn tất để gọi là tiến bộ. Việc đầu tiên là tạo ra một từ/cụm đúng mà không cần support.",
  },
  independent_retrieval: {
    title: "Đã tự gọi lại được ít nhất một đơn vị",
    body: "Đây là bằng chứng năng lực đầu tiên: bạn đã tạo ra ngôn ngữ đúng khi support đóng. Nó chưa chứng minh bạn dùng được ở tình huống mới hoặc nhớ lâu.",
  },
  changed_context_transfer: {
    title: "Đã dùng độc lập trong tình huống khác",
    body: "Claim này mạnh hơn recall vì cùng ngôn ngữ đã được dùng lại ngoài câu nguồn. Bước còn thiếu là xem nó có sống qua thời gian hay không.",
  },
  delayed_transfer: {
    title: "Đã có ít nhất một vòng học sống qua thời gian",
    body: "Vidlish đã quan sát independent retrieval, changed-context use và delayed transfer trên ít nhất một item. Đây vẫn không phải nhãn mastery hay fluency.",
  },
} as const;

const NEXT_ACTION_COPY = {
  start_learning: {
    href: "/start",
    label: "Bắt đầu buổi học",
    body: "Tạo evidence đầu tiên từ input đủ dễ cho trình độ hiện tại.",
  },
  continue_beginner_learning: {
    href: "/start",
    label: "Tiếp tục beginner path",
    body: "Beginner path hiện đã ghi independent word evidence nhưng chưa có durable changed-context + delayed-review chain riêng. Vidlish sẽ không nâng claim cho tới khi phần đó được nối thật.",
  },
  retrieve_without_support: {
    href: "/dashboard",
    label: "Tiếp tục bài đang học",
    body: "Mục tiêu gần nhất là tạo ra đáp án đúng khi support đóng.",
  },
  use_changed_context: {
    href: "/review",
    label: "Luyện trong tình huống khác",
    body: "Recall một mình chưa đủ. Khi review phù hợp có sẵn, hãy dùng lại item trong context khác.",
  },
  complete_delayed_review: {
    href: "/review",
    label: "Làm delayed review",
    body: "Đừng ôn sớm chỉ để làm số đẹp. Khi item đến hạn, thử recall và transfer lại trước khi xem đáp án.",
  },
  continue_learning: {
    href: "/start",
    label: "Học tiếp",
    body: "Một item có delayed evidence không kết thúc việc học. Tiếp tục mở rộng số thứ bạn có thể dùng độc lập.",
  },
} as const;

export default async function ProgressPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );
  const [scheduledItems, progressSummaries, beginnerKnownWords] =
    await Promise.all([
      createLearningReviewRepository().listScheduled(access.userId),
      createStudyProgressRepository(lessonRepository).listOwnedSummaries(
        access.userId,
      ),
      createBeginnerProgressRepository().knownWords(access.userId),
    ]);
  const capability = summariseCapabilityEvidence(scheduledItems);
  const personalCheckpoint = derivePersonalLearningCheckpoint({
    items: scheduledItems,
    beginnerIndependentCount: beginnerKnownWords.length,
  });
  const checkpointCopy = CHECKPOINT_COPY[personalCheckpoint.stage];
  const nextAction = NEXT_ACTION_COPY[personalCheckpoint.nextAction];

  // Completion stays visible only as comparison. It does not enter the personal
  // checkpoint and therefore cannot upgrade a capability claim.
  const completedLessons = progressSummaries.filter(
    (summary) => summary.completedAt,
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Tiến bộ</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Đo evidence, không cộng XP cho đẹp
        </h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Con số bên dưới đếm thứ bạn đã TẠO RA, không phải số bài đã xem. Không
          có mốc nào ở đây nói bạn đã thành thạo — nhớ lại được hôm nay và nhớ
          được sau nhiều tuần là hai chuyện khác nhau.
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="personal-loop-heading">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">
            Vòng học cá nhân
          </p>
          <h2 id="personal-loop-heading" className="mt-1 text-2xl font-bold">
            {checkpointCopy.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            {checkpointCopy.body}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
          <Card className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {personalCheckpoint.independentCount}
                </p>
                <p className="mt-1 text-sm font-semibold">Independent</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                  Beginner words + source items đã được tạo ra khi support đóng.
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {personalCheckpoint.transferredCount}
                </p>
                <p className="mt-1 text-sm font-semibold">Changed context</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                  Source items vừa independent vừa dùng thành công ở context khác.
                </p>
              </div>
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {personalCheckpoint.delayedTransferCount}
                </p>
                <p className="mt-1 text-sm font-semibold">Delayed transfer</p>
                <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">
                  Item có đủ chuỗi independent → transfer → delayed transfer.
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 border-[var(--accent)] p-5">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Việc tiếp theo
            </p>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              {nextAction.body}
            </p>
            <Link
              href={nextAction.href}
              className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
            >
              {nextAction.label} →
            </Link>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="space-y-1 p-5">
          <p className="text-3xl font-bold">{capability.independent.length}</p>
          <p className="text-sm font-semibold">
            Source item tự nói ra được, không cần trợ giúp
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Bạn đã tạo ra đúng cụm này ít nhất một lần khi không mở mức hỗ trợ
            nào. Beginner independent words được tính ở checkpoint phía trên,
            không trộn vào source-item list này.
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
            hết nó, không nói lên bạn nhớ được gì và không nâng checkpoint.
          </p>
        </Card>
      </div>

      <section className="space-y-4" aria-labelledby="evidence-heading">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">
            Capability evidence
          </p>
          <h2 id="evidence-heading" className="mt-1 text-2xl font-bold">
            Bốn lớp bằng chứng
          </h2>
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
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--evidence)]">
            Nguồn sự thật
          </p>
          <h2 className="mt-1 text-xl font-bold">
            Mỗi claim phải quay về được evidence
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Source-lesson path đã có durable changed-context và delayed-review
          evidence. Beginner path hiện mới có independent word evidence và
          within-session reuse; Vidlish không gọi đó là delayed transfer cho tới
          khi cross-session beginner review được nối thật.
        </p>
      </Card>
    </div>
  );
}
