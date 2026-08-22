"use client";

import { useState } from "react";

import {
  beginnerCalibrationItemsSchema,
  beginnerCalibrationResponseSchema,
  type BeginnerCalibrationResponse,
} from "@/shared/contracts/beginner-session";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/**
 * The check that makes the learner's own answers worth recording.
 *
 * Some of these words do not exist. The learner is told that plainly — the
 * check is not a trap and hiding it would only measure suspicion. What it
 * measures is whether "I know this" survives contact with something
 * unknowable, and a product that never asks has no basis for the numbers it
 * shows.
 */

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "asking"; items: string[]; index: number; answers: { item: string; claimedKnown: boolean }[] }
  | { kind: "done"; verdict: BeginnerCalibrationResponse }
  | { kind: "error" };

export function CalibrationCheck() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function start() {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/beginner/calibration");
      const parsed = beginnerCalibrationItemsSchema.safeParse(
        await response.json(),
      );
      if (!response.ok || !parsed.success) {
        setState({ kind: "error" });
        return;
      }
      setState({ kind: "asking", items: parsed.data.items, index: 0, answers: [] });
    } catch {
      setState({ kind: "error" });
    }
  }

  async function answer(claimedKnown: boolean) {
    if (state.kind !== "asking") return;
    const answers = [
      ...state.answers,
      { item: state.items[state.index], claimedKnown },
    ];
    const index = state.index + 1;
    if (index < state.items.length) {
      setState({ ...state, index, answers });
      return;
    }

    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/beginner/calibration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const parsed = beginnerCalibrationResponseSchema.safeParse(
        await response.json(),
      );
      if (!response.ok || !parsed.success) {
        setState({ kind: "error" });
        return;
      }
      setState({ kind: "done", verdict: parsed.data });
    } catch {
      setState({ kind: "error" });
    }
  }

  if (state.kind === "idle") {
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium">Kiểm tra nhanh</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Vài từ trong này <strong>không tồn tại</strong>. Nói ra trước cho bạn
          biết, vì đây không phải cái bẫy — nó để xem câu trả lời &ldquo;tôi
          biết từ này&rdquo; của bạn có đứng vững không. Không có nó thì mọi con
          số sản phẩm đưa ra đều là bạn tự chấm cho mình.
        </p>
        <Button onClick={start}>Làm kiểm tra</Button>
      </Card>
    );
  }

  if (state.kind === "loading") return <Card>Đang tính…</Card>;

  if (state.kind === "error") {
    return (
      <Card className="flex flex-col items-start gap-3">
        <p className="text-sm">Chưa chạy được kiểm tra.</p>
        <Button onClick={start}>Thử lại</Button>
      </Card>
    );
  }

  if (state.kind === "asking") {
    return (
      <Card className="flex flex-col gap-4" data-testid="calibration-question">
        <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
          {state.index + 1}/{state.items.length}
        </span>
        <p className="text-3xl font-semibold">{state.items[state.index]}</p>
        <p className="text-sm">Bạn có biết từ này nghĩa là gì không?</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => answer(true)}>Biết</Button>
          <Button variant="secondary" onClick={() => answer(false)}>
            Không biết
          </Button>
        </div>
      </Card>
    );
  }

  const percent = Math.round(state.verdict.corrected * 100);
  return (
    <Card className="flex flex-col items-start gap-3" data-testid="calibration-result">
      {state.verdict.reliable ? (
        <>
          <p className="text-sm font-medium">Câu trả lời của bạn đứng vững.</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Sau khi trừ phần đoán mò, bạn thật sự biết khoảng{" "}
            <strong>{percent}%</strong> số từ đã hỏi. Con số này khác con số bạn
            tự chấm, và nó mới là con số được ghi lại.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">
            Hôm nay chưa ghi được bằng chứng độc lập.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Bạn báo &ldquo;biết&rdquo; cho những từ không tồn tại. Không sao —
            nhưng nghĩa là hôm nay không phân biệt được từ bạn thật sự biết với
            từ bạn tưởng. Buổi học vẫn chạy; phần đánh dấu &ldquo;tự nói
            được&rdquo; thì tạm dừng cho tới lần kiểm tra sau.
          </p>
        </>
      )}
    </Card>
  );
}
