"use client";

import { useState } from "react";

import type { ClozeItem } from "@/modules/production/application/build-cloze-item";
import type { DailySession } from "@/modules/session/application/plan-daily-session";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { ClozeRun } from "./cloze-run";
import { PassageRun } from "./passage-run";

/**
 * The thirty minutes, as one thing the learner presses once.
 *
 * This replaces a dashboard that was a stack of cards — a menu of eight doors,
 * which is what the product owner meant when he said the site had become a
 * jumble. A learner with thirty minutes should not spend any of them choosing.
 *
 * The order is not arrangement, it is argument. Review first because it is the
 * only part with a deadline and a due review skipped is the retention mechanism
 * failing. Reading second because it is where words are met at all and the only
 * step that scales past the fifteen hours of authored material. Building last
 * because it works on what the first two just supplied — and because it is the
 * step this learner is blocked on, so the session ends where the difficulty is.
 */

export type SessionPayload = {
  readonly plan: DailySession;
  readonly review: readonly ClozeItem[];
  readonly build: readonly ClozeItem[];
  readonly passage: {
    readonly textId: string;
    readonly title: string;
    readonly paragraphs: readonly string[];
    readonly sourceUrl: string;
    readonly sourceLabel: string;
  } | null;
};

type Stage = "idle" | "review" | "read" | "build" | "done";

export function DailySessionRunner({ payload }: { payload: SessionPayload }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [reviewed, setReviewed] = useState(0);
  const [built, setBuilt] = useState(0);

  const order: Stage[] = payload.plan.steps.map((step) =>
    step.kind === "review" ? "review" : step.kind === "read" ? "read" : "build",
  );

  function advance(from: Stage) {
    const at = order.indexOf(from);
    setStage(order[at + 1] ?? "done");
  }

  if (payload.plan.steps.length === 0) {
    return (
      <Card className="flex flex-col gap-2" data-testid="session-empty">
        <p className="text-sm font-semibold text-[var(--accent)]">Hôm nay</p>
        <h2 className="text-xl font-bold">Chưa có gì để làm hôm nay</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          Không có từ đến hạn ôn, và chưa có câu nào vừa sức. Đây là “chưa có
          việc”, không phải “không tính ra được việc” — hai thứ khác nhau.
        </p>
      </Card>
    );
  }

  if (stage === "idle") {
    return (
      <Card className="flex flex-col gap-4" data-testid="session-start">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-[var(--accent)]">Hôm nay</p>
          <h2 className="text-2xl font-bold tracking-tight">
            {payload.plan.minutes} phút, ba bước
          </h2>
        </div>

        <ol className="flex flex-col gap-2">
          {payload.plan.steps.map((step, index) => (
            <li key={step.kind} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-bold tabular-nums">
                {index + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {step.kind === "review"
                    ? `Ôn ${step.items} từ đến hạn`
                    : step.kind === "read"
                      ? "Đọc một đoạn thật"
                      : `Ghép ${step.items} câu`}
                  <span className="ml-2 font-normal text-[var(--muted-foreground)]">
                    {step.minutes} phút
                  </span>
                </span>
                <span className="text-xs leading-5 text-[var(--muted-foreground)]">
                  {step.reasonVi}
                </span>
              </span>
            </li>
          ))}
        </ol>

        <Button onClick={() => setStage(order[0] ?? "done")}>Bắt đầu</Button>
        <p className="text-xs text-[var(--muted-foreground)]">
          Không phải chọn gì cả. Ba mươi phút mà mất mấy phút đầu để chọn làm gì
          thì đã mất mấy phút đó.
        </p>
      </Card>
    );
  }

  if (stage === "review") {
    return (
      <ClozeRun
        title="Ôn lại"
        subtitle="Những từ này đến hạn. Câu ở đây cố tình không gợi ý gì — tự nhớ ra được mới là nhớ."
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
        title="Ghép câu"
        subtitle="Một từ bị lấy đi. Không có đáp án để chọn — đây là bước bạn nói mình đang tắc."
        items={payload.build}
        onFinish={(correct: number) => {
          setBuilt(correct);
          advance("build");
        }}
      />
    );
  }

  return (
    <Card className="flex flex-col gap-3" data-testid="session-done">
      <h2 className="text-2xl font-bold">Xong buổi hôm nay.</h2>
      <p className="text-sm">
        Ôn đúng <strong>{reviewed}</strong> từ · ghép được{" "}
        <strong>{built}</strong> câu.
      </p>
      {/* Sentences produced, not minutes spent or screens visited. A count of
          what the learner did is the only number here that means anything. */}
      <p className="text-sm text-[var(--muted-foreground)]">
        Đếm bằng số câu bạn tự bật ra được, không phải số phút ngồi hay số màn
        hình đã bấm qua. Bỏ một hôm làm con số này cũ đi, không làm nó nhỏ đi.
      </p>
    </Card>
  );
}
