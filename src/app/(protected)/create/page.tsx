import { Card } from "@/shared/ui/card";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Tạo bài học</p>
        <h1 className="text-3xl font-bold tracking-tight">Không gian học của bạn đã sẵn sàng</h1>
        <p className="max-w-2xl text-[var(--muted-foreground)]">
          Bạn đã đăng nhập thành công. Tính năng chọn video sẽ sớm xuất hiện trong private beta.
        </p>
      </div>
      <Card>
        <p lang="en" className="font-semibold text-[var(--primary)]">
          Any English video. Your English lesson.
        </p>
      </Card>
    </div>
  );
}
