import { Card } from "@/shared/ui/card";

export default function LibraryPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Thư viện</p>
        <h1 className="text-3xl font-bold tracking-tight">Bài học đã lưu</h1>
      </div>
      <Card>
        <p className="text-[var(--muted-foreground)]">
          Chưa có bài học. Library data sẽ được bổ sung trong Epic 5.
        </p>
      </Card>
    </div>
  );
}
