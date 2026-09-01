import Link from "next/link";

import type { LearningAction } from "@/modules/learning/application/resolve-next-learning-action";
import { Card } from "@/shared/ui/card";

/**
 * The single thing to do now.
 *
 * It sits alone above everything else on purpose. The page used to open with a
 * row of choices, and a learner who could choose well between them would not
 * need the product — while one who could not would reliably pick whatever
 * looked easiest, which is the thing that teaches least.
 */

const PRESENTATION: Record<
  LearningAction["kind"],
  { eyebrow: string; title: string; body: string; href: string; cta: string }
> = {
  review_due: {
    eyebrow: "Đến hạn",
    title: "Ôn lại trước khi quên",
    body: "Một lượt ôn đến hạn mà bỏ qua thì không phải là hoãn lại — là mất. Đây là việc đáng làm nhất lúc này.",
    href: "/review",
    cta: "Ôn ngay",
  },
  speak_due: {
    eyebrow: "Đến hạn",
    title: "Nói lại thứ bạn đã học",
    body: "Nghe hiểu rồi mà chưa nói ra được thì chưa dùng được. Lượt này kiểm đúng chỗ đó.",
    href: "/review",
    cta: "Nói thử",
  },
  unit_activity: {
    eyebrow: "Bài đang học",
    title: "Học tiếp phần đang dở",
    body: "Phần này chọn theo thứ bạn làm ít nhất hôm nay, không phải theo thứ tự cố định.",
    href: "/start",
    cta: "Làm tiếp",
  },
  new_word: {
    eyebrow: "Từ mới",
    title: "Gặp một từ mới",
    body: "Không còn gì đến hạn và không còn phần nào dở. Đây là lúc thêm thứ mới.",
    href: "/start",
    cta: "Bắt đầu",
  },
  rest: {
    eyebrow: "Hôm nay",
    title: "Hôm nay xong rồi",
    body: "Không còn gì đến hạn. Học thêm lúc này không làm bạn nhớ lâu hơn — quay lại khi có lượt ôn tới hạn.",
    href: "/progress",
    cta: "Xem tiến bộ",
  },
};

export function TodaysAction({ action }: { action: LearningAction }) {
  const view = PRESENTATION[action.kind];

  return (
    <Card className="flex flex-col gap-4" data-testid="todays-action">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
        {view.eyebrow}
      </p>
      <h2 className="text-2xl font-bold">{view.title}</h2>
      <p className="max-w-2xl text-sm text-[var(--muted-foreground)]">
        {view.body}
      </p>
      <div>
        <Link
          href={view.href}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {view.cta}
        </Link>
      </div>
    </Card>
  );
}
