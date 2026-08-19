import Link from "next/link";

import { Card } from "@/shared/ui/card";

const REVIEW_STEPS = [
  {
    title: "Gọi lại trước khi xem đáp án",
    body: "Learner phải tự nhớ hoặc tự viết trước; hệ thống không mở answer key chỉ vì đã đến ngày ôn.",
  },
  {
    title: "Đổi input hoặc bối cảnh",
    body: "Review không lặp nguyên câu cũ. Nó cần thay wording, speaker, context hoặc required next turn để kiểm tra transfer.",
  },
  {
    title: "Giảm hỗ trợ theo evidence",
    body: "Scheduler quyết định lúc quay lại; support level và delayed transfer mới quyết định ta biết được gì về năng lực.",
  },
];

export default function ReviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Ôn tập</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Nhớ được sau vài ngày mới có ý nghĩa</h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Queue delayed-review chưa được nối vào production trên PR #44. Màn này là product shell thật, nhưng không bịa số item đến hạn hay gọi completion là mastery.
        </p>
      </div>

      <Card className="grid gap-5 border-[var(--evidence-border)] bg-[var(--evidence-wash)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-[var(--evidence)]">Trạng thái hiện tại</p>
          <h2 className="mt-1 text-2xl font-bold">Delayed review: chưa bật</h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)]">
            Session, attempt, retry và changed-context transfer đã có nền bền vững. Gate kế tiếp là lưu support/replay evidence rồi triển khai phiên thứ hai khác input/context.
          </p>
        </div>
        <Link
          href="/learning-lab/v2"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Mở Learning Model v2
        </Link>
      </Card>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Review model</p>
          <h2 className="mt-1 text-2xl font-bold">Một phiên ôn đúng sẽ làm gì?</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {REVIEW_STEPS.map((step, index) => (
            <Card key={step.title} className="space-y-4 p-5">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--primary-wash)] text-sm font-bold text-[var(--primary)]">
                {index + 1}
              </span>
              <div>
                <h3 className="font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{step.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="space-y-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Nguyên tắc</p>
        <h2 className="text-xl font-bold">Completion không phải mastery</h2>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Một người có thể hoàn tất lesson hôm nay nhưng vẫn quên vào tuần sau. Vidlish chỉ nên nâng claim về năng lực khi có delayed transfer evidence đủ mạnh.
        </p>
      </Card>
    </div>
  );
}
