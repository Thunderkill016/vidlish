"use client";

import { useEffect, useMemo, useState } from "react";

import {
  generationJobResponseSchema,
  type LearnerGenerationPhase,
  type PublicGenerationJob,
} from "@/shared/contracts/generation";

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

  const terminal = ["completed", "failed", "cancelled"].includes(phase);
  const currentIndex = useMemo(
    () => phases.findIndex((item) => item.id === phase),
    [phase],
  );

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
      if (!navigator.onLine) return;
      try {
        const response = await fetch(`/api/jobs/${job.id}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("poll failed");
        const payload = generationJobResponseSchema.safeParse(
          (await response.json()) as unknown,
        );
        if (!payload.success || cancelled) return;
        setJob(payload.data.job);
        setPhase(payload.data.phase);
        setPollError(false);
      } catch {
        if (!cancelled) setPollError(true);
      }
    }

    void refresh();
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [job.id, terminal]);

  const currentLabel =
    phases.find((item) => item.id === phase)?.label ??
    (phase === "completed"
      ? "Bài học đã sẵn sàng"
      : phase === "cancelled"
        ? "Đã hủy"
        : "Cần xử lý lại");

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Đang tạo bài học · {job.cefrLevel}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{job.videoTitle}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {job.channelName}
        </p>
      </section>

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
