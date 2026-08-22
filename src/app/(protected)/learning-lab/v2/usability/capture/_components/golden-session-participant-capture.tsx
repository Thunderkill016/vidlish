"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

import { goldenSessionUsabilityParticipantSchema } from "@/shared/contracts/golden-session-usability";
import {
  learningMeasurementSummarySchema,
  type LearningMeasurementSummary,
} from "@/shared/contracts/learning-measurement";

const STORED_LAB_VERSION = 4;

const storedSessionPointerSchema = z
  .object({
    version: z.literal(STORED_LAB_VERSION),
    blueprintId: z.string().min(1),
    sessionId: z.string().uuid().nullable(),
    started: z.boolean(),
  })
  .passthrough();

const participantCodes = ["p1", "p2", "p3", "p4", "p5"] as const;
const recognitionLevels = [
  "not_recognized",
  "partial",
  "recognized",
] as const;
const blockKinds = [
  "player",
  "support",
  "feedback",
  "retry",
  "transfer",
  "navigation",
  "other_flow",
] as const;
const severeDefectKinds = [
  "grounding",
  "answer_exposure",
  "misleading_mastery",
] as const;

type BooleanChoice = "" | "yes" | "no";
type RecognitionChoice = "" | (typeof recognitionLevels)[number];
type BlockKindChoice = "" | (typeof blockKinds)[number];
type SevereDefectChoice = "" | "none" | (typeof severeDefectKinds)[number];

function storageKey(blueprintId: string): string {
  // Must mirror LearningSessionLab's versioned key. The version check below
  // fails closed if that browser contract changes instead of guessing at old
  // state.
  return `vidlish:learning-lab:v${STORED_LAB_VERSION}:${blueprintId}`;
}

function yesNo(value: BooleanChoice): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function measurementFacts(measurement: LearningMeasurementSummary) {
  return [
    ["Session", measurement.sessionId],
    ["Trạng thái durable", measurement.status],
    ["Hoàn tất durable", measurement.completed ? "yes" : "no"],
    [
      "Changed-context attempts",
      String(measurement.transfer.attemptCount),
    ],
    [
      "Elapsed",
      measurement.observedElapsedSeconds === null
        ? "missing"
        : `${measurement.observedElapsedSeconds}s`,
    ],
    ["Runtime errors", String(measurement.runtimeErrors.length)],
  ] as const;
}

