"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import type {
  LearnerActivityView,
  LearnerBlueprintView,
} from "@/modules/learning/application/create-learner-blueprint-view";
import {
  learningLabAttemptResponseSchema,
  type LearningLabAttemptResponse,
} from "@/shared/contracts/learning-lab";
import type { ActivityResponse } from "@/shared/contracts/lesson-v2";

const PHASE_LABELS: Record<LearnerActivityView["phase"], string> = {
  gist: "Nắm ý chính",
  practice: "Hiểu cách dùng",
  retrieve: "Tự nhớ lại",
  transfer: "Dùng trong tình huống mới",
  reflect: "Kết thúc",
};

type StoredLabState = {
  blueprintId: string;
  started: boolean;
  currentIndex: number;
  completed: boolean;
  attempts: Record<string, LearningLabAttemptResponse>;
};

function storageKey(blueprintId: string): string {
  return `vidlish:learning-lab:v2:${blueprintId}`;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function createResponse(
  activity: LearnerActivityView,
  choice: string,
  text: string,
): ActivityResponse | null {
  switch (activity.activityType) {
    case "gist_choice":
    case "meaning_in_context":
      return choice ? { kind: "choice", optionId: choice } : null;
    case "chunk_recall":
      return text.trim() ? { kind: "text", text: text.trim() } : null;
    case "guided_transfer":
      return text.trim()
        ? { kind: "self_check", text: text.trim(), checkedCriteria: [] }
        : null;
    case "exit_ticket":
      return text.trim() ? { kind: "reflection", text: text.trim() } : null;
  }
}

function ActivityInput({
  activity,
  choice,
  text,
  onChoice,
  onText,
}: {
  activity: LearnerActivityView;
  choice: string;
  text: string;
  onChoice: (value: string) => void;
  onText: (value: string) => void;
}) {
  if (
    activity.activityType === "gist_choice" ||
    activity.activityType === "meaning_in_context"
  ) {
    return (
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">{activity.promptVi}</legend>
        {activity.options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--muted)]"
          >
            <input
              type="radio"
              name={activity.id}
              value={option.id}
              checked={choice === option.id}
              onChange={() => onChoice(option.id)}
              className="mt-1 size-4"
            />
            <span>{option.textVi}</span>
          </label>
        ))}
      </fieldset>
    );
  }

  const rows = activity.activityType === "guided_transfer" ? 5 : 3;
  return (
    <div className="space-y-3">
      {activity.activityType === "guided_transfer" ? (
        <div className="rounded-xl bg-[var(--muted)] p-3 text-sm">
          <p className="font-semibold">Tình huống mới</p>
          <p className="mt-1">{activity.scenarioVi}</p>
        </div>
      ) : null}
      <label htmlFor={`${activity.id}-response`} className="block text-lg font-semibold">
        {activity.promptVi}
      </label>
      <textarea
        id={`${activity.id}-response`}
        value={text}
        rows={rows}
        onChange={(event) => onText(event.target.value)}
        autoComplete="off"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />
      {activity.activityType === "chunk_recall" && activity.hintVi ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Gợi ý: {activity.hintVi}
        </p>
      ) : null}
    </div>
  );
}

