"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createLessonJobResponseSchema,
  generationJobResponseSchema,
  type LearnerGenerationPhase,
  type PublicGenerationJob,
} from "@/shared/contracts/generation";
import { Button } from "@/shared/ui/button";

const phases: ReadonlyArray<{
  id: Exclude<LearnerGenerationPhase, "completed" | "failed" | "cancelled">;
  label: string;
}> = [
  { id: "preparing", label: "Chuẩn bị" },
  { id: "transcript", label: "Lấy hoặc tạo transcript" },
  { id: "language_check", label: "Kiểm tra tiếng Anh" },
  { id: "video_analysis", label: "Phân tích video" },
  { id: "lesson_plan", label: "Lập kế hoạch bài học" },
  { id: "activities", label: "Soạn hoạt động" },
  { id: "quality_check", label: "Kiểm tra chất lượng" },
  { id: "publishing", label: "Hoàn thiện" },
];

export function JobProgress({
  initialJob,
  initialPhase,
}: {
  initialJob: PublicGenerationJob;
  initialPhase: LearnerGenerationPhase;
}) {
  const [job, setJob] = useState(initialJob);
  const [phase, setPhase] = useState(initialPhase);
  const [online, setOnline] = useState(true);
  const [pollError, setPollError] = useState(false);
  const [retryingDispatch, setRetryingDispatch] = useState(false);
  const [retryDispatchError, setRetryDispatchError] = useState(false);

  const terminal = ["completed", "failed", "cancelled"].includes(phase);
  const unsupportedLanguage =
    phase === "failed" &&
    job.safeErrorCode === "VIDEO_LANGUAGE_UNSUPPORTED";
  const transcriptUnavailable =
    phase === "failed" && job.safeErrorCode === "TRANSCRIPT_UNAVAILABLE";
  const currentIndex = useMemo(
    () => phases.findIndex((item) => item.id === phase),
    [phase],
  );

  const loadLatest = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("poll failed");
      const payload = generationJobResponseSchema.safeParse(
        (await response.json()) as unknown,
      );
      if (!payload.success) throw new Error("invalid poll payload");
      setJob(payload.data.job);
      setPhase(payload.data.phase);
      setPollError(false);
      return true;
    } catch {
      setPollError(true);
      return false;
    }
  }, [job.id]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (terminal) return;
    let cancelled = false;

    async function refresh() {
      if (cancelled) return;
      await loadLatest();
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [loadLatest, terminal]);

  async function retryDispatch() {
    if (retryingDispatch || job.dispatchStatus !== "failed") return;
    setRetryingDispatch(true);
    setRetryDispatchError(false);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: job.videoId,
          cefrLevel: job.cefrLevel,
          metadataVersion: job.metadataVersion,
        }),
      });
      if (!response.ok) throw new Error("dispatch retry failed");
      const payload = createLessonJobResponseSchema.safeParse(
        (await response.json()) as unknown,
      );
      if (!payload.success || payload.data.jobId !== job.id) {
        throw new Error("unexpected retry job");
      }
      if (!(await loadLatest())) throw new Error("refresh after retry failed");
    } catch {
      setRetryDispatchError(true);
    } finally {
      setRetryingDispatch(false);
    }
  }

  const currentLabel = unsupportedLanguage
    ? "Video không đủ tiếng Anh gốc"
    : transcriptUnavailable
      ? "Chưa lấy được lời thoại"
      : phases.find((item) => item.id === phase)?.label ??
      (phase === "completed"
        ? "Bài học đã sẵn sàng"
        : phase === "cancelled"
          ? "Đã hủy"
          : "Cần xử lý lại");

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm font-semibold text-[var(--accent)]">
          {terminal ? "Tiến trình tạo bài học" : "Đang tạo bài học"} · {job.cefrLevel}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{job.videoTitle}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {job.channelName}
        </p>
      </section>

      {unsupportedLanguage ? (
        <section
          data-testid="language-unsupported"
          className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              Video chưa đủ tiếng Anh gốc
            </h2>
            <p role="alert" className="text-sm text-[var(--foreground)]">
              Vidlish không tìm thấy một phần lời nói tiếng Anh gốc đủ dài và rõ để tạo bài học có căn cứ.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Từ tiếng Anh xuất hiện rời rạc, phụ đề dịch hoặc nội dung lồng tiếng không được dùng thay cho lời nói nguồn.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => window.location.assign("/create")}
          >
            Chọn video khác
          </Button>
        </section>
      ) : null}

      {transcriptUnavailable ? (
        <section
          data-testid="transcript-unavailable"
          className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Chưa lấy được lời thoại</h2>
            <p role="alert" className="text-sm text-[var(--foreground)]">
              Vidlish đã thử mọi cách hiện có nhưng không lấy được lời thoại của video này.
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Điều này không có nghĩa video sai ngôn ngữ. Video có phụ đề thường xử lý được ngay.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => window.location.assign("/create")}
          >
            Chọn video khác
          </Button>
        </section>
      ) : null}

      {job.dispatchStatus === "failed" && !terminal ? (
        <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Chưa thể bắt đầu tiến trình</h2>
            <p role="alert" className="text-sm text-[var(--muted-foreground)]">
              Job đã được lưu an toàn nhưng chưa gửi được tới hệ thống xử lý.
            </p>
            {retryDispatchError ? (
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Vidlish chưa thể thử lại lúc này. Job vẫn được lưu.
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={!online || retryingDispatch}
            onClick={() => void retryDispatch()}
          >
            {retryingDispatch ? "Đang thử lại…" : "Thử lại"}
          </Button>
        </section>
      ) : null}

      <section
        aria-labelledby="generation-progress-heading"
        className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
      >
        <div className="space-y-1">
          <h2 id="generation-progress-heading" className="text-lg font-semibold">
            Tiến trình
          </h2>
          <p aria-live="polite" className="text-sm font-medium">
            {currentLabel}
          </p>
          {!online ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Bạn đang offline. Tiến trình vẫn được lưu và sẽ cập nhật khi có mạng.
            </p>
          ) : pollError ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Chưa thể cập nhật ngay. Vidlish sẽ tự thử lại.
            </p>
          ) : null}
        </div>

        <ol className="space-y-3">
          {phases.map((item, index) => {
            const complete = currentIndex > index || phase === "completed";
            const current = currentIndex === index;
            return (
              <li key={item.id} className="flex min-h-11 items-center gap-3">
                <span aria-hidden="true" className="w-6 text-center font-semibold">
                  {complete ? "✓" : current ? "●" : "○"}
                </span>
                <span
                  className={
                    current
                      ? "font-semibold text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  }
                >
                  {item.label}
                  {current ? <span className="sr-only"> — hiện tại</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-sm text-[var(--muted-foreground)]">
        Bạn có thể đóng trang này. Reload hoặc mở lại liên kết sẽ tiếp tục hiển thị cùng tiến trình.
      </p>
    </div>
  );
}
