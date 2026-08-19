import { VideoUrlForm } from "./_components/video-url-form";

const STEPS = [
  ["01", "Dán URL", "Chọn video tiếng Anh bạn thật sự muốn hiểu."],
  ["02", "Kiểm tra nguồn", "Vidlish xác nhận metadata, transcript và evidence trước khi tốn quota."],
  ["03", "Tạo lesson", "Chỉ phần nguồn đủ tin cậy mới đi tiếp vào Lesson Engine."],
] as const;

export default function CreatePage() {
  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-8">
      <div className="min-w-0 space-y-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Tạo bài học</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Dán video tiếng Anh bạn muốn học</h1>
        <p className="max-w-2xl text-[var(--muted-foreground)]">
          Vidlish không cố dạy toàn bộ video. Hệ thống kiểm tra nguồn trước rồi mới chọn phần có đủ evidence để tạo một lesson ngắn và học được.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-3">
        {STEPS.map(([number, title, description]) => (
          <div key={number} className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
            <p className="font-mono text-xs font-semibold text-[var(--faint-foreground)]">{number}</p>
            <h2 className="mt-2 font-bold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
          <VideoUrlForm />
        </div>
        <aside className="min-w-0 space-y-4">
          <div className="rounded-2xl bg-[var(--primary-wash)] p-5">
            <p className="text-sm font-semibold text-[var(--primary)]">Phạm vi MVP</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Video YouTube nói tiếng Anh, hướng dẫn cho người Việt A2–B2. Không dịch video không phải tiếng Anh và không tạo lời nói giả để thay nguồn.
            </p>
          </div>
          <p className="px-1 text-sm leading-6 text-[var(--muted-foreground)]">
            Vidlish không lưu video. Video cần công khai hoặc unlisted, có thể phát và cho phép nhúng.
          </p>
        </aside>
      </div>
    </div>
  );
}
