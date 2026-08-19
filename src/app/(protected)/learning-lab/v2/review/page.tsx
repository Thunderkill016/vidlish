import Link from "next/link";

import { DelayedReviewLab } from "./_components/delayed-review-lab";

export default function DelayedReviewPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Learning Model v2</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Ôn lại sau thời gian trì hoãn
          </h1>
        </div>
        <Link
          href="/review"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-[var(--primary)]"
        >
          ← Quay lại hàng đợi
        </Link>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
        Phiên này kiểm tra retrieval rồi changed-context transfer. Không có đáp án trước attempt, không lưu raw text của câu trả lời, và hoàn tất phiên không đồng nghĩa mastery.
      </p>
      <DelayedReviewLab />
    </div>
  );
}
