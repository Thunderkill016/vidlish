"use client";

import { useState } from "react";
import {
  BookOpen,
  Layers,
  MessageSquareCheck,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";

import type { ChunkRecallItem } from "@/modules/production/application/build-chunk-recall";
import type { ClozeItem } from "@/modules/production/application/build-cloze-item";
import type { TransferProbe } from "@/modules/production/application/build-transfer-probe";
import type { DailySession } from "@/modules/session/application/plan-daily-session";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { ChunkRun } from "./chunk-run";
import { ClozeRun } from "./cloze-run";
import { PassageRun } from "./passage-run";
import { TransferRun } from "./transfer-run";

export type SessionPayload = {
  readonly plan: DailySession;
  readonly review: readonly ClozeItem[];
  readonly build: readonly ClozeItem[];
  readonly chunks: readonly ChunkRecallItem[];
  readonly transfer: readonly TransferProbe[];
  readonly passage: {
    readonly textId: string;
    readonly title: string;
    readonly paragraphs: readonly string[];
    readonly sourceUrl: string;
    readonly sourceLabel: string;
  } | null;
};

type Stage = "idle" | "review" | "read" | "build" | "chunk" | "transfer" | "done";

const STEP_ICONS = {
  review: RotateCcw,
  read: BookOpen,
  build: Layers,
  chunk: MessageSquareCheck,
  transfer: Sparkles,
};

const STEP_COLORS = {
  review: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  read: "text-purple-600 bg-purple-500/10 border-purple-500/20",
  build: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
  chunk: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  transfer: "text-amber-600 bg-amber-500/10 border-amber-500/20",
};

export function DailySessionRunner({ payload }: { payload: SessionPayload }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [reviewed, setReviewed] = useState(0);
  const [built, setBuilt] = useState(0);
  const [chunks, setChunks] = useState(0);
  const [transferred, setTransferred] = useState(0);

  const order: Stage[] = payload.plan.steps.map((step) =>
    step.kind === "review"
      ? "review"
      : step.kind === "read"
        ? "read"
        : step.kind === "build"
          ? "build"
          : step.kind === "chunk"
            ? "chunk"
            : "transfer",
  );

  function advance(from: Stage) {
    const at = order.indexOf(from);
    setStage(order[at + 1] ?? "done");
  }

  if (payload.plan.steps.length === 0) {
    return (
      <Card className="flex flex-col gap-3 border-[var(--border)] p-6" data-testid="session-empty">
        <div className="flex items-center gap-2 text-[var(--accent)]">
          <Sparkles size={18} />
          <p className="text-xs font-bold uppercase tracking-wider">Hôm nay</p>
        </div>
        <h2 className="text-xl font-bold">Chưa có bài tập nào đến hạn</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Mọi từ đã học đều đang trong khoảng ghi nhớ an toàn, và chưa có câu mới nào vừa sức hôm nay.
          Sản phẩm không cố tình tạo bài tập giả để giữ bạn lại app.
        </p>
      </Card>
    );
  }

  if (stage === "idle") {
    return (
      <Card
        className="relative overflow-hidden border-[var(--border-strong)] p-6 sm:p-8 shadow-[var(--shadow-float)] space-y-6"
        data-testid="session-start"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-wash)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              <Zap size={14} />
              <span>BUỔI HỌC HÔM NAY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {payload.plan.minutes} phút thực chiến · {payload.plan.steps.length} bước liền mạch
            </h2>
          </div>
          <span className="self-start sm:self-auto rounded-xl bg-[var(--muted)] px-3 py-1.5 text-xs font-semibold text-[var(--muted-foreground)]">
            Không cần chọn bài
          </span>
        </div>

        <div className="grid gap-3">
          {payload.plan.steps.map((step, index) => {
            const Icon = STEP_ICONS[step.kind];
            const colorClass = STEP_COLORS[step.kind];

            return (
              <div
                key={step.kind}
                className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:border-[var(--border-strong)] hover:shadow-xs"
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${colorClass}`}
                >
                  <Icon size={20} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--foreground)]">
                      {index + 1}.{" "}
                      {step.kind === "review"
                        ? `Ôn tập ${step.items} từ đến hạn (FSRS)`
                        : step.kind === "read"
                          ? "Đọc đoạn văn tiếng Anh thật"
                          : step.kind === "build"
                            ? `Ghép ${step.items} câu hoàn chỉnh`
                            : step.kind === "chunk"
                              ? `Bật cả cụm — ${step.items} cụm từ`
                              : `Thử thách tình huống mới — ${step.items} cụm`}
                    </span>
                    <span className="text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-0.5 rounded-full">
                      {step.minutes} phút
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                    {step.reasonVi}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <Button
            size="lg"
            className="w-full sm:w-auto text-base gap-2 px-8"
            onClick={() => setStage(order[0] ?? "done")}
          >
            <Play size={18} fill="currentColor" />
            Bắt đầu buổi học ngay
          </Button>
          <p className="text-xs text-[var(--muted-foreground)] text-center sm:text-right">
            Hệ thống tự động chuyển tiếp giữa các bước
          </p>
        </div>
      </Card>
    );
  }

  if (stage === "review") {
    return (
      <ClozeRun
        title="Ôn lại (Spaced Review)"
        subtitle="Những từ này đã đến hạn cần ôn. Câu ở đây cố tình không gợi ý — tự nhớ ra được mới chuyển vào trí nhớ dài hạn."
        items={payload.review}
        onFinish={(correct: number) => {
          setReviewed(correct);
          advance("review");
        }}
      />
    );
  }

  if (stage === "read" && payload.passage) {
    return (
      <PassageRun
        passage={payload.passage}
        onFinish={() => advance("read")}
      />
    );
  }

  if (stage === "build") {
    return (
      <ClozeRun
        title="Ghép câu (Active Production)"
        subtitle="Một từ bị lấy đi khỏi câu hoàn chỉnh. Không có đáp án trắc nghiệm — bạn tự bật ra từ phù hợp."
        items={payload.build}
        onFinish={(correct: number) => {
          setBuilt(correct);
          advance("build");
        }}
      />
    );
  }

  if (stage === "chunk") {
    return (
      <ChunkRun
        items={payload.chunks}
        onFinish={(correct: number) => {
          setChunks(correct);
          advance("chunk");
        }}
      />
    );
  }

  if (stage === "transfer") {
    return (
      <TransferRun
        items={payload.transfer}
        onFinish={(correct: number) => {
          setTransferred(correct);
          advance("transfer");
        }}
      />
    );
  }

  return (
    <Card
      className="relative overflow-hidden border-[var(--solved)]/40 bg-gradient-to-br from-[var(--card)] to-[var(--solved-wash)]/30 p-8 text-center space-y-6 shadow-[var(--shadow-float)]"
      data-testid="session-done"
    >
      <div className="flex size-16 mx-auto items-center justify-center rounded-2xl bg-[var(--solved)] text-white shadow-lg shadow-emerald-500/20">
        <Trophy size={32} />
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Hoàn thành xuất sắc buổi học hôm nay!
        </h2>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--solved)]">
          Đã ghi nhận vào Bằng chứng Năng lực
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">Ôn FSRS</span>
          <p className="text-2xl font-bold text-[var(--foreground)]">{reviewed}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">Ghép câu</span>
          <p className="text-2xl font-bold text-[var(--foreground)]">{built}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[var(--muted-foreground)]">Nói cả cụm</span>
          <p className="text-2xl font-bold text-[var(--foreground)]">{chunks}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[var(--accent)]">Tình huống mới</span>
          <p className="text-2xl font-bold text-[var(--accent)]">{transferred}</p>
        </div>
      </div>

      <p className="text-xs text-[var(--muted-foreground)] max-w-lg mx-auto leading-relaxed">
        Tiến bộ được tính bằng những câu bạn tự nói được hôm nay mà tháng trước chưa nói được.
        Hẹn gặp bạn trong buổi học tiếp theo!
      </p>
    </Card>
  );
}
