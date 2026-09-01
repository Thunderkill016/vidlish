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
    body: "Bạn phải tự nhớ trước đã. Đáp án chỉ hiện sau khi bạn đã thử, và đọc lời sửa không tính là đã làm xong.",
  },
  {
    title: "Đổi cue và bối cảnh",
    body: "Lần thứ hai không hỏi lại đúng câu cũ. Nó đổi sang một tình huống khác, để xem bạn dùng được thật hay chỉ thuộc lòng câu đó.",
  },
  {
    title: "Lần quay lại sau được ghi riêng",
    body: "Máy xếp lịch quyết định khi nào câu này quay lại. Lần đó được ghi tách khỏi lần đầu — và vẫn chưa có nghĩa là bạn đã thạo.",
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
          Phần ôn từ chạy bằng máy xếp lịch thật. Phần ôn nói là một hàng chờ
          dựng riêng từ việc bạn học xong bài nào và đã nói lại lần nào, chứ
          không bị nhét vào lịch ôn từ hay đổi thành &ldquo;đã thạo&rdquo;.
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
              Đường dẫn này mở đúng buổi học bạn chưa nói lại lần nào. Lần nói
              đầu tiên sau delay có thể được ghi mức hỗ trợ independent, nhưng vẫn
              chỉ là bạn tự đánh giá, chưa ai chấm — không phải là phát âm đã đúng.
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
              Sản phẩm này không mở sớm rồi vẫn ghi là bạn tự làm được.
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
              Đáp án không được gửi về máy bạn trước khi bạn thử.
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
              Nếp không cho mở sớm chỉ để tạo cảm giác có tiến bộ.
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
            Xong lần đầu thì từ đó mới được xếp lịch quay lại. Việc ôn không tự
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
        <h2 className="text-xl font-bold">Làm xong không phải là đã thạo</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          `next_review_at` chỉ là lịch lexical. Speaking `dueAt` chỉ là mốc đủ 24 giờ
          để bạn thử tự nói ra mà không nhìn mẫu. Cả hai đều là điều kiện để có căn cứ,
          không phải bằng chứng learner đã thành thạo.
        </p>
      </Card>
    </div>
  );
}