export function LearningSessionLab({
  blueprint,
  audioByActivity,
}: {
  blueprint: LearnerBlueprintView;
  audioByActivity: Record<string, string>;
}) {
  const [loaded, setLoaded] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<
    Record<string, LearningLabAttemptResponse>
  >({});
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [checkedCriteria, setCheckedCriteria] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [audioStatus, setAudioStatus] = useState("");

  const current = blueprint.activities[currentIndex];
  const currentAttempt = current ? attempts[current.id] : undefined;
  const currentTarget = useMemo(() => {
    if (!current) return undefined;
    const targetId =
      current.activityType === "meaning_in_context" ||
      current.activityType === "chunk_recall"
        ? current.targetItemId
        : current.activityType === "guided_transfer"
          ? current.targetItemIds[0]
          : undefined;
    return blueprint.targetItems.find((item) => item.id === targetId);
  }, [blueprint.targetItems, current]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey(blueprint.blueprintId));
      if (stored) {
        const parsed = JSON.parse(stored) as StoredLabState;
        if (parsed.blueprintId === blueprint.blueprintId) {
          setStarted(Boolean(parsed.started));
          setCompleted(Boolean(parsed.completed));
          setCurrentIndex(
            Math.min(
              Math.max(0, Number(parsed.currentIndex) || 0),
              blueprint.activities.length - 1,
            ),
          );
          const restored = Object.fromEntries(
            Object.entries(parsed.attempts ?? {}).flatMap(([id, value]) => {
              const result = learningLabAttemptResponseSchema.safeParse(value);
              return result.success ? [[id, result.data]] : [];
            }),
          );
          setAttempts(restored);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey(blueprint.blueprintId));
    } finally {
      setLoaded(true);
    }
  }, [blueprint.activities.length, blueprint.blueprintId]);

  useEffect(() => {
    if (!loaded) return;
    const state: StoredLabState = {
      blueprintId: blueprint.blueprintId,
      started,
      currentIndex,
      completed,
      attempts,
    };
    window.localStorage.setItem(storageKey(blueprint.blueprintId), JSON.stringify(state));
  }, [attempts, blueprint.blueprintId, completed, currentIndex, loaded, started]);

  useEffect(() => {
    setChoice("");
    setText("");
    setCheckedCriteria([]);
    setError("");
    setAudioStatus("");
  }, [currentIndex]);

  function playSyntheticClip() {
    if (!current) return;
    const narration = audioByActivity[current.id];
    if (!narration) {
      setAudioStatus("Hoạt động này không cần phát lại đoạn nguồn.");
      return;
    }
    if (!("speechSynthesis" in window)) {
      setAudioStatus("Trình duyệt này không hỗ trợ giọng đọc thử nghiệm.");
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narration);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.onstart = () => setAudioStatus("Đang phát giọng tổng hợp thử nghiệm.");
    utterance.onend = () => setAudioStatus("Đã phát xong đoạn thử nghiệm.");
    utterance.onerror = () => setAudioStatus("Không phát được đoạn thử nghiệm.");
    window.speechSynthesis.speak(utterance);
  }

  async function submitAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || submitting) return;
    const response = createResponse(current, choice, text);
    if (!response) {
      setError("Hãy trả lời trước khi kiểm tra.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const request = await fetch("/api/learning-lab/v2/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: current.id,
          idempotencyKey: crypto.randomUUID(),
          response,
        }),
      });
      const body = (await request.json()) as unknown;
      if (!request.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "object" &&
          body.error !== null &&
          "messageVi" in body.error &&
          typeof body.error.messageVi === "string"
            ? body.error.messageVi
            : "Vidlish chưa thể kiểm tra câu trả lời.";
        throw new Error(message);
      }

      const parsed = learningLabAttemptResponseSchema.parse(body);
      setAttempts((previous) => ({ ...previous, [current.id]: parsed }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Vidlish chưa thể kiểm tra câu trả lời.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function continueSession() {
    if (currentIndex >= blueprint.activities.length - 1) {
      setCompleted(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
  }

  function retryCurrent() {
    if (!current) return;
    setAttempts((previous) => {
      const next = { ...previous };
      delete next[current.id];
      return next;
    });
    setChoice("");
    setText("");
    setCheckedCriteria([]);
  }

  function resetLab() {
    window.speechSynthesis?.cancel();
    window.localStorage.removeItem(storageKey(blueprint.blueprintId));
    setStarted(false);
    setCompleted(false);
    setCurrentIndex(0);
    setAttempts({});
  }

  if (!loaded) {
    return <p className="py-12 text-center text-[var(--muted-foreground)]">Đang khôi phục phiên học…</p>;
  }

  if (!started) {
    return (
      <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Learning Model v2 · deterministic lab
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Không đọc một bài dài. Hãy hoàn thành một vòng học.
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Mẫu này dùng transcript fixture và giọng tổng hợp để kiểm chứng interaction. Nó không được trình bày như audio YouTube thật.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-[var(--muted)] p-4">
            <p className="text-sm font-semibold">Thời lượng</p>
            <p className="mt-1 text-2xl font-bold">
              {blueprint.learnerSnapshot.timeBudgetMinutes} phút
            </p>
          </div>
          <div className="rounded-xl bg-[var(--muted)] p-4">
            <p className="text-sm font-semibold">Thử thách của đoạn</p>
            <p className="mt-1 text-sm">{blueprint.videoProfile.challengeSummaryVi}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Sau phiên này, bạn có thể</h2>
          <ul className="space-y-2">
            {blueprint.outcomes.map((outcome) => (
              <li key={outcome.id} className="flex gap-3 rounded-xl border border-[var(--border)] p-3">
                <span aria-hidden="true">✓</span>
                <span>{outcome.canDoVi}</span>
              </li>
            ))}
          </ul>
        </div>

        <button
          type="button"
          onClick={() => setStarted(true)}
          className="min-h-12 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          Bắt đầu với ý chính
        </button>
      </section>
    );
  }

  if (completed) {
    return (
      <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center">
        <p className="text-sm font-semibold text-[var(--accent)]">Phiên thử nghiệm đã hoàn tất</p>
        <h1 className="text-3xl font-bold">Bạn đã nghe, nhớ lại và vận dụng.</h1>
        <p className="text-[var(--muted-foreground)]">
          Completion ở đây chỉ ghi nhận đã đi hết vòng học; nó không được coi là mastery.
        </p>
        <button
          type="button"
          onClick={resetLab}
          className="min-h-11 rounded-xl border border-[var(--border)] px-4 py-2 font-semibold hover:bg-[var(--muted)]"
        >
          Chạy lại learning lab
        </button>
      </section>
    );
  }

  if (!current) return null;

  const evidenceRange = current.evidence[0];
  const result = currentAttempt?.evaluation;
  const canRetry = result?.verdict === "incorrect";

  return (
    <div className="space-y-5">
      <nav aria-label="Tiến trình phiên học" className="overflow-x-auto">
        <ol className="flex min-w-max gap-2">
          {blueprint.activities.map((activity, index) => (
            <li
              key={activity.id}
              aria-current={index === currentIndex ? "step" : undefined}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${
                index === currentIndex
                  ? "bg-[var(--primary)] text-white"
                  : index < currentIndex
                    ? "bg-[var(--muted)] text-[var(--foreground)]"
                    : "border border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              {PHASE_LABELS[activity.phase]}
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 lg:sticky lg:top-5 lg:self-start">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Đoạn nguồn · lab fixture
            </p>
            <h2 className="mt-1 text-xl font-bold">{blueprint.source.videoTitle}</h2>
          </div>

          {evidenceRange ? (
            <div className="rounded-xl bg-[var(--muted)] p-4">
              <p className="font-mono text-sm">
                {formatTime(evidenceRange.startMs)}–{formatTime(evidenceRange.endMs)}
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Giọng đọc tổng hợp chỉ dùng để thử flow. Production phải dùng audio/video nguồn cùng canonical timestamp.
              </p>
              <button
                type="button"
                onClick={playSyntheticClip}
                className="mt-4 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 font-semibold hover:bg-[var(--background)]"
              >
                Nghe đoạn thử nghiệm
              </button>
              <p className="mt-2 text-sm" aria-live="polite">
                {audioStatus}
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-[var(--muted)] p-4 text-sm">
              Bước này dùng nội dung bạn đã học, không phát lại evidence mặc định.
            </p>
          )}

          <p className="text-xs text-[var(--muted-foreground)]">
            Đáp án và transcript viết ra không được gửi xuống trình duyệt trước attempt.
          </p>
        </aside>

        <main className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Bước {currentIndex + 1}/{blueprint.activities.length} · {PHASE_LABELS[current.phase]}
            </p>
            <h1 className="text-2xl font-bold">{current.instructionVi}</h1>
          </div>

          {!result ? (
            <form className="space-y-5" onSubmit={submitAttempt}>
              <ActivityInput
                activity={current}
                choice={choice}
                text={text}
                onChoice={setChoice}
                onText={setText}
              />
              {error ? (
                <p className="rounded-xl bg-red-950/30 p-3 text-sm" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={submitting}
                className="min-h-12 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
              >
                {submitting ? "Đang kiểm tra…" : "Gửi attempt"}
              </button>
            </form>
          ) : (
            <section className="space-y-5" aria-live="polite">
              <div className="rounded-xl bg-[var(--muted)] p-4">
                <p className="text-sm font-semibold uppercase tracking-wide">
                  {result.verdict === "correct"
                    ? "Đúng"
                    : result.verdict === "incorrect"
                      ? "Chưa đúng"
                      : result.verdict === "self_check"
                        ? "Tự kiểm tra"
                        : "Tự phản ánh"}
                </p>
                <p className="mt-2 font-semibold">{result.goalVi}</p>
                <p className="mt-2 text-sm">{result.evidenceVi}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Bước tiếp theo: {result.nextStepVi}
                </p>
              </div>

              {currentAttempt?.hydratedEvidence.length ? (
                <div className="space-y-2 rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">Evidence từ transcript canonical</p>
                  {currentAttempt.hydratedEvidence.map((evidence) => (
                    <blockquote key={evidence.segmentId} className="border-l-2 border-[var(--accent)] pl-3 text-sm">
                      <span className="font-mono text-xs text-[var(--accent)]">
                        {formatTime(evidence.startMs)}
                      </span>{" "}
                      “{evidence.text}”
                    </blockquote>
                  ))}
                </div>
              ) : null}

              {currentTarget && current.activityType === "meaning_in_context" ? (
                <div className="space-y-2 rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xl font-bold">{currentTarget.surfaceForm}</p>
                  <p>{currentTarget.contextualMeaningVi}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Chức năng: {currentTarget.communicativeFunctionVi} · Register: {currentTarget.register}
                  </p>
                  {currentTarget.pronunciationNoteVi ? (
                    <p className="text-sm">Âm thanh: {currentTarget.pronunciationNoteVi}</p>
                  ) : null}
                </div>
              ) : null}

              {result.verdict === "self_check" ? (
                <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">Tự đối chiếu sau khi đã viết</p>
                  {currentAttempt.selfCheckCriteriaVi?.map((criterion, index) => (
                    <label key={criterion} className="flex min-h-11 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checkedCriteria.includes(index)}
                        onChange={() =>
                          setCheckedCriteria((previous) =>
                            previous.includes(index)
                              ? previous.filter((value) => value !== index)
                              : [...previous, index],
                          )
                        }
                        className="mt-1 size-4"
                      />
                      <span>{criterion}</span>
                    </label>
                  ))}
                  {result.exemplarAfterAttempt ? (
                    <p className="rounded-lg bg-[var(--muted)] p-3 text-sm">
                      <span className="font-semibold">Ví dụ mới, không phải câu trong video:</span>{" "}
                      {result.exemplarAfterAttempt}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                {canRetry ? (
                  <button
                    type="button"
                    onClick={retryCurrent}
                    className="min-h-11 flex-1 rounded-xl border border-[var(--border)] px-4 py-2 font-semibold hover:bg-[var(--muted)]"
                  >
                    Thử lại
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={continueSession}
                  className="min-h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 py-2 font-semibold text-white hover:bg-[var(--primary-hover)]"
                >
                  {currentIndex === blueprint.activities.length - 1
                    ? "Hoàn tất phiên"
                    : "Tiếp tục"}
                </button>
              </div>
            </section>
          )}
        </main>
      </div>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Lab chỉ lưu progress/feedback trong trình duyệt và không lưu câu trả lời riêng tư. Migration server-side đã được thiết kế riêng cho v2 production.
      </p>
    </div>
  );
}
