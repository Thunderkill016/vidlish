"use client";

import { useState } from "react";

import {
  beginnerAttemptResponseSchema,
  beginnerSessionResponseSchema,
  beginnerWordIntroductionSchema,
  type BeginnerSessionResponse,
} from "@/shared/contracts/beginner-session";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * One listening-first beginner session under the current conservative policy.
 *
 * The sentence appears only after the learner asks for it. Asking is recorded:
 * reading support and unsupported listening/production are different evidence
 * and must not collapse into the same claim.
 */

type Phase = "idle" | "listening" | "revealed" | "saving" | "answered";

type SessionState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; session: BeginnerSessionResponse; index: number }
  | { kind: "introduce"; target: string; challengeId: string }
  | { kind: "empty"; reason: string }
  | { kind: "error"; message: string };

function speak(text: string): void {
  // The browser voice is a zero-cost bootstrap source, not a pronunciation
  // reference or evidence that the audio is ideal for every learner.
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.75;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

const EMPTY_MESSAGES: Record<string, string> = {
  catalogue_exhausted:
    "Bạn đã đi hết danh sách từ A1–A2 hiện tại. Vidlish cần chọn nguồn học tiếp theo từ evidence của bạn, không tự coi đây là đã thành thạo.",
  no_usable_input:
    "Chưa tìm được batch câu nào đạt policy beginner hiện tại cho target tiếp theo. Vidlish dừng thay vì đưa input vượt khỏi lexical gate set đang dùng.",
};

export function BeginnerSession() {
  const [state, setState] = useState<SessionState>({ kind: "none" });
  const [phase, setPhase] = useState<Phase>("idle");
  const [usedSupport, setUsedSupport] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
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
    setResult(null);
    try {
      const response = await fetch("/api/beginner/session", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setState({ kind: "error", message: "Không mở được buổi học." });
        return;
      }
      const introduction = beginnerWordIntroductionSchema.safeParse(body);
      if (introduction.success) {
        setState({
          kind: "introduce",
          target: introduction.data.target,
          challengeId: introduction.data.challengeId,
        });
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
      setState({ kind: "ready", session: parsed.data, index: 0 });
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
        setPhase("answered");
        return;
      }
      const saved = beginnerAttemptResponseSchema.safeParse(
        await response.json(),
      );
      setSaveFailed(!saved.success);
      setResult(saved.success ? (saved.data.dictation ?? null) : null);
      setPhase("answered");
    } catch {
      setSaveFailed(true);
      setPhase("answered");
    }
  }

  function nextSentence() {
    if (state.kind !== "ready") return;
    const index = state.index + 1;
    if (index >= state.session.sentences.length) {
      void startSession();
      return;
    }
    setState({ ...state, index });
    setPhase("listening");
    setUsedSupport(false);
    setHeard("");
    setResult(null);
    setSaveFailed(false);
    speak(state.session.sentences[index].text);
  }

  if (state.kind === "none") {
    return (
      <Card className="flex flex-col items-start gap-4">
        <p className="text-sm">
          Buổi học bắt đầu bằng nghe. Chữ là support và chỉ hiện khi bạn yêu cầu.
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

  if (state.kind === "introduce") {
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[var(--muted-foreground)]">
            Target đang được giới thiệu riêng
          </span>
          <p className="text-xs text-[var(--muted-foreground)]">
            Theo policy beginner hiện tại, Vidlish chỉ dùng câu có một target nằm
            ngoài lexical gate set. Khi chưa đủ evidence để tạo một batch câu hợp
            lệ, target được giới thiệu riêng thay vì ép ra câu quá khó.
          </p>
        </div>

        <p className="text-4xl font-semibold">{state.target}</p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => speak(state.target)}>Nghe lại</Button>
        </div>

        {phase === "saving" ? (
          <p className="text-sm text-[var(--muted-foreground)]">Đang lưu…</p>
        ) : phase !== "answered" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">
              Bạn tự đánh giá là mình nói lại được từ này chưa?
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
                ? "Chưa lưu được evidence. Vidlish sẽ không giả rằng lần này đã được ghi."
                : "Đã ghi bootstrap lexical-gate evidence. Lần này là self-report đã được server bind vào đúng target; nó chưa phải verified capability hay bằng chứng nhớ lâu."}
            </p>
            <Button onClick={startSession}>Tiếp tục học</Button>
          </div>
        )}
      </Card>
    );
  }

  const sentence = state.session.sentences[state.index];

  return (
    <Card className="flex flex-col gap-5">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-[var(--muted-foreground)]">
          Target:{" "}
          <strong className="text-[var(--foreground)]">
            {state.session.target}
          </strong>
        </span>
        <span className="text-xs text-[var(--muted-foreground)] tabular-nums">
          Câu {state.index + 1}/{state.session.sentences.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => speak(sentence.text)}>Nghe lại</Button>
        {phase === "listening" && (
          <Button
            variant="secondary"
            onClick={() => {
              setUsedSupport(true);
              setPhase("revealed");
            }}
          >
            Cho tôi xem chữ
          </Button>
        )}
      </div>

      {phase === "listening" ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Thử nghe và gõ lại trước. Nghe lại không mở answer key; xem chữ được ghi
          là support.
        </p>
      ) : (
        <p className="text-xl font-medium">{sentence.text}</p>
      )}

      {phase === "saving" ? (
        <p className="text-sm text-[var(--muted-foreground)]">Đang lưu…</p>
      ) : phase !== "answered" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Gõ lại câu bạn vừa nghe.</p>
          <Input
            aria-label="Câu bạn nghe được"
            value={heard}
            onChange={(event) => setHeard(event.target.value)}
          />
          <p className="text-xs text-[var(--muted-foreground)]">
            Scoring hiện bỏ qua hoa thường và dấu câu. Kết quả này là evidence của
            attempt hiện tại, không phải điểm trình độ chung.
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
              ? "Chưa lưu được evidence. Vidlish sẽ không giả rằng attempt này đã được ghi."
              : "Đã ghi attempt hiện tại. Beginner cross-session delayed review chưa được nối, nên Vidlish chưa gọi đây là nhớ lâu."}
          </p>
          <Button onClick={nextSentence}>Câu tiếp theo</Button>
        </div>
      )}
    </Card>
  );
}
