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
 * One beginner session, in the order the four skills are actually acquired.
 *
 * Listen first, with nothing on screen. The sentence appears only after the
 * learner has asked for it, and asking is recorded: a word read before it was
 * heard is not evidence of anything, and the difference between "I heard it"
 * and "I saw it" is the whole measurement.
 */

type Phase = "idle" | "listening" | "revealed" | "saving" | "answered";

type SessionState =
  | { kind: "none" }
  | { kind: "loading" }
  | { kind: "ready"; session: BeginnerSessionResponse; index: number }
  | { kind: "introduce"; target: string; gloss?: string[] }
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
          gloss: introduction.data.gloss,
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
    dictated?: { sentence: string; heard: string },
  ) {
    const word =
      state.kind === "ready"
        ? state.session.target
        : state.kind === "introduce"
          ? state.target
          : null;
    if (!word) return;
    // "Saving", not "saved". Claiming the word was recorded before the request
    // has come back means a learner who closes the tab is told they made
    // progress they did not make — and the next session, reading only what was
    // actually stored, would look like it had forgotten them.
    setPhase("saving");
    try {
      const response = await fetch("/api/beginner/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          usedSupport,
          claimedIndependent,
          ...(dictated ?? {}),
        }),
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
      // Swallowing this would be the worst option available: the learner would
      // be told their word was recorded, the next session would not know it,
      // and the product would look like it had forgotten them.
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

  if (state.kind === "introduce") {
    return (
      <Card className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-[var(--muted-foreground)]">
            Từ đầu tiên không đến trong một câu
          </span>
          <p className="text-xs text-[var(--muted-foreground)]">
            Một câu dễ hiểu là câu bạn biết hết chữ trừ một. Khi bạn chưa biết
            chữ nào, câu ngắn nhất có thể có đúng một chữ — mà một chữ thì không
            phải câu. Nên từ đầu tiên phải gặp một mình.
          </p>
        </div>

        <p className="text-4xl font-semibold">{state.target}</p>

        {state.gloss ? (
          <p className="text-lg" data-testid="word-gloss">
            {state.gloss.join(", ")}
          </p>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            Từ này chưa có nghĩa tiếng Việt tương ứng. Thường là vì tiếng Việt
            không có thứ đó — không có mạo từ, không có đại từ biến cách. Nó
            phải học qua cách dùng trong câu, không qua một từ dịch.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => speak(state.target)}>Nghe lại</Button>
        </div>

        {phase === "saving" ? (
          <p className="text-sm text-[var(--muted-foreground)]">Đang lưu…</p>
        ) : phase !== "answered" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">Bạn nói lại được từ này chưa?</p>
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
                ? "Chưa lưu được. Từ này sẽ quay lại lần sau — sản phẩm không nói dối rằng đã ghi."
                : "Đã ghi lại. Từ sau sẽ đến cùng một câu, vì giờ đã có một chữ bạn biết để dựa vào."}
            </p>
            <Button onClick={startSession}>Từ tiếp theo</Button>
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
          Từ mới: <strong className="text-[var(--foreground)]">{state.session.target}</strong>
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
              // Reading before hearing is support, and it is recorded as such.
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
            onClick={() => record(false, { sentence: sentence.text, heard })}
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