export function GoldenSessionParticipantCapture({
  blueprintId,
}: {
  blueprintId: string;
}) {
  const [measurement, setMeasurement] =
    useState<LearningMeasurementSummary | null>(null);
  const [measurementError, setMeasurementError] = useState<string | null>(null);
  const [loadingMeasurement, setLoadingMeasurement] = useState(false);

  const [participantCode, setParticipantCode] = useState<"" | (typeof participantCodes)[number]>("");
  const [platform, setPlatform] = useState<"" | "desktop" | "mobile">("");
  const [completedWithoutInstruction, setCompletedWithoutInstruction] =
    useState<BooleanChoice>("");
  const [lessonGoalRestated, setLessonGoalRestated] =
    useState<BooleanChoice>("");
  const [beforeRecognition, setBeforeRecognition] =
    useState<RecognitionChoice>("");
  const [afterRecognition, setAfterRecognition] =
    useState<RecognitionChoice>("");
  const [blocked, setBlocked] = useState<BooleanChoice>("");
  const [blockKind, setBlockKind] = useState<BlockKindChoice>("");
  const [severeDefect, setSevereDefect] = useState<SevereDefectChoice>("");

  const [buildError, setBuildError] = useState<string | null>(null);
  const [participantJson, setParticipantJson] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [browserStateCleared, setBrowserStateCleared] = useState(false);

  async function loadMeasurement() {
    setLoadingMeasurement(true);
    setMeasurement(null);
    setMeasurementError(null);
    setParticipantJson(null);
    setCopyState("idle");

    try {
      const raw = window.localStorage.getItem(storageKey(blueprintId));
      if (!raw) {
        throw new Error(
          "Chưa có Golden Session trong trình duyệt này. Hãy chạy phiên học trước rồi quay lại capture.",
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(raw);
      } catch {
        throw new Error(
          "Golden Session browser state bị hỏng. Hãy xóa state local rồi chạy lại participant này.",
        );
      }

      const pointer = storedSessionPointerSchema.safeParse(parsedJson);
      if (!pointer.success || pointer.data.blueprintId !== blueprintId) {
        throw new Error(
          "Golden Session browser state không đúng version/blueprint hiện tại. Không dùng session id cũ.",
        );
      }
      if (!pointer.data.started || !pointer.data.sessionId) {
        throw new Error(
          "Phiên Golden Session chưa bắt đầu nên chưa có durable measurement để capture.",
        );
      }

      const response = await fetch(
        `/api/learning-lab/v2/measurement?sessionId=${encodeURIComponent(pointer.data.sessionId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          "Không đọc được measurement của session hiện tại. Session có thể không thuộc tài khoản đang đăng nhập hoặc local database đã được reset.",
        );
      }

      const body = (await response.json()) as unknown;
      const parsedMeasurement = learningMeasurementSummarySchema.safeParse(body);
      if (!parsedMeasurement.success) {
        throw new Error("Measurement server trả về không đúng contract hiện tại.");
      }
      if (parsedMeasurement.data.sessionId !== pointer.data.sessionId) {
        throw new Error("Measurement không khớp session pointer của trình duyệt.");
      }

      setMeasurement(parsedMeasurement.data);
      setBrowserStateCleared(false);
    } catch (error) {
      setMeasurementError(
        error instanceof Error ? error.message : "Không thể đọc measurement.",
      );
    } finally {
      setLoadingMeasurement(false);
    }
  }

  useEffect(() => {
    void loadMeasurement();
    // The blueprint id is the complete identity of the local browser record.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blueprintId]);

  function buildParticipant() {
    setBuildError(null);
    setParticipantJson(null);
    setCopyState("idle");

    if (!measurement) {
      setBuildError("Chưa có durable measurement hợp lệ để ghép participant record.");
      return;
    }

    const completed = yesNo(completedWithoutInstruction);
    const restated = yesNo(lessonGoalRestated);
    const isBlocked = yesNo(blocked);
    if (
      !participantCode ||
      !platform ||
      completed === null ||
      restated === null ||
      !beforeRecognition ||
      !afterRecognition ||
      isBlocked === null ||
      !severeDefect
    ) {
      setBuildError(
        "Moderator phải chọn rõ mọi observation. Trang không tự điền câu trả lời tích cực từ telemetry.",
      );
      return;
    }
    if (isBlocked && !blockKind) {
      setBuildError("Participant bị blocked thì phải chọn bounded block kind.");
      return;
    }

    const candidate = {
      measurement,
      observation: {
        participantCode,
        platform,
        completedWithoutModeratorInstruction: completed,
        lessonGoalRestated: restated,
        beforeTargetRecognition: beforeRecognition,
        afterTargetRecognition: afterRecognition,
        blocked: isBlocked,
        blockKind: isBlocked ? blockKind : null,
        severeDefectKind: severeDefect === "none" ? null : severeDefect,
      },
    };

    const parsed = goldenSessionUsabilityParticipantSchema.safeParse(candidate);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setBuildError(
        `${issue?.path.join(".") || "participant"}: ${issue?.message ?? "Participant record không hợp lệ."}`,
      );
      return;
    }

    setParticipantJson(JSON.stringify(parsed.data, null, 2));
  }

  async function copyParticipant() {
    if (!participantJson) return;
    try {
      await navigator.clipboard.writeText(participantJson);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function clearGoldenBrowserState() {
    window.localStorage.removeItem(storageKey(blueprintId));
    setBrowserStateCleared(true);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--accent)]">
            1 · Durable measurement
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            Lấy đúng session của participant hiện tại
          </h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Trang tự đọc session pointer của Golden Session trong browser và gọi
            endpoint owner-scoped. Không có ô nhập session ID để tránh lấy nhầm
            hoặc đọc session của người khác.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadMeasurement()}
          disabled={loadingMeasurement}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold disabled:opacity-60"
        >
          {loadingMeasurement ? "Đang đọc measurement…" : "Tải measurement lại"}
        </button>

        {measurementError ? (
          <div
            role="alert"
            className="rounded-2xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4 text-sm leading-6"
          >
            <strong>Chưa capture được.</strong> {measurementError}
          </div>
        ) : null}

        {measurement ? (
          <dl className="grid gap-3 sm:grid-cols-2">
            {measurementFacts(measurement).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-[var(--border)] p-3">
                <dt className="text-xs font-semibold text-[var(--muted-foreground)]">
                  {label}
                </dt>
                <dd className="mt-1 break-all text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      <section className="space-y-5 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--accent)]">
            2 · Moderator observations
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            Ghi điều telemetry không thể tự biết
          </h2>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            Mọi control bắt đầu ở trạng thái chưa chọn. Durable completion hay
            exit ticket không tự biến thành observation tích cực.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold">
            <span>Participant code</span>
            <select
              aria-label="Participant code"
              value={participantCode}
              onChange={(event) =>
                setParticipantCode(
                  event.target.value as "" | (typeof participantCodes)[number],
                )
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              {participantCodes.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Platform</span>
            <select
              aria-label="Platform"
              value={platform}
              onChange={(event) =>
                setPlatform(event.target.value as "" | "desktop" | "mobile")
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              <option value="desktop">desktop</option>
              <option value="mobile">mobile</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Hoàn thành không cần moderator chỉ dẫn?</span>
            <select
              aria-label="Completed without moderator instruction"
              value={completedWithoutInstruction}
              onChange={(event) =>
                setCompletedWithoutInstruction(event.target.value as BooleanChoice)
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              <option value="yes">Có</option>
              <option value="no">Không</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Participant tự nhắc lại được mục tiêu bài?</span>
            <select
              aria-label="Lesson goal restated"
              value={lessonGoalRestated}
              onChange={(event) =>
                setLessonGoalRestated(event.target.value as BooleanChoice)
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              <option value="yes">Có</option>
              <option value="no">Không</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Recognition trước phiên</span>
            <select
              aria-label="Before target recognition"
              value={beforeRecognition}
              onChange={(event) =>
                setBeforeRecognition(event.target.value as RecognitionChoice)
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              {recognitionLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Recognition sau phiên</span>
            <select
              aria-label="After target recognition"
              value={afterRecognition}
              onChange={(event) =>
                setAfterRecognition(event.target.value as RecognitionChoice)
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              {recognitionLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Participant bị blocked?</span>
            <select
              aria-label="Participant blocked"
              value={blocked}
              onChange={(event) => {
                const next = event.target.value as BooleanChoice;
                setBlocked(next);
                if (next !== "yes") setBlockKind("");
              }}
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              <option value="yes">Có</option>
              <option value="no">Không</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold">
            <span>Block kind</span>
            <select
              aria-label="Block kind"
              value={blockKind}
              disabled={blocked !== "yes"}
              onChange={(event) =>
                setBlockKind(event.target.value as BlockKindChoice)
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal disabled:opacity-50"
            >
              <option value="">{blocked === "yes" ? "Chưa chọn" : "Không áp dụng"}</option>
              {blockKinds.map((kind) => (
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-semibold sm:col-span-2">
            <span>Severe evidence/reveal/mastery defect</span>
            <select
              aria-label="Severe defect"
              value={severeDefect}
              onChange={(event) =>
                setSevereDefect(event.target.value as SevereDefectChoice)
              }
              className="min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
            >
              <option value="">Chưa chọn</option>
              <option value="none">Không có</option>
              {severeDefectKinds.map((kind) => (
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={buildParticipant}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          Tạo participant JSON
        </button>

        {buildError ? (
          <div role="alert" className="rounded-2xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4 text-sm">
            {buildError}
          </div>
        ) : null}
      </section>

      {participantJson ? (
        <section className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-7">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              3 · Participant record
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Copy record trước khi reset
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Record này chỉ nằm trong browser. Sau khi đủ năm record thật, ghép
              chúng vào evaluator Gate 5. Không dùng record mẫu/synthetic thay người test.
            </p>
          </div>

          <textarea
            aria-label="Participant JSON"
            readOnly
            value={participantJson}
            rows={18}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 font-mono text-xs leading-5"
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copyParticipant()}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold"
            >
              Sao chép participant JSON
            </button>
            <button
              type="button"
              onClick={clearGoldenBrowserState}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border)] px-5 text-sm font-semibold"
            >
              Xóa Golden browser state
            </button>
          </div>

          {copyState === "copied" ? (
            <p role="status" className="text-sm text-[var(--muted-foreground)]">
              Đã copy participant JSON.
            </p>
          ) : null}
          {copyState === "failed" ? (
            <p role="status" className="text-sm text-[var(--muted-foreground)]">
              Browser không cho clipboard; copy trực tiếp từ ô JSON phía trên.
            </p>
          ) : null}
          {browserStateCleared ? (
            <div role="status" className="rounded-2xl border border-[var(--border)] p-4 text-sm leading-6">
              Golden browser state đã được xóa. Bây giờ dừng server và chạy lại
              <code className="mx-1">pnpm study:golden</code>
              để reset local database trước participant tiếp theo. Participant JSON phía trên vẫn còn để bạn lưu lại.
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
