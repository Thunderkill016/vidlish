"use client";

import { useState } from "react";

import {
  learningReviewAttemptResponseSchema,
  learningReviewStartResponseSchema,
  type LearnerReviewSession,
  type LearningReviewTask,
} from "@/shared/contracts/learning-review";
import { Card } from "@/shared/ui/card";

type RecallFeedback = {
  verdict: "correct" | "incorrect";
  answer: string;
  correctionVi: string;
};

type TransferFeedback = {
  criteriaVi: string[];
  exemplarAfterAttempt: string;
  checkedCriteria: number[];
};

function primaryButton(disabled = false) {
  return `inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
    disabled
      ? "cursor-not-allowed bg-[var(--border-strong)]"
      : "bg-[var(--primary)] hover:bg-[var(--primary-hover)]"
  }`;
}

export function DelayedReviewLab() {
  const [session, setSession] = useState<LearnerReviewSession | null>(null);
  const [task, setTask] = useState<LearningReviewTask | null>(null);
  const [recallText, setRecallText] = useState("");
  const [transferText, setTransferText] = useState("");
  const [recallFeedback, setRecallFeedback] = useState<RecallFeedback | null>(
    null,
  );
  const [transferFeedback, setTransferFeedback] =
    useState<TransferFeedback | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function startOrResume() {
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/learning-lab/v2/reviews/sessions", {
        method: "POST",
      });
      const body = (await response.json()) as unknown;
      if (!response.ok) {
        throw new Error(
          response.status === 409
            ? "Chưa có mục ôn tập nào đến hạn."
            : "Vidlish chưa thể mở phiên ôn tập.",
        );
      }
      const parsed = learningReviewStartResponseSchema.parse(body);
      setSession(parsed.session);
      setTask(parsed.task);
      setRecallFeedback(null);
      setTransferFeedback(null);
      setRecallText("");
      setTransferText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Có lỗi xảy ra.");
    } finally {
      setStarting(false);
    }
  }

  async function submitRecall() {
    if (!session || !task || task.step !== "recall" || !recallText.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/learning-lab/v2/reviews/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          step: "recall",
          idempotencyKey: crypto.randomUUID(),
          response: { kind: "text", text: recallText },
        }),
      });
      const body = (await response.json()) as unknown;
      if (!response.ok) throw new Error("Vidlish chưa kiểm tra được lần nhớ lại.");
      const parsed = learningReviewAttemptResponseSchema.parse(body);
      if (
        parsed.evaluation.step !== "recall" ||
        parsed.postAttempt.step !== "recall"
      ) {
        throw new Error("Review response không khớp bước hiện tại.");
      }
      setSession(parsed.session);
      setRecallFeedback({
        verdict: parsed.evaluation.verdict,
        answer: parsed.postAttempt.answerAfterAttempt,
        correctionVi: parsed.postAttempt.correctionVi,
      });
      if (parsed.evaluation.verdict === "correct" && parsed.postAttempt.nextTask) {
        setTask(parsed.postAttempt.nextTask);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }

  function retryRecallWithoutAnswer() {
    setRecallFeedback(null);
    setRecallText("");
  }

  async function submitTransfer(checkedCriteria: number[]) {
    if (!session || !task || task.step !== "transfer" || !transferText.trim()) {
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/learning-lab/v2/reviews/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          step: "transfer",
          idempotencyKey: crypto.randomUUID(),
          response: {
            kind: "self_check",
            text: transferText,
            checkedCriteria,
          },
        }),
      });
      const body = (await response.json()) as unknown;
      if (!response.ok) throw new Error("Vidlish chưa lưu được lần transfer này.");
      const parsed = learningReviewAttemptResponseSchema.parse(body);
      if (
        parsed.evaluation.step !== "transfer" ||
        parsed.postAttempt.step !== "transfer"
      ) {
        throw new Error("Review response không khớp bước hiện tại.");
      }
      setSession(parsed.session);
      setTransferFeedback({
        criteriaVi: parsed.postAttempt.criteriaVi,
        exemplarAfterAttempt: parsed.postAttempt.exemplarAfterAttempt,
        checkedCriteria: parsed.evaluation.checkedCriteria,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Có lỗi xảy ra.");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCriterion(index: number) {
    if (!transferFeedback) return;
    setTransferFeedback((current) => {
      if (!current) return current;
      const selected = new Set(current.checkedCriteria);
      if (selected.has(index)) selected.delete(index);
      else selected.add(index);
      return { ...current, checkedCriteria: [...selected].sort((a, b) => a - b) };
    });
  }

  if (!session || !task) {
    return (
      <Card className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">Phiên thứ hai</p>
          <h2 className="mt-1 text-2xl font-bold">Kiểm tra điều còn nhớ sau delay</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
            Vidlish chỉ mở phiên này khi scheduler server xác nhận item đã đến hạn. Bước đầu không gửi đáp án xuống trước khi tự nhớ.
          </p>
        </div>
        {error ? <p role="alert" className="text-sm font-semibold text-[var(--evidence)]">{error}</p> : null}
        <button
          type="button"
          onClick={startOrResume}
          disabled={starting}
          className={primaryButton(starting)}
        >
          {starting ? "Đang mở phiên…" : "Bắt đầu ôn"}
        </button>
      </Card>
    );
  }

  if (session.status === "completed") {
    return (
      <Card className="space-y-4 border-[var(--solved)] bg-[var(--solved-wash)]">
        <p className="text-sm font-semibold text-[var(--solved)]">Delayed evidence đã lưu</p>
        <h2 className="text-2xl font-bold">Phiên ôn đã hoàn tất</h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          Vidlish đã ghi nhận một changed-context check sau thời gian trì hoãn và đã tạo lịch tiếp theo. Đây vẫn không phải tuyên bố rằng item đã “mastered”.
        </p>
      </Card>
    );
  }

  if (task.step === "recall") {
    return (
      <Card className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-[var(--accent)]">1 · Tự nhớ lại</p>
          <h2 className="mt-1 text-2xl font-bold">Gọi lại trước khi nhìn đáp án</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{task.promptVi}</p>
        </div>

        <label className="grid gap-2 text-sm font-semibold">
          Câu trả lời
          <input
            value={recallText}
            onChange={(event) => setRecallText(event.target.value)}
            disabled={Boolean(recallFeedback)}
            className="min-h-11 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
            autoComplete="off"
          />
        </label>

        {!recallFeedback ? (
          <button
            type="button"
            onClick={submitRecall}
            disabled={submitting || !recallText.trim()}
            className={primaryButton(submitting || !recallText.trim())}
          >
            Kiểm tra trí nhớ
          </button>
        ) : (
          <div className="space-y-4 rounded-xl border border-[var(--evidence-border)] bg-[var(--evidence-wash)] p-4">
            <p className="font-semibold text-[var(--evidence)]">
              {recallFeedback.verdict === "correct" ? "Nhớ lại đúng" : "Chưa nhớ đủ"}
            </p>
            <p className="text-sm leading-6">{recallFeedback.correctionVi}</p>
            <p className="text-sm">
              Đáp án sau attempt: <strong>{recallFeedback.answer}</strong>
            </p>
            {recallFeedback.verdict === "incorrect" ? (
              <button
                type="button"
                onClick={retryRecallWithoutAnswer}
                className="inline-flex min-h-10 items-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-sm font-semibold"
              >
                Thử lại không nhìn đáp án
              </button>
            ) : null}
          </div>
        )}

        {error ? <p role="alert" className="text-sm font-semibold text-[var(--evidence)]">{error}</p> : null}
      </Card>
    );
  }

  return (
    <Card className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-[var(--accent)]">2 · Dùng trong bối cảnh mới</p>
        <h2 className="mt-1 text-2xl font-bold">Không lặp lại câu nguồn</h2>
        <p className="mt-3 rounded-xl bg-[var(--muted)] p-4 text-sm leading-6">
          {task.scenarioVi}
        </p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{task.promptVi}</p>
      </div>

      <label className="grid gap-2 text-sm font-semibold">
        Câu của bạn
        <textarea
          value={transferText}
          onChange={(event) => setTransferText(event.target.value)}
          className="min-h-28 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-normal outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)]"
        />
      </label>

      {!transferFeedback ? (
        <button
          type="button"
          onClick={() => submitTransfer([])}
          disabled={submitting || !transferText.trim()}
          className={primaryButton(submitting || !transferText.trim())}
        >
          Gửi câu để tự đối chiếu
        </button>
      ) : (
        <div className="space-y-4 rounded-xl border border-[var(--border)] p-4">
          <div>
            <p className="font-semibold">Tự đối chiếu câu bạn vừa viết</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Tiêu chí và câu mẫu chỉ xuất hiện sau khi bạn đã gửi câu của mình.
            </p>
          </div>
          <div className="space-y-3">
            {transferFeedback.criteriaVi.map((criterion, index) => (
              <label key={criterion} className="flex items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={transferFeedback.checkedCriteria.includes(index)}
                  onChange={() => toggleCriterion(index)}
                  className="mt-1"
                />
                <span>{criterion}</span>
              </label>
            ))}
          </div>
          <div className="rounded-xl bg-[var(--muted)] p-3 text-sm leading-6">
            <span className="font-semibold">Câu mẫu sau attempt:</span>{" "}
            {transferFeedback.exemplarAfterAttempt}
          </div>
          <button
            type="button"
            onClick={() => submitTransfer(transferFeedback.checkedCriteria)}
            disabled={
              submitting ||
              transferFeedback.checkedCriteria.length !==
                transferFeedback.criteriaVi.length
            }
            className={primaryButton(
              submitting ||
                transferFeedback.checkedCriteria.length !==
                  transferFeedback.criteriaVi.length,
            )}
          >
            Xác nhận đủ tiêu chí
          </button>
        </div>
      )}

      {error ? <p role="alert" className="text-sm font-semibold text-[var(--evidence)]">{error}</p> : null}
    </Card>
  );
}
