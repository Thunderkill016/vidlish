"use client";

import { useState } from "react";

import {
  scheduleWithinSessionRecall,
  type WithinSessionItem,
} from "@/modules/learning/application/schedule-within-session-recall";
import {
  beginnerAttemptResponseSchema,
  beginnerSessionResponseSchema,
  beginnerUnitActivitySchema,
  beginnerWordIntroductionSchema,
  type BeginnerSessionResponse,
} from "@/shared/contracts/beginner-session";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

import { UnitActivity } from "./unit-activity";

/**
 * One beginner session, in the order the four skills are actually acquired.
 *
 * Listen first, with nothing on screen. The sentence appears only after the
 * learner has asked for it, and asking is recorded: a word read before it was
 * heard is not evidence of anything, and the difference between "I heard it"
 * and "I saw it" is the whole measurement.
 *
 * The order of sentences is decided by `scheduleWithinSessionRecall`, not by an
 * index walking a list. Playing three sentences once each and ending is
 * introducing, not teaching: a sentence never asked for again inside the
 * session usually does not survive to the first delayed review, so something
 * the learner already met has to come back once other material has been between
 * them.
 */

type Phase = "idle" | "listening" | "revealed" | "saving" | "answered";

type SessionState =
  | { kind: "none" }
  | { kind: "loading" }
  | {
      kind: "ready";
      session: BeginnerSessionResponse;
      index: number;
      /** Sentence order is a schedule, not a cursor. */
      items: WithinSessionItem[];
      step: number;
      served: number;
    }
  | { kind: "introduce"; target: string; challengeId: string }
  | {
      kind: "unit_activity";
      activity: import("@/shared/contracts/beginner-session").BeginnerUnitActivity;
    }
  | { kind: "empty"; reason: string }
  | { kind: "error"; message: string };

