"use client";

import { useState } from "react";

import {
  evaluateGoldenSessionUsabilityStudy,
  type GoldenSessionUsabilityEvaluation,
} from "@/modules/learning/application/evaluate-golden-session-usability";
import { goldenSessionUsabilityStudySchema } from "@/shared/contracts/golden-session-usability";

const thresholdLabels: Record<
  keyof GoldenSessionUsabilityEvaluation["thresholds"],
  string
> = {
  completedWithoutModeratorInstruction: "Hoàn thành không cần moderator chỉ dẫn",
  lessonGoalRestated: "Nhắc lại đúng mục tiêu bài học",
  changedContextTransferAttempted: "Đã thử dùng trong ngữ cảnh mới",
  blockedParticipants: "Không có người bị chặn bởi flow/kỹ thuật",
  severeDefects: "Không có lỗi nghiêm trọng về evidence/reveal/mastery",
  medianSessionTime: "Median thời gian phiên trong 4–8 phút",
  targetRecognitionImproved: "Nhận diện target tốt hơn ở cuối",
};

function formatThreshold(
  key: keyof GoldenSessionUsabilityEvaluation["thresholds"],
  value: GoldenSessionUsabilityEvaluation["thresholds"][keyof GoldenSessionUsabilityEvaluation["thresholds"]],
) {
  if (key === "medianSessionTime" && "medianSeconds" in value) {
    if (value.medianSeconds === null) {
      return `thiếu timing: ${value.missingEvidenceCount}`;
    }
    return `${value.medianSeconds}s (yêu cầu 240–480s)`;
  }

  if ("required" in value) {
    return `${value.observed}/${value.required} yêu cầu`;
  }

  if ("requiredMaximum" in value) {
    return `${value.observed} lỗi/chặn (yêu cầu 0)`;
  }

  return "";
}

export function GoldenSessionStudyEvaluator() {
  const [input, setInput] = useState('{\n  "participants": []\n}');
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] =
    useState<GoldenSessionUsabilityEvaluation | null>(null);

  function evaluate() {
    setError(null);
    setEvaluation(null);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(input);
    } catch {
      setError("JSON không hợp lệ.");
      return;
    }

    const parsedStudy = goldenSessionUsabilityStudySchema.safeParse(parsedJson);
    if (!parsedStudy.success) {
      const firstIssue = parsedStudy.error.issues[0];
      const path = firstIssue?.path.join(".");
      setError(
        `${path ? `${path}: ` : ""}${firstIssue?.message ?? "Study record không hợp lệ."}`,
      );
      return;
    }

    setEvaluation(evaluateGoldenSessionUsabilityStudy(parsedStudy.data));
  }

  return (
    <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Gate 5 · Internal operator</p>
        <h2 className="text-2xl font-bold tracking-tight">Đánh giá usability study 5 người</h2>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
          Paste đúng 5 privacy-safe measurement summaries kèm bounded moderator observations. Dữ liệu chỉ được parse trong trang này; evaluator không ghi study record vào Supabase.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-semibold">Study JSON</span>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          spellCheck={false}
          className="min-h-80 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-xs leading-5 outline-none focus:border-[var(--primary)]"
          aria-describedby="study-json-help"
        />
      </label>
      <p id="study-json-help" className="text-xs leading-5 text-[var(--muted-foreground)]">
        Không paste tên, email, raw answer, transcript, audio/transcription hoặc free-form notes. Contract sẽ reject field ngoài schema.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={evaluate}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          Đánh giá 5 phiên
        </button>
        <span className="text-xs text-[var(--muted-foreground)]">
          Pass Gate 5 chỉ khi mọi threshold predeclared đều đạt.
        </span>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4 text-sm">
          <strong>Không thể đánh giá.</strong> {error}
        </div>
      ) : null}

      {evaluation ? (
        <div className="space-y-4" aria-live="polite">
          <div className="rounded-2xl border border-[var(--border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Kết luận usability gate</p>
            <p className="mt-1 text-2xl font-bold">
              {evaluation.passed ? "PASS" : "FAIL"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Đây chỉ là verdict cho usability pass 5 người, không phải mastery, retention, payment hay rollout readiness.
            </p>
          </div>

          <div className="grid gap-3">
            {Object.entries(evaluation.thresholds).map(([rawKey, value]) => {
              const key = rawKey as keyof GoldenSessionUsabilityEvaluation["thresholds"];
              return (
                <div
                  key={key}
                  className="flex flex-col gap-1 rounded-2xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold">{thresholdLabels[key]}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatThreshold(key, value)}
                    </p>
                  </div>
                  <span className="text-sm font-bold">{value.passed ? "PASS" : "FAIL"}</span>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-[var(--muted-foreground)]">
            Runtime-error signal: {evaluation.diagnostics.participantsWithRuntimeErrors}/5 participant(s). Signal này dùng chẩn đoán; blocked threshold vẫn do moderator xác nhận.
          </p>
        </div>
      ) : null}
    </section>
  );
}
