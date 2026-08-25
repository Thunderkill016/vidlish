import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, Lightbulb, MessageCircleMore, Repeat2 } from "lucide-react";

import { classifyLearningReviewQueue } from "@/modules/learning/application/classify-learning-review-queue";
import { resolveLearningReviewPlan } from "@/platform/learning/resolve-review-plan";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

const REVIEW_STEPS = [
  {
    icon: Lightbulb,
    title: "Tự nhớ trước",
    body: "Bạn thử nói hoặc chọn câu trả lời trước khi xem hỗ trợ. Nhờ vậy Nếp biết điều gì bạn thực sự nhớ.",
  },
  {
    icon: MessageCircleMore,
    title: "Gặp lại trong tình huống khác",
    body: "Cùng một ý sẽ quay lại trong một câu hoặc ngữ cảnh khác, để bạn tập dùng chứ không chỉ nhận ra đáp án quen.",
  },
  {
    icon: Clock3,
    title: "Quay lại đúng lúc",
    body: "Bạn chỉ cần học tiếp hôm nay. Nếp sẽ nhắc lại trước khi bạn quên, thay vì bắt bạn tự nhớ lịch ôn.",
  },
];

function formatReviewTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export default async function ReviewPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const scheduled = await createLearningReviewRepository().listScheduled(
    access.userId,
  );
  const { due, upcoming } = await classifyLearningReviewQueue(
    scheduled,
    async (itemKey) =>
      (await resolveLearningReviewPlan(access.userId, itemKey)) !== null,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="max-w-3xl space-y-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Ôn tập đúng lúc</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Nhớ lại để tiếng Anh ở lại lâu hơn
        </h1>
        <p className="max-w-2xl leading-7 text-[var(--muted-foreground)]">
          Mỗi lượt ôn bắt đầu bằng điều bạn tự nhớ được. Một lần trả lời đúng là tín hiệu tốt,
          chưa phải lời hứa rằng bạn đã nhớ mãi.
        </p>
      </header>

      {due.length > 0 ? (
        <Card className="grid gap-6 border-[var(--solved)] bg-[var(--solved-wash)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--solved)]">Đến lượt ôn</p>
            <h2 className="mt-1 text-2xl font-bold">
              {due.length} mục đang chờ bạn
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
              Hãy dành vài phút tự nhớ lại trước. Bạn sẽ nhận được hỗ trợ sau khi đã thử.
            </p>
          </div>
          <Link
            href="/learning-lab/v2/review"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <Repeat2 aria-hidden="true" size={18} />
            Bắt đầu phiên ôn
          </Link>
        </Card>
      ) : upcoming?.nextReviewAt ? (
        <Card className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">Lượt ôn tiếp theo</p>
            <h2 className="mt-1 text-2xl font-bold">Bạn đã làm đủ cho hôm nay</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
              Nếp sẽ mở lượt tiếp theo vào <strong>{formatReviewTime(upcoming.nextReviewAt)}</strong>.
              Nghỉ một chút cũng là một phần của việc nhớ lâu.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--muted)] px-3 py-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
            <Clock3 aria-hidden="true" size={16} />
            Đang chờ đến lượt
          </span>
        </Card>
      ) : (
        <Card className="grid gap-6 border-dashed bg-[var(--card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">Chưa có mục cần ôn</p>
            <h2 className="mt-1 text-2xl font-bold">Học câu đầu tiên trước nhé</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">
              Khi bạn đã tự thử một câu, Nếp sẽ tạo lịch ôn phù hợp. Không có bài ôn giả chỉ để
              làm đầy trang này.
            </p>
          </div>
          <Link
            href="/start"
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Quay lại bài học hôm nay
          </Link>
        </Card>
      )}

      <section className="space-y-4" aria-labelledby="review-method-heading">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[var(--accent)]">Cách Nếp giúp bạn ôn</p>
          <h2 id="review-method-heading" className="mt-1 text-2xl font-bold">
            Không chỉ xem lại đáp án
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {REVIEW_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-wash)] text-[var(--primary)]">
                    <Icon aria-hidden="true" size={20} />
                  </span>
                  <span className="text-sm font-bold text-[var(--faint-foreground)]">0{index + 1}</span>
                </div>
                <div>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{step.body}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="flex gap-4 border-[var(--evidence-border)] bg-[var(--evidence-wash)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-[var(--evidence)]">
          <Lightbulb aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--evidence)]">Điều cần nhớ</p>
          <h2 className="mt-1 text-xl font-bold">Một lần đúng chưa có nghĩa là đã nhớ lâu</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Nếp chỉ coi đó là một bằng chứng nhỏ. Bạn sẽ gặp lại điều này sau, trong một cách hỏi khác.
          </p>
        </div>
      </Card>
    </div>
  );
}
