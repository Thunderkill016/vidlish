import { VideoUrlForm } from "./_components/video-url-form";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-[720px] space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[var(--accent)]">Tạo bài học</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Dán video tiếng Anh bạn muốn học
        </h1>
        <p className="max-w-2xl text-[var(--muted-foreground)]">
          Vidlish kiểm tra video trước. Transcript và mức độ tiếng Anh sẽ được xác nhận ở các bước sau.
        </p>
      </div>
      <VideoUrlForm />
      <p className="text-sm text-[var(--muted-foreground)]">
        Vidlish không lưu video. Video cần công khai hoặc unlisted, có thể phát và cho phép nhúng.
      </p>
    </div>
  );
}
