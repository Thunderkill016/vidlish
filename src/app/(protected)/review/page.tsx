import Link from "next/link";
import { redirect } from "next/navigation";

import { classifyLearningReviewQueue } from "@/modules/learning/application/classify-learning-review-queue";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { createLearningSpeakingReviewQueueReader } from "@/platform/learning/create-learning-speaking-review-queue-reader";
import { resolveLearningReviewPlan } from "@/platform/learning/resolve-review-plan";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

const REVIEW_STEPS = [
  {
    title: "Gọi lại trước khi xem đáp án",
    body: "Learner phải tự nhớ trước. Đáp án chỉ xuất hiện sau attempt và correction không tự biến thành completion.",
  },
  {
    title: "Đổi cue và bối cảnh",
    body: "Phiên thứ hai không lặp câu nguồn. Golden variant đổi sang tình huống một nhóm tình nguyện mới trước khi xác nhận transfer.",
  },
  {
    title: "Lưu delayed evidence riêng",
    body: "Scheduler quyết định lúc quay lại; delayed transfer được ghi riêng khỏi completion của phiên đầu và vẫn không đồng nghĩa mastery.",
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

  const [scheduled, speakingQueue] = await Promise.all([
    createLearningReviewRepository().listScheduled(access.userId),
    createLearningSpeakingReviewQueueReader().read(access.userId),
  ]);
  const { due, upcoming } = await classifyLearningReviewQueue(
    scheduled,
    async (itemKey) =>
      (await resolveLearningReviewPlan(access.userId, itemKey)) !== null,
  );
  const nextSpeaking = speakingQueue.due[0] ?? null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Ôn tập</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Nhớ được sau thời gian trì hoãn mới có ý nghĩa
        </h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Lexical review dùng scheduler thật. Speaking delayed review là một queue
          dẫn xuất riêng từ lesson completion và speaking receipt, không bị giả
          thành FSRS state hay mastery.
        </p>
      </div>

      {nextSpeaking ? (
        <Card className="grid gap-5 border-[var(--solved)] bg-[var(--solved-wash)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--solved)]">
              Speaking · đã đủ 24 giờ
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {speakingQueue.due.length} tình huống có thể nói lại không xem mẫu
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Link này giữ đúng lesson session chưa có speaking receipt. Lần capture
              đầu tiên sau delay có thể được ghi mức hỗ trợ independent, nhưng vẫn
              chỉ là self-check chưa chấm — không phải pronunciation success.
            </p>
          </div>
          <Link
            href={`/learning-lab/v2/speaking?session=${nextSpeaking.sessionId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Nói lại ngay
          </Link>
        </Card>
      ) : speakingQueue.upcoming ? (
        <Card className="grid gap-5 border-[var(--border)] bg-[var(--card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Speaking · chưa đủ 24 giờ
            </p>
            <h2 className="mt-1 text-2xl font-bold">Đã có lượt nói lại kế tiếp</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Mở sau <strong>{formatReviewTime(speakingQueue.upcoming.dueAt)}</strong>.
              Vidlish không mở sớm rồi vẫn gọi evidence đó là independent.
            </p>
          </div>
          <span className="rounded-full bg-[var(--muted)] px-3 py-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
            Chờ đủ 24 giờ
          </span>
        </Card>
      ) : null}

      {due.length > 0 ? (
        <Card className="grid gap-5 border-[var(--solved)] bg-[var(--solved-wash)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--solved)]">
              Lexical review · đến hạn thật
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {due.length} mục cần ôn
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
              Phiên ôn sẽ bắt đầu bằng tự nhớ lại, sau đó đổi sang một bối cảnh khác.
              Đáp án không được gửi xuống trước attempt.
            </p>
          </div>
          <Link
            href="/learning-lab/v2/review"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Bắt đầu phiên ôn
          </Link>
        </Card>
      ) : upcoming?.nextReviewAt ? (
        <Card className="grid gap-5 border-[var(--border)] bg-[var(--card)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Lexical review · chưa đến hạn
            </p>
            <h2 className="mt-1 text-2xl font-bold">Lịch ôn đã được tạo</h2>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Lượt kế tiếp: <strong>{formatReviewTime(upcoming.nextReviewAt)}</strong>.
              Vidlish không cho mở sớm chỉ để tạo cảm giác có tiến bộ.
            </p>
          </div>
          <span className="rounded-full bg-[var(--muted)] px-3 py-1.5 text-sm font-semibold text-[var(--muted-foreground)]">
            Đang chờ delay
          </span>
        </Card>
      ) : (
        <Card className="space-y-3 border-dashed">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Chưa có lexical review
          </p>
          <h2 className="text-2xl font-bold">Hoàn tất một Golden Session v2 trước</h2>
          <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">
            Chỉ khi phiên đầu hoàn tất, target item mới được schedule. Review không tự
            sinh từ số lần mở trang hay từ progress bar.
          </p>
          <Link
            href="/learning-lab/v2"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
          >
            Mở Learning Model v2 →
          </Link>
        </Card>
      )}

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Review model</p>
          <h2 className="mt-1 text-2xl font-bold">
            Phiên thứ hai được kiểm soát thế nào?
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {REVIEW_STEPS.map((step, index) => (
            <Card key={step.title} className="space-y-4 p-5">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--primary-wash)] text-sm font-bold text-[var(--primary)]">
                {index + 1}
              </span>
              <div>
                <h3 className="font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {step.body}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Nguyên tắc</p>
        <h2 className="text-xl font-bold">Completion không phải mastery</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          `next_review_at` chỉ là lịch lexical. Speaking `dueAt` chỉ là mốc đủ 24 giờ
          để thử production không xem mẫu. Cả hai đều là điều kiện để thu evidence,
          không phải bằng chứng learner đã thành thạo.
        </p>
      </Card>
    </div>
  );
}