function speak(text: string): void {
  // The browser's own voice. It is not the best English a learner could hear,
  // and it costs nothing and needs no network — which is the right trade while
  // the corpus can supply almost no licensed human audio.
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  // Slower than natural speech. A beginner is not failing to understand, they
  // are failing to segment — the words run together before they know where one
  // ends.
  utterance.rate = 0.75;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

const EMPTY_MESSAGES: Record<string, string> = {
  catalogue_exhausted:
    "Bạn đã đi hết danh sách từ A1–A2. Đây là lúc chuyển sang nguồn thật, không phải lúc học lại từ đầu.",
  no_usable_input:
    "Chưa tìm được câu nào chỉ có đúng một từ mới cho từ tiếp theo. Thà không có câu còn hơn một câu bạn chưa đọc nổi.",
};

export function BeginnerSession() {
  const [state, setState] = useState<SessionState>({ kind: "none" });
  const [phase, setPhase] = useState<Phase>("idle");
  const [usedSupport, setUsedSupport] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [knownAfterAttempt, setKnownAfterAttempt] = useState<boolean | null>(
    null,
  );
  const [heard, setHeard] = useState("");
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    missed: string[];
    perfect: boolean;
  } | null>(null);

  async function startSession() {
    setState({ kind: "loading" });
    setPhase("idle");
    setUsedSupport(false);
    setSaveFailed(false);
    setKnownAfterAttempt(null);
    setHeard("");
    setResult(null);
    try {
      const response = await fetch("/api/beginner/session", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setState({ kind: "error", message: "Không mở được buổi học." });
        return;
      }
      // The curriculum answers before the word path does, so this is checked
      // first: a unit activity is a different kind of work, not a variant of a
      // word.
      const unitActivity = beginnerUnitActivitySchema.safeParse(body);
      if (unitActivity.success) {
        setState({ kind: "unit_activity", activity: unitActivity.data });
        return;
      }

      const introduction = beginnerWordIntroductionSchema.safeParse(body);
      if (introduction.success) {
        setState({
          kind: "introduce",
          target: introduction.data.target,
          challengeId: introduction.data.challengeId,
        });
        // A standalone first word follows the same boundary as every later
        // sentence: sound first, text only after the learner explicitly asks.
        setPhase("listening");
        speak(introduction.data.target);
        return;
      }

      const parsed = beginnerSessionResponseSchema.safeParse(body);
      if (!parsed.success) {
        const reason = typeof body?.kind === "string" ? body.kind : "unknown";
        setState({
          kind: "empty",
          reason: EMPTY_MESSAGES[reason] ?? "Chưa có gì để học lúc này.",
        });
        return;
      }
      setState({
        kind: "ready",
        session: parsed.data,
        index: 0,
        items: [
          { key: parsed.data.sentences[0].text, lastStep: 0, successes: 0 },
        ],
        step: 0,
        served: 1,
      });
      setPhase("listening");
      speak(parsed.data.sentences[0].text);
    } catch {
      setState({ kind: "error", message: "Không mở được buổi học." });
    }
  }

  async function record(
    claimedIndependent: boolean,
    dictated?: { challengeId: string; heard: string },
  ) {
    if (state.kind !== "ready" && state.kind !== "introduce") return;

    // "Saving", not "saved". Claiming the word was recorded before the request
    // has come back means a learner who closes the tab is told they made
    // progress they did not make — and the next session, reading only what was
    // actually stored, would look like it had forgotten them.
    setPhase("saving");
    try {
      const body = dictated
        ? {
            kind: "dictation" as const,
            challengeId: dictated.challengeId,
            usedSupport,
            heard: dictated.heard,
          }
        : {
            kind: "introduce_word" as const,
            challengeId:
              state.kind === "introduce" ? state.challengeId : "",
            usedSupport,
            claimedIndependent,
          };

      const response = await fetch("/api/beginner/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setSaveFailed(true);
        setKnownAfterAttempt(null);
        setPhase("answered");
        return;
      }
      const saved = beginnerAttemptResponseSchema.safeParse(
        await response.json(),
      );
      setSaveFailed(!saved.success);
      setKnownAfterAttempt(saved.success ? saved.data.known : null);
      setResult(saved.success ? (saved.data.dictation ?? null) : null);
      setPhase("answered");
    } catch {
      // Swallowing this would be the worst option available: the learner would
      // be told their word was recorded, the next session would not know it,
      // and the product would look like it had forgotten them.
      setSaveFailed(true);
      setKnownAfterAttempt(null);
      setPhase("answered");
    }
  }

  function nextSentence() {
    if (state.kind !== "ready") return;

    const step = state.step + 1;
    const items = state.items.map((item) =>
      item.key === state.session.sentences[state.index].text
        ? {
            ...item,
            lastStep: step,
            successes: item.successes + (result?.perfect ? 1 : 0),
            lastAttemptFailed: !result?.perfect,
          }
        : item,
    );

    const action = scheduleWithinSessionRecall({
      items,
      step,
      newMaterialRemains: state.served < state.session.sentences.length,
    });

    if (action.kind === "session_complete") {
      void startSession();
      return;
    }

    const index =
      action.kind === "recall"
        ? state.session.sentences.findIndex(
            (sentence) => sentence.text === action.itemKey,
          )
        : state.served;

    // The scheduler names a sentence; if it somehow names one this session does
    // not hold, ending is honest and repeating the current one is not.
    if (index < 0 || index >= state.session.sentences.length) {
      void startSession();
      return;
    }

    setState({
      ...state,
      index,
      step,
      items:
        action.kind === "introduce_new"
          ? [
              ...items,
              {
                key: state.session.sentences[index].text,
                lastStep: step,
                successes: 0,
              },
            ]
          : items,
      served:
        action.kind === "introduce_new" ? state.served + 1 : state.served,
    });
    setPhase("listening");
    setUsedSupport(false);
    setSaveFailed(false);
    setKnownAfterAttempt(null);
    setHeard("");
    setResult(null);
    speak(state.session.sentences[index].text);
  }

  if (state.kind === "none") {
    return (
      <Card className="flex flex-col items-start gap-4">
        <p className="text-sm">
          Buổi học bắt đầu bằng nghe, không phải đọc. Chữ chỉ hiện ra khi bạn
          xin.
        </p>
        <Button onClick={startSession}>Bắt đầu nghe</Button>
      </Card>
    );
  }

  if (state.kind === "loading") {
    return <Card>Đang chuẩn bị câu…</Card>;
  }

  if (state.kind === "empty" || state.kind === "error") {
    const message = state.kind === "empty" ? state.reason : state.message;
    return (
      <Card className="flex flex-col items-start gap-4">
        <p className="text-sm">{message}</p>
        <Button onClick={startSession}>Thử lại</Button>
      </Card>
    );
  }

  if (state.kind === "unit_activity") {
    return (
      <UnitActivity
        activity={state.activity}
        onNext={() => {
          void startSession();
        }}
      />
    );
  }

  if (state.kind === "introduce") {
    const showTarget = phase !== "listening";

    return (
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[var(--muted-foreground)]">
            Từ đầu tiên sẽ đến một mình
          </span>
          <p className="text-xs leading-5 text-[var(--muted-foreground)]">
            Chưa có từ nào làm nền, nên lượt đầu chỉ có một từ. Nghe trước và
            thử nói lại. Chỉ mở chữ nếu bạn thực sự cần trợ giúp.
          </p>
        </div>

        {showTarget ? (
          <p className="text-4xl font-semibold">{state.target}</p>
        ) : (
          <div
            data-testid="beginner-first-word-hidden"
            className="rounded-2xl border border-dashed border-[var(--border)] p-5"
          >
            <p className="font-semibold">Nghe trước. Chữ đang được ẩn.</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Nếu nghe chưa rõ, bấm nghe lại. Nhìn chữ sẽ được tính là có trợ
              giúp trong lượt này.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => speak(state.target)}>Nghe lại</Button>
          {phase === "listening" ? (
            <Button
              variant="secondary"
              onClick={() => {
                setUsedSupport(true);
                setPhase("revealed");
              }}
            >
              Cho tôi xem chữ
            </Button>
          ) : null}
        </div>

        {phase === "saving" ? (
          <p className="text-sm text-[var(--muted-foreground)]">Đang lưu…</p>
        ) : phase !== "answered" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Bạn có thể nói lại từ vừa nghe mà không cần nghe mẫu cùng lúc
              không?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => record(true)}>Nói được</Button>
              <Button variant="secondary" onClick={() => record(false)}>
                Chưa nói được
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--muted-foreground)]">
              {saveFailed
                ? "Chưa lưu được lượt này. Hãy thử lại để tiến độ không bị ghi sai."
                : knownAfterAttempt
                  ? "Đã ghi nhận lần bạn tự nói lại được mà không mở chữ. Từ tiếp theo có thể dùng từ này làm nền."
                  : "Đã ghi lượt luyện, nhưng từ này chưa được tính là tự nhớ độc lập. Nó sẽ còn quay lại để bạn thử lại không cần chữ."}
            </p>
            <Button onClick={startSession}>
              {knownAfterAttempt ? "Từ tiếp theo" : "Thử tiếp"}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  const sentence = state.session.sentences[state.index];
  const showSentenceText = phase !== "listening";
  // A position counter would lie here: the order is a schedule, so "1/3"
  // would reappear on a return and read as progress going backwards. What the
  // learner needs to know is whether this one is new.
  const returning = (state.items.find((item) => item.key === sentence.text)
    ?.lastStep ?? 0) < state.step;

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-[var(--muted-foreground)]">
          {showSentenceText ? (
            <>
              Từ mới:{" "}
              <strong className="text-[var(--foreground)]">
                {state.session.target}
              </strong>
            </>
          ) : (
            "Có một từ mới trong câu — đang ẩn"
          )}
        </span>
        <span className="shrink-0 text-xs text-[var(--muted-foreground)] tabular-nums">
          {returning ? "Câu đã gặp, quay lại" : "Câu mới"}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => speak(sentence.text)}>Nghe lại</Button>
        {phase === "listening" && (
          <Button
            variant="secondary"
            onClick={() => {
              // Reading before hearing is support, and it is recorded as such.
              setUsedSupport(true);
              setPhase("revealed");
            }}
          >
            Cho tôi xem chữ
          </Button>
        )}
      </div>

      {!showSentenceText ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Nghe tới khi bạn nói lại được. Chưa nghe ra thì bấm nghe lại — nghe lại
          không tính là trợ giúp, nhìn chữ thì có.
        </p>
      ) : (
        <p className="text-xl font-medium">{sentence.text}</p>
      )}

      {phase === "saving" ? (
        <p className="text-sm text-[var(--muted-foreground)]">Đang lưu…</p>
      ) : phase !== "answered" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Gõ lại đúng câu bạn vừa nghe.</p>
          <Input
            aria-label="Câu bạn nghe được"
            value={heard}
            onChange={(event) => setHeard(event.target.value)}
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            Không tính hoa thường hay dấu câu. Sai một chữ là sai một chữ — đó là
            lý do con số ở đây có nghĩa.
          </p>
          <Button
            onClick={() =>
              record(false, { challengeId: sentence.challengeId, heard })
            }
          >
            Kiểm tra
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {result ? (
            <p className="text-sm" data-testid="dictation-result">
              {result.perfect
                ? "Đúng cả câu."
                : `Đúng ${result.correct}/${result.total} chữ. Chưa ra: ${result.missed.join(", ")}`}
            </p>
          ) : null}
          <p className="text-sm text-[var(--muted-foreground)]">
            {saveFailed
              ? "Chưa lưu được. Từ này sẽ quay lại lần sau — sản phẩm không nói dối rằng đã ghi."
              : "Đã ghi lại. Từ này sẽ quay lại trong buổi học sau, không phải hôm nay."}
          </p>
          <Button onClick={nextSentence}>Câu tiếp theo</Button>
        </div>
      )}
    </Card>
  );
}
