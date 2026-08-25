import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleDashed, Repeat2, Sparkles } from "lucide-react";

import { createIdentityService } from "@/platform/identity/create-identity-service";
import { summariseCapabilityEvidence } from "@/modules/learning/application/summarise-capability-evidence";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

const EVIDENCE_DIMENSIONS = [
  ["Hiểu", "Bạn nhận ra ý nghĩa trong câu đang nghe hoặc đọc."],
  ["Tự nhớ", "Bạn gọi lại từ hoặc câu mà chưa cần xem gợi ý."],
  ["Dùng", "Bạn dùng tiếng Anh để trả lời một tình huống cụ thể."],
  ["Gặp lại sau", "Bạn làm được điều đó sau một khoảng nghỉ, trong một cách hỏi khác."],
] as const;

export default async function ProgressPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const scheduledItems = await createLearningReviewRepository().listScheduled(access.userId);
  const capability = summariseCapabilityEvidence(scheduledItems);
  const hasEvidence =
    capability.independent.length > 0 ||
    capability.supported.length > 0 ||
    capability.encountered.length > 0 ||
    capability.transferred.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold text-[var(--accent)]">Tiến bộ của bạn</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Điều bạn tự làm được mới được tính
          </h1>
          <p className="max-w-2xl leading-7 text-[var(--muted-foreground)]">
            {hasEvidence
              ? "Nếp ghi lại những lần bạn tự nhớ, tự nói và dùng lại được — không đếm số lần bạn chỉ mở bài học."
              : "Buổi học đầu tiên sẽ tạo những dấu mốc nhỏ ở đây. Bạn không cần có chuỗi ngày hay điểm số để bắt đầu."}
          </p>
        </div>
        <Link
          href="/start"
          className="inline-flex min-h-11 w-fit shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {hasEvidence ? "Tiếp tục buổi học" : "Bắt đầu buổi học"}
          <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </header>

      <section aria-labelledby="current-evidence-heading" className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Dấu mốc hiện tại</p>
          <h2 id="current-evidence-heading" className="mt-1 text-2xl font-bold">
            Bạn đang ở đâu trong quá trình dùng được tiếng Anh?
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="space-y-3 border-[var(--solved)] bg-[var(--solved-wash)] p-5">
            <CheckCircle2 aria-hidden="true" className="text-[var(--solved)]" size={22} />
            <p className="text-3xl font-bold tabular-nums">{capability.independent.length}</p>
            <div>
              <h3 className="font-bold">Tự nói ra được</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                Bạn đã thử mà không mở hỗ trợ. Đây là điều Nếp ưu tiên ghi nhận.
              </p>
            </div>
          </Card>
          <Card className="space-y-3 p-5">
            <CircleDashed aria-hidden="true" className="text-[var(--accent)]" size={22} />
            <p className="text-3xl font-bold tabular-nums">{capability.supported.length}</p>
            <div>
              <h3 className="font-bold">Đang luyện</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                Bạn làm được khi có gợi ý. Lần sau Nếp sẽ cho bạn thử ít hỗ trợ hơn.
              </p>
            </div>
          </Card>
          <Card className="space-y-3 p-5">
            <Sparkles aria-hidden="true" className="text-[var(--evidence)]" size={22} />
            <p className="text-3xl font-bold tabular-nums">{capability.encountered.length}</p>
            <div>
              <h3 className="font-bold">Mới gặp</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                Bạn đã nghe hoặc đọc những từ này; chưa cần phải nhớ ngay.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="flex gap-4 border-[var(--evidence-border)] bg-[var(--evidence-wash)]">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-[var(--evidence)]">
            <Repeat2 aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--evidence)]">Dùng lại trong hoàn cảnh khác</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{capability.transferred.length}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Đây là số điều bạn đã tự làm được lại trong một tình huống khác. Nó mạnh hơn một lần trả lời đúng.
            </p>
          </div>
        </Card>
        <Card className="space-y-2">
          <p className="text-sm font-semibold text-[var(--accent)]">Không vội gắn nhãn</p>
          <h2 className="text-xl font-bold">Nếp chưa gọi bạn là “thành thạo”</h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Nhớ lại hôm nay và dùng lại sau một thời gian là hai việc khác nhau. Bạn sẽ thấy từng dấu mốc khi thật sự có chúng.
          </p>
        </Card>
      </div>

      <section className="space-y-4" aria-labelledby="evidence-heading">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-[var(--accent)]">Nếp theo dõi điều gì?</p>
          <h2 id="evidence-heading" className="mt-1 text-2xl font-bold">Bốn dấu mốc thay vì một con số chung</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {EVIDENCE_DIMENSIONS.map(([title, description], index) => (
            <Card key={title} className="flex items-start gap-4 p-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--primary-wash)] text-sm font-bold text-[var(--primary)]">
                {index + 1}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
