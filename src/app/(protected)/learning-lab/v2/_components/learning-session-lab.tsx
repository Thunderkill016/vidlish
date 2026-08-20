"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { LearningSupportCopyByActivity } from "@/adapters/fake/fixture-learning-runtime-policy";
import type {
  LearnerActivityView,
  LearnerBlueprintView,
} from "@/modules/learning/application/create-learner-blueprint-view";
import {
  appendLearningAttempt,
  confirmLearningSelfCheck,
  createEmptyLearningActivityProgress,
  highestOpenedSupportStep,
  latestLearningAttempt,
  learningActivityCompletionState,
  openLearningSupportStep,
  recordLearningPlayback,
  requestLearningSelfCheckCorrection,
  type LearningActivityRuntimeProgress,
} from "@/modules/learning/application/learning-runtime-progress";
import {
  learningLabAttemptResponseSchema,
  learningLabSessionResponseSchema,
  learningLabSupportEventResponseSchema,
  type LearningLabAttemptResponse,
} from "@/shared/contracts/learning-lab";
import type { VerifiedLearningMedia } from "@/shared/contracts/learning-media";
import {
  canUseSupportStep,
  supportStepSchema,
  type LearningRuntimePolicyV2,
  type SupportStep,
} from "@/shared/contracts/learning-policy-v2";
import type { ActivityResponse, LessonSession } from "@/shared/contracts/lesson-v2";
import type { PersistedLearningSupportStep } from "@/shared/contracts/privacy-safe-learning-evidence";
import { YouTubeEvidencePlayer } from "./youtube-evidence-player";

const PHASE_LABELS: Record<LearnerActivityView["phase"], string> = {
  gist: "Nắm ý chính",
  practice: "Hiểu cách dùng",
  retrieve: "Tự nhớ lại",
  transfer: "Dùng trong tình huống mới",
  reflect: "Kết thúc",
};

const SUPPORT_LABELS: Record<SupportStep, string> = {
  replay: "Nghe lại đoạn",
  context_hint: "Gợi ý ngữ cảnh",
  keyword_hint: "Gợi ý từ khóa",
  english_caption: "Phụ đề tiếng Anh",
  chunk_boundaries: "Chia cụm câu nói",
  vietnamese_meaning: "Nghĩa tiếng Việt",
  slower_playback: "Phát chậm hơn",
};

type StoredLabState = {
  version: 4;
  blueprintId: string;
  sessionId: string | null;
  started: boolean;
  currentIndex: number;
  completed: boolean;
  progressByActivity: Record<string, LearningActivityRuntimeProgress>;
};

function storageKey(blueprintId: string): string {
  return `vidlish:learning-lab:v4:${blueprintId}`;
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
  if (
    activity.activityType === "gist_choice" ||
    activity.activityType === "meaning_in_context"
  ) {
    return choice ? { kind: "choice", optionId: choice } : null;
  }
  if (activity.activityType === "chunk_recall") {
    return text.trim() ? { kind: "text", text: text.trim() } : null;
  }
  if (activity.activityType === "guided_transfer") {
    return text.trim()
      ? { kind: "self_check", text: text.trim(), checkedCriteria: [] }
      : null;
  }
  return text.trim() ? { kind: "reflection", text: text.trim() } : null;
}

