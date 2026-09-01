import Link from "next/link";
import { ArrowRight, CircleCheckBig, Link2, ListChecks } from "lucide-react";

import { Card } from "@/shared/ui/card";
import { VideoUrlForm } from "./_components/video-url-form";

const STEPS = [
  [Link2, "Dán liên kết", "Chọn video tiếng Anh ngắn mà bạn thật sự muốn hiểu."],
  [CircleCheckBig, "Nếp kiểm tra", "Nếp xem video có thể dùng để tạo bài học hay không."],
  [ListChecks, "Chọn độ khó", "Chọn mức phù hợp trước khi bắt đầu tạo bài học."],
] as const;

export default function CreatePage() {
  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-10">
      <header className="min-w-0 max-w-3xl space-y-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Nguồn học thêm</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tạo bài học từ một video tiếng Anh</h1>
        <p className="max-w-2xl leading-7 text-[var(--muted-foreground)]">
          Đây là lựa chọn thêm khi bạn muốn học từ một video cụ thể. Nếp chỉ lấy phần vừa sức và có lời nói tiếng Anh rõ ràng — không bắt bạn học hết video.
        </p>
      </header>

      <Card className="flex gap-4 border-[var(--evidence-border)] bg-[var(--evidence-wash)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--card)] text-[var(--evidence)]">
          <ArrowRight aria-hidden="true" size={20} />
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--evidence)]">Nếu bạn mới bắt đầu từ số 0</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Buổi học đầu tiên không cần video. Hãy nghe một câu ngắn trước, rồi quay lại đây khi bạn muốn học từ nguồn của mình.
          </p>
          <Link href="/start" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
            Mở buổi học đầu tiên
            <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </div>
      </Card>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        {STEPS.map(([Icon, title, description], index) => (
          <Card key={title} className="min-w-0 space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-[var(--primary-wash)] text-[var(--primary)]"><Icon aria-hidden="true" size={20} /></span>
              <span className="text-sm font-bold text-[var(--faint-foreground)]">0{index + 1}</span>
            </div>
            <h2 className="font-bold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0 p-5 sm:p-6">
          <VideoUrlForm />
        </Card>
        <aside className="min-w-0 space-y-4">
          <Card className="bg-[var(--primary-wash)] shadow-none">
            <p className="text-sm font-semibold text-[var(--primary)]">Video phù hợp</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Video YouTube có người nói tiếng Anh rõ ràng. Nếp không dịch video không phải tiếng Anh và không tạo lời nói giả để thay phần nói gốc.
            </p>
          </Card>
          <p className="px-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Nếp không lưu video. Video cần công khai hoặc unlisted, có thể phát và cho phép nhúng.
          </p>
        </aside>
      </div>
    </div>
  );
}
