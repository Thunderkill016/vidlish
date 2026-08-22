import Link from "next/link";

import { GoldenSessionStudyEvaluator } from "./_components/golden-session-study-evaluator";

export default function GoldenSessionUsabilityPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Learning Model v2</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Golden Session usability gate
          </h1>
        </div>
        <Link
          href="/learning-lab/v2"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
        >
          ← Quay lại Golden Session
        </Link>
      </div>

      <div className="space-y-2 text-sm leading-6 text-[var(--muted-foreground)]">
        <p>
          Trang nội bộ này chỉ tính verdict từ năm participant records đã được moderator thu thập. Nó không tuyển người test, không tạo evidence và không tự tuyên bố người học đã tiến bộ.
        </p>
        <p>
          Recognition trước/sau vẫn phải do moderator quan sát. `exit_ticket` unscored chỉ chứng minh learner đã làm after-check, không phải learning gain.
        </p>
      </div>

      <GoldenSessionStudyEvaluator />
    </div>
  );
}
