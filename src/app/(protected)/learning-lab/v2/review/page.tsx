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
        Phiên này xem bạn có tự nhớ ra không, rồi xem bạn có dùng được sang một tình huống khác không. Đáp án không hiện trước khi bạn thử, chữ bạn gõ không được lưu lại, và đi hết phiên không có nghĩa là đã thạo.
      </p>
      <DelayedReviewLab />
    </div>
  );
}