function restoreProgress(value: unknown): LearningActivityRuntimeProgress {
  const empty = createEmptyLearningActivityProgress();
  if (!value || typeof value !== "object") return empty;
  const candidate = value as Partial<LearningActivityRuntimeProgress>;
  const attempts = Array.isArray(candidate.attempts)
    ? candidate.attempts.flatMap((attempt) => {
        const parsed = learningLabAttemptResponseSchema.safeParse(attempt);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  const openedSupportSteps = Array.isArray(candidate.openedSupportSteps)
    ? candidate.openedSupportSteps.flatMap((step) => {
        const parsed = supportStepSchema.safeParse(step);
        return parsed.success ? [parsed.data] : [];
      })
    : [];

  return {
    attempts,
    openedSupportSteps: [...new Set(openedSupportSteps)],
    playCount:
      typeof candidate.playCount === "number" && candidate.playCount >= 0
        ? Math.floor(candidate.playCount)
        : 0,
    selfCheckConfirmed: Boolean(candidate.selfCheckConfirmed),
    selfCheckCorrectionRequested: Boolean(
      candidate.selfCheckCorrectionRequested,
    ),
  };
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
  onChoice(value: string): void;
  onText(value: string): void;
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

  return (
    <div className="space-y-3">
      {activity.activityType === "guided_transfer" ? (
        <div className="rounded-xl bg-[var(--muted)] p-3 text-sm">
          <p className="font-semibold">Tình huống mới</p>
          <p className="mt-1">{activity.scenarioVi}</p>
        </div>
      ) : null}
      <label
        htmlFor={`${activity.id}-response`}
        className="block text-lg font-semibold"
      >
        {activity.promptVi}
      </label>
      <textarea
        id={`${activity.id}-response`}
        value={text}
        rows={activity.activityType === "guided_transfer" ? 5 : 3}
        onChange={(event) => onText(event.target.value)}
        autoComplete="off"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />
    </div>
  );
}

function supportMessage(
  step: SupportStep,
  activityId: string,
  supportCopy: LearningSupportCopyByActivity,
  attempt: LearningLabAttemptResponse | undefined,
): string {
  if (step === "replay") return "Bạn đã chủ động nghe lại đoạn nguồn.";
  if (step === "english_caption") {
    return "Phụ đề tiếng Anh đã được mở trong trình phát.";
  }
  if (step === "chunk_boundaries") {
    return (
      attempt?.postAttemptSupport.chunkBoundaryText ??
      "Vidlish chưa có đủ evidence để chia cụm câu nói này."
    );
  }
  if (step === "vietnamese_meaning") {
    return (
      attempt?.postAttemptSupport.targetItem?.contextualMeaningVi ??
      "Vidlish chưa có nghĩa theo ngữ cảnh đã kiểm chứng."
    );
  }
  if (step === "slower_playback") return "Fixture này chưa bật phát chậm.";
  return supportCopy[activityId]?.[step] ?? "Không có gợi ý bổ sung.";
}

function blockerMessage(blocker: string | undefined): string {
  if (blocker === "ATTEMPT_REQUIRED") return "Hãy trả lời trước khi tiếp tục.";
  if (blocker === "RETRY_REQUIRED") {
    return "Sau correction, bạn cần thử lại trước khi tiếp tục.";
  }
  if (blocker === "TRANSFER_REQUIRED") {
    return "Hãy hoàn thành tình huống mới trước khi tiếp tục.";
  }
  if (blocker === "SELF_CHECK_REQUIRED") {
    return "Hãy đối chiếu đủ tiêu chí hoặc chỉnh lại toàn bộ câu.";
  }
  return "Bước này chưa đủ evidence để hoàn thành.";
}

export function LearningSessionLab({
  blueprint,
  media,
  policy,
  supportCopy,
  jobId,
}: {
  blueprint: LearnerBlueprintView;
  media: VerifiedLearningMedia;
  policy: LearningRuntimePolicyV2;
  supportCopy: LearningSupportCopyByActivity;
  /**
   * Which lesson to open a session on. Omitted by the fixture lab, which has no
   * learner lesson behind it; the server falls back to its demo version then.
   *
   * A job id rather than a lesson version id: the server resolves the version
   * itself, so the browser never names the row it wants to write against.
   */
  jobId?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progressByActivity, setProgressByActivity] = useState<
    Record<string, LearningActivityRuntimeProgress>
  >({});
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [checkedCriteria, setCheckedCriteria] = useState<number[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supporting, setSupporting] = useState(false);
  const [error, setError] = useState("");

  const current = blueprint.activities[currentIndex];
  const currentPolicy = current
    ? policy.activityPolicies.find((item) => item.activityId === current.id)
    : undefined;
  const currentProgress = current
    ? progressByActivity[current.id] ?? createEmptyLearningActivityProgress()
    : createEmptyLearningActivityProgress();
  const currentAttempt = latestLearningAttempt(currentProgress);
  const result = currentAttempt?.evaluation;
  const completionState = currentPolicy
    ? learningActivityCompletionState(currentPolicy, currentProgress)
    : null;
  const evidenceRange = current?.evidence[0];
  const captionControlAllowed = currentProgress.openedSupportSteps.includes(
    "english_caption",
  );
  // Offered only if the policy would actually permit it. Picking the first
  // unopened step regardless put an answer-revealing button in front of a
  // learner who had not attempted anything: the server refused it, so the
  // button did nothing, and the promise that text is earned was broken on
  // screen even though the data stayed honest.
  const nextSupportStep = currentPolicy?.support
    ? currentPolicy.support.steps.find(
        (step) =>
          !currentProgress.openedSupportSteps.includes(step) &&
          canUseSupportStep(
            currentPolicy.support!,
            step,
            currentProgress.attempts.length,
          ),
      )
    : undefined;
  const allCriteriaSelected = Boolean(
    currentAttempt?.selfCheckCriteriaVi?.length &&
      checkedCriteria.length === currentAttempt.selfCheckCriteriaVi.length,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(
          storageKey(blueprint.blueprintId),
        );
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<StoredLabState>;
          if (
            parsed.version === 4 &&
            parsed.blueprintId === blueprint.blueprintId
          ) {
            setSessionId(
              typeof parsed.sessionId === "string" ? parsed.sessionId : null,
            );
            setStarted(Boolean(parsed.started));
            setCompleted(Boolean(parsed.completed));
            setCurrentIndex(
              Math.min(
                Math.max(0, Number(parsed.currentIndex) || 0),
                blueprint.activities.length - 1,
              ),
            );
            setProgressByActivity(
              Object.fromEntries(
                Object.entries(parsed.progressByActivity ?? {}).map(
                  ([activityId, value]) => [activityId, restoreProgress(value)],
                ),
              ),
            );
          }
        }
        window.localStorage.removeItem(
          `vidlish:learning-lab:v3:${blueprint.blueprintId}`,
        );
      } catch {
        window.localStorage.removeItem(storageKey(blueprint.blueprintId));
      } finally {
        setLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [blueprint.activities.length, blueprint.blueprintId]);

  useEffect(() => {
    if (!loaded) return;
    const state: StoredLabState = {
      version: 4,
      blueprintId: blueprint.blueprintId,
      sessionId,
      started,
      currentIndex,
      completed,
      progressByActivity,
    };
    window.localStorage.setItem(
      storageKey(blueprint.blueprintId),
      JSON.stringify(state),
    );
  }, [
    blueprint.blueprintId,
    completed,
    currentIndex,
    loaded,
    progressByActivity,
    sessionId,
    started,
  ]);

  function updateProgressForActivity(
    activityId: string,
    updater: (
      progress: LearningActivityRuntimeProgress,
    ) => LearningActivityRuntimeProgress,
  ) {
    setProgressByActivity((previous) => ({
      ...previous,
      [activityId]: updater(
        previous[activityId] ?? createEmptyLearningActivityProgress(),
      ),
    }));
  }

  function updateProgress(
    updater: (
      progress: LearningActivityRuntimeProgress,
    ) => LearningActivityRuntimeProgress,
  ) {
    if (!current) return;
    updateProgressForActivity(current.id, updater);
  }

  function clearDraft() {
    setChoice("");
    setText("");
    setCheckedCriteria([]);
    setError("");
  }

  function activityIndexForSession(session: LessonSession): number {
    const index = blueprint.activities.findIndex(
      (activity) => activity.id === session.currentActivityId,
    );
    return index >= 0 ? index : 0;
  }

  async function startOrResumeSession(): Promise<string> {
    const request = await fetch("/api/learning-lab/v2/sessions", {
      method: "POST",
      headers: jobId ? { "Content-Type": "application/json" } : {},
      body: jobId ? JSON.stringify({ jobId }) : undefined,
    });
    const body = (await request.json()) as unknown;
    if (!request.ok) throw new Error("Vidlish chưa thể mở phiên học.");
    const parsed = learningLabSessionResponseSchema.parse(body);
    setSessionId(parsed.session.id);
    setCurrentIndex(activityIndexForSession(parsed.session));
    setCompleted(parsed.session.status === "completed");
    return parsed.session.id;
  }

  async function beginSession() {
    if (starting) return;
    setStarting(true);
    setError("");
    try {
      await startOrResumeSession();
      setStarted(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Vidlish chưa thể mở phiên học.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function sendAttempt(
    response: ActivityResponse,
    idempotencyKey = crypto.randomUUID(),
  ): Promise<LearningLabAttemptResponse> {
    if (!current) throw new Error("Không tìm thấy activity hiện tại.");
    const activeSessionId = sessionId ?? (await startOrResumeSession());
    const request = await fetch("/api/learning-lab/v2/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeSessionId,
        activityId: current.id,
        idempotencyKey,
        response,
      }),
    });
    const body = (await request.json()) as unknown;
    if (!request.ok) throw new Error("Vidlish chưa thể kiểm tra câu trả lời.");
    const parsed = learningLabAttemptResponseSchema.parse(body);
    if (!parsed.persistedAttempt || !parsed.session) {
      throw new Error("Attempt chưa được lưu bền vững.");
    }
    setSessionId(parsed.session.id);
    return parsed;
  }

  async function sendSupportEvent(
    activityId: string,
    event:
      | { eventKind: "playback" }
      | {
          eventKind: "support_opened";
          supportStep: PersistedLearningSupportStep;
        },
  ) {
    const activeSessionId = sessionId ?? (await startOrResumeSession());
    const request = await fetch("/api/learning-lab/v2/support-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: activeSessionId,
        activityId,
        idempotencyKey: crypto.randomUUID(),
        ...event,
      }),
    });
    const body = (await request.json()) as unknown;
    if (!request.ok) {
      throw new Error("Vidlish chưa thể lưu evidence hỗ trợ.");
    }
    return learningLabSupportEventResponseSchema.parse(body);
  }

  async function recordPlaybackEvidence() {
    if (!current || !currentPolicy) return;
    const activityId = current.id;
    const policyAtPlay = currentPolicy;
    try {
      const persisted = await sendSupportEvent(activityId, {
        eventKind: "playback",
      });
      const ordinal = persisted.event.playbackOrdinal ?? 0;
      updateProgressForActivity(activityId, (progress) => {
        let confirmed = progress;
        while (confirmed.playCount < ordinal) {
          confirmed = recordLearningPlayback(confirmed, policyAtPlay);
        }
        return confirmed;
      });
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Đoạn đã phát nhưng Vidlish chưa lưu được evidence nghe.",
      );
    }
  }

  async function submitAttempt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current || !currentPolicy || submitting) return;
    if (
      currentProgress.attempts.length >=
      currentPolicy.retry.maxAttemptsPerSession
    ) {
      setError("Bước này đã đạt giới hạn attempt của phiên.");
      return;
    }
    const response = createResponse(current, choice, text);
    if (!response) {
      setError("Hãy trả lời trước khi kiểm tra.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const parsed = await sendAttempt(response);
      updateProgress((progress) => appendLearningAttempt(progress, parsed));
      setRetrying(false);
      setCheckedCriteria([]);
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

  function retryCurrent() {
    if (result?.verdict === "self_check") {
      updateProgress(requestLearningSelfCheckCorrection);
    }
    clearDraft();
    setRetrying(true);
  }

  async function confirmSelfCheck() {
    if (
      !current ||
      current.activityType !== "guided_transfer" ||
      !allCriteriaSelected ||
      !text.trim() ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const parsed = await sendAttempt({
        kind: "self_check",
        text: text.trim(),
        checkedCriteria,
      });
      updateProgress((progress) =>
        confirmLearningSelfCheck(appendLearningAttempt(progress, parsed)),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Vidlish chưa thể lưu xác nhận transfer.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function continueSession() {
    if (!currentPolicy || !currentAttempt?.session) return;
    const state = learningActivityCompletionState(
      currentPolicy,
      currentProgress,
    );
    if (!state.canContinue) {
      setError(blockerMessage(state.blockers[0]));
      return;
    }

    const nextActivity = blueprint.activities[currentIndex + 1];
    if (!nextActivity) {
      if (currentAttempt.session.status !== "completed") {
        setError("Server chưa xác nhận phiên học đã hoàn tất.");
        return;
      }
      clearDraft();
      setRetrying(false);
      setCompleted(true);
      return;
    }

    if (currentAttempt.session.currentActivityId !== nextActivity.id) {
      setError("Server chưa xác nhận activity tiếp theo.");
      return;
    }

    clearDraft();
    setRetrying(false);
    setCurrentIndex((index) => index + 1);
  }

  async function openNextSupport() {
    if (
      !current ||
      !currentPolicy?.support ||
      !nextSupportStep ||
      supporting
    ) {
      return;
    }
    if (nextSupportStep === "replay") {
      setError("Nhấn Phát đoạn lần thứ hai để dùng hỗ trợ Nghe lại đoạn.");
      return;
    }
    if (
      !canUseSupportStep(
        currentPolicy.support,
        nextSupportStep,
        currentProgress.attempts.length,
      )
    ) {
      setError("Hãy thử trả lời trước khi mở mức hỗ trợ này.");
      return;
    }

    setSupporting(true);
    setError("");
    const activityId = current.id;
    try {
      const persisted = await sendSupportEvent(activityId, {
        eventKind: "support_opened",
        supportStep: nextSupportStep,
      });
      if (persisted.event.supportStep !== nextSupportStep) {
        throw new Error("Server trả về support evidence không khớp.");
      }
      updateProgressForActivity(activityId, (progress) =>
        openLearningSupportStep(progress, nextSupportStep),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Vidlish chưa thể mở mức hỗ trợ này.",
      );
    } finally {
      setSupporting(false);
    }
  }

  function resetLab() {
    window.localStorage.removeItem(storageKey(blueprint.blueprintId));
    clearDraft();
    setSessionId(null);
    setStarted(false);
    setCompleted(false);
    setCurrentIndex(0);
    setProgressByActivity({});
    setRetrying(false);
  }

  if (!loaded) {
    return <p className="py-12 text-center">Đang khôi phục phiên học…</p>;
  }

  if (!started) {
    return (
      <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Phiên học thử · khoảng {blueprint.learnerSnapshot.timeBudgetMinutes} phút
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Nghe rõ một đoạn thật. Dùng được một cụm thật.
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Bạn sẽ nghe trước khi thấy phụ đề, nhận hỗ trợ từng mức, tự nhớ lại
          và dùng ngôn ngữ trong một tình huống mới.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="rounded-xl bg-[var(--muted)] p-4">
            Nhận ra chủ đề của đoạn mở đầu mà chưa cần transcript.
          </p>
          <p className="rounded-xl bg-[var(--muted)] p-4">
            Giới thiệu mình thuộc một nhóm trong tình huống công việc mới.
          </p>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        <button
          type="button"
          onClick={beginSession}
          disabled={starting}
          className="min-h-12 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {starting ? "Đang mở phiên…" : "Bắt đầu nghe không phụ đề"}
        </button>
      </section>
    );
  }

  if (completed) {
    const totalAttempts = Object.values(progressByActivity).reduce(
      (sum, progress) => sum + progress.attempts.length,
      0,
    );
    const supportCount = Object.values(progressByActivity).reduce(
      (sum, progress) => sum + progress.openedSupportSteps.length,
      0,
    );
    const recall = latestLearningAttempt(
      progressByActivity.activity_recall ??
        createEmptyLearningActivityProgress(),
    );
    const transfer = progressByActivity.activity_transfer;

    return (
      <section className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <p className="font-semibold text-[var(--accent)]">
            Phiên đầu đã hoàn tất
          </p>
          <h1 className="text-3xl font-bold">
            Bạn đã tạo được evidence cho lần học hôm nay.
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Đây là completion của phiên đầu, không phải tuyên bố đã thành thạo.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="rounded-xl bg-[var(--muted)] p-4">
            Attempt đã thực hiện: <strong>{totalAttempts}</strong>
          </p>
          <p className="rounded-xl bg-[var(--muted)] p-4">
            Mức hỗ trợ đã mở: <strong>{supportCount}</strong>
          </p>
          <p className="rounded-xl border border-[var(--border)] p-4">
            {recall?.evaluation.verdict === "correct"
              ? "Đã nhớ lại đúng trong phiên này"
              : "Đã thử; cần đưa trở lại khi ôn"}
          </p>
          <p className="rounded-xl border border-[var(--border)] p-4">
            {transfer?.selfCheckConfirmed
              ? "Đã viết và tự đối chiếu đủ tiêu chí"
              : "Đã thử; chưa đủ tiêu chí xác nhận"}
          </p>
        </div>
        <p className="rounded-xl border border-[var(--accent)] p-4 text-sm">
          Vidlish cần kiểm tra lại bằng input hoặc bối cảnh khác sau một khoảng
          thời gian trước khi có thể nói năng lực này ổn định.
        </p>
        <button
          type="button"
          onClick={resetLab}
          className="min-h-11 w-full rounded-xl border border-[var(--border)] px-4 py-2 font-semibold"
        >
          Chạy lại phiên học thử
        </button>
      </section>
    );
  }

  if (!current || !currentPolicy) {
    return <p role="alert">Runtime policy không khớp với lesson fixture.</p>;
  }

  const assistedCompletion = completionState?.assistedCompletion ?? false;
  const showAttemptForm = !result || retrying;
  const showCanonicalEvidence =
    assistedCompletion ||
    currentProgress.openedSupportSteps.includes("english_caption") ||
    currentProgress.openedSupportSteps.includes("chunk_boundaries");
  const showTargetExplanation =
    assistedCompletion ||
    (result?.verdict === "correct" &&
      current.activityType === "meaning_in_context") ||
    currentProgress.openedSupportSteps.includes("vietnamese_meaning");
  const supportLevel = highestOpenedSupportStep(
    currentPolicy,
    currentProgress,
  );

  return (
    <div className="space-y-5">
      <nav aria-label="Tiến trình phiên học" className="overflow-x-auto">
        <ol className="flex min-w-max gap-2">
          {blueprint.activities.map((activity, index) => (
            <li
              key={activity.id}
              aria-current={index === currentIndex ? "step" : undefined}
              className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-semibold"
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
              Đoạn nguồn
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {blueprint.source.videoTitle}
            </h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {blueprint.source.channelName}
            </p>
          </div>

          {evidenceRange ? (
            <div className="space-y-3 rounded-xl bg-[var(--muted)] p-4">
              <p className="font-mono text-sm">
                {formatTime(evidenceRange.startMs)}–
                {formatTime(evidenceRange.endMs)}
              </p>
              <YouTubeEvidencePlayer
                key={`${current.id}:${captionControlAllowed}`}
                videoId={media.videoId}
                videoTitle={blueprint.source.videoTitle}
                evidence={evidenceRange}
                captionControlAllowed={captionControlAllowed}
                onPlay={() => void recordPlaybackEvidence()}
              />
            </div>
          ) : (
            <p className="rounded-xl bg-[var(--muted)] p-4 text-sm">
              Bước này dùng ngôn ngữ vừa học trong một tình huống mới.
            </p>
          )}

          <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold">Hỗ trợ từng mức</p>
              <span className="text-xs text-[var(--muted-foreground)]">
                {supportLevel ? SUPPORT_LABELS[supportLevel] : "Chưa dùng"}
              </span>
            </div>
            {currentProgress.openedSupportSteps.map((step) => (
              <div
                key={step}
                className="rounded-lg bg-[var(--muted)] p-3 text-sm"
              >
                <p className="font-semibold">{SUPPORT_LABELS[step]}</p>
                <p className="mt-1">
                  {supportMessage(
                    step,
                    current.id,
                    supportCopy,
                    currentAttempt,
                  )}
                </p>
              </div>
            ))}
            {nextSupportStep === "replay" ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nghe lần đầu, sau đó nhấn Phát đoạn lần thứ hai để mở “Nghe lại
                đoạn”.
              </p>
            ) : nextSupportStep ? (
              <button
                type="button"
                onClick={() => void openNextSupport()}
                disabled={supporting}
                className="min-h-11 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {supporting
                  ? "Đang lưu hỗ trợ…"
                  : `Mở ${SUPPORT_LABELS[nextSupportStep].toLocaleLowerCase("vi")}`}
              </button>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                {currentPolicy.support
                  ? "Bạn đã mở hết support ladder của bước này."
                  : "Bước này không có answer reveal trước khi bạn tự viết."}
              </p>
            )}
          </div>
        </aside>

        <main className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-[var(--accent)]">
              Bước {currentIndex + 1}/{blueprint.activities.length} ·{" "}
              {PHASE_LABELS[current.phase]}
            </p>
            <h1 className="mt-2 text-2xl font-bold">
              {current.instructionVi}
            </h1>
          </div>

          {showAttemptForm ? (
            <form className="space-y-5" onSubmit={submitAttempt}>
              <ActivityInput
                activity={current}
                choice={choice}
                text={text}
                onChoice={setChoice}
                onText={setText}
              />
              {error ? <p role="alert">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="min-h-12 w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {submitting
                  ? "Đang kiểm tra…"
                  : retrying
                    ? "Gửi lần thử lại"
                    : "Kiểm tra câu trả lời"}
              </button>
            </form>
          ) : result && currentAttempt ? (
            <section className="space-y-5" aria-live="polite">
              <div className="rounded-xl bg-[var(--muted)] p-4">
                <p className="font-semibold">
                  {result.verdict === "correct"
                    ? "Đúng"
                    : result.verdict === "incorrect"
                      ? "Chưa đúng"
                      : result.verdict === "self_check"
                        ? "Tự đối chiếu"
                        : "Tự phản ánh"}
                </p>
                <p className="mt-2 font-semibold">{result.goalVi}</p>
                <p className="mt-2 text-sm">{result.evidenceVi}</p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Bước tiếp theo: {result.nextStepVi}
                </p>
              </div>

              {showCanonicalEvidence &&
              currentAttempt.hydratedEvidence.length ? (
                <div className="space-y-2 rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">Đối chiếu với câu nguồn</p>
                  {currentAttempt.hydratedEvidence.map((evidence) => (
                    <blockquote
                      key={evidence.segmentId}
                      className="border-l-2 border-[var(--accent)] pl-3 text-sm"
                    >
                      {formatTime(evidence.startMs)} “{evidence.text}”
                    </blockquote>
                  ))}
                </div>
              ) : null}

              {showTargetExplanation &&
              currentAttempt.postAttemptSupport.targetItem ? (
                <div className="space-y-2 rounded-xl border border-[var(--border)] p-4">
                  <p className="text-xl font-bold">
                    {currentAttempt.postAttemptSupport.targetItem.surfaceForm}
                  </p>
                  <p>
                    {
                      currentAttempt.postAttemptSupport.targetItem
                        .contextualMeaningVi
                    }
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Chức năng:{" "}
                    {
                      currentAttempt.postAttemptSupport.targetItem
                        .communicativeFunctionVi
                    }
                    {" · "}Register:{" "}
                    {currentAttempt.postAttemptSupport.targetItem.register}
                  </p>
                </div>
              ) : null}

              {result.verdict === "correct" && result.reveal?.answer ? (
                <p className="rounded-xl border border-[var(--border)] p-4 text-sm">
                  <strong>Đáp án đã tự nhớ lại:</strong> {result.reveal.answer}
                </p>
              ) : null}

              {assistedCompletion && result.reveal?.answer ? (
                <p className="rounded-xl border border-amber-700 p-4 text-sm">
                  Hoàn thành có hỗ trợ: {result.reveal.answer}. Kết quả này không
                  được tính là tự nhớ lại thành công.
                </p>
              ) : null}

              {result.verdict === "self_check" ? (
                <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">Tự đối chiếu câu bạn vừa viết</p>
                  {currentAttempt.selfCheckCriteriaVi?.map(
                    (criterion, index) => (
                      <label
                        key={criterion}
                        className="flex min-h-11 items-start gap-3"
                      >
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
                    ),
                  )}
                  {result.exemplarAfterAttempt ? (
                    <p className="rounded-lg bg-[var(--muted)] p-3 text-sm">
                      <strong>Ví dụ mới, không phải câu trong video:</strong>{" "}
                      {result.exemplarAfterAttempt}
                    </p>
                  ) : null}
                  {currentProgress.selfCheckConfirmed ? (
                    <p className="font-semibold">
                      Đã xác nhận đủ tiêu chí cho lần thử này.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={retryCurrent}
                        className="min-h-11 rounded-xl border border-[var(--border)] px-3 py-2 font-semibold"
                      >
                        Chỉnh lại toàn bộ câu
                      </button>
                      <button
                        type="button"
                        onClick={() => void confirmSelfCheck()}
                        disabled={!allCriteriaSelected || submitting}
                        className="min-h-11 rounded-xl bg-[var(--primary)] px-3 py-2 font-semibold text-white disabled:opacity-50"
                      >
                        {submitting ? "Đang lưu…" : "Xác nhận đủ tiêu chí"}
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {error ? <p role="alert">{error}</p> : null}
              <div className="flex flex-col gap-3 sm:flex-row">
                {result.verdict === "incorrect" && !assistedCompletion ? (
                  <button
                    type="button"
                    onClick={retryCurrent}
                    className="min-h-11 flex-1 rounded-xl border border-[var(--border)] px-4 py-2 font-semibold"
                  >
                    Thử lại
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={continueSession}
                  disabled={!completionState?.canContinue}
                  className="min-h-11 flex-1 rounded-xl bg-[var(--primary)] px-4 py-2 font-semibold text-white disabled:opacity-50"
                >
                  {currentIndex === blueprint.activities.length - 1
                    ? "Hoàn tất phiên"
                    : "Tiếp tục"}
                </button>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      <p className="text-center text-xs text-[var(--muted-foreground)]">
        Server xác nhận attempt result, playback/support evidence và session
        state trước khi local runtime phản chiếu tiến độ. Nội dung câu trả lời mở
        không được ghi vào local storage hoặc persistence.
      </p>
    </div>
  );
}
