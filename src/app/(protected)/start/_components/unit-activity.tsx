"use client";

import { useState } from "react";

import {
  beginnerAttemptResponseSchema,
  type BeginnerUnitActivity,
} from "@/shared/contracts/beginner-session";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * One curriculum activity, run.
 *
 * The order is the same one the rest of this path uses and for the same reason:
 * the lines are heard before any text exists on screen, and asking for the text
 * is recorded as support. A communicative task read off the page measures
 * reading.
 *
 * What differs from a word or a sentence is that the unit decided why this is
 * being practised, so the prompt is the activity's own — not a template. And an
 * activity where support may stay open banks nothing, because nothing it
 * observes separates knowing from reading.
 */

type Phase = "listening" | "producing" | "saving" | "done";

function speak(lines: readonly string[]): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  for (const line of lines) {
    const utterance = new SpeechSynthesisUtterance(line);
    utterance.lang = "en-US";
    utterance.rate = 0.75;
    window.speechSynthesis.speak(utterance);
  }
}

const STRAND_LABEL: Record<BeginnerUnitActivity["strand"], string> = {
  meaning_focused_input: "Nghe để hiểu",
  meaning_focused_output: "Dùng thật",
  language_focused: "Nhớ lại",
  fluency_development: "Nói cho trôi",
};

export function UnitActivity({
  activity,
  onNext,
}: {
  activity: BeginnerUnitActivity;
  onNext: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [usedSupport, setUsedSupport] = useState(false);
  const [written, setWritten] = useState("");
  const [outcome, setOutcome] = useState<
    { perfect: boolean; missed: string[] } | null
  >(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const graded = activity.challengeId !== undefined;

  async function submit() {
    if (!activity.challengeId) {
      onNext();
      return;
    }
    setPhase("saving");
    try {
      const response = await fetch("/api/beginner/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "dictation",
          challengeId: activity.challengeId,
          usedSupport,
          heard: written,
        }),
      });
      if (!response.ok) {
        setSaveFailed(true);
        setPhase("done");
        return;
      }
      const saved = beginnerAttemptResponseSchema.safeParse(
        await response.json(),
      );
      setOutcome(
        saved.success && saved.data.dictation
          ? {
              perfect: saved.data.dictation.perfect,
              missed: saved.data.dictation.missed,
            }
          : null,
      );
      setPhase("done");
    } catch {
      setSaveFailed(true);
      setPhase("done");
    }
  }

  return (
    <Card className="flex flex-col gap-5" data-testid="unit-activity">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
          {STRAND_LABEL[activity.strand]}
        </span>
        <span className="text-xs text-[var(--muted-foreground)]">
          {activity.unitId}
        </span>
      </div>

      <p className="text-base">{activity.promptVi}</p>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => speak(activity.listen)}>Nghe</Button>
        {phase === "listening" && !usedSupport ? (
          <Button
            variant="secondary"
            onClick={() => {
              // Reading before hearing is support, and it is recorded as such.
              setUsedSupport(true);
            }}
          >
            Cho tôi xem chữ
          </Button>
        ) : null}
      </div>

      {usedSupport ? (
        <ul className="flex flex-col gap-1 text-sm">
          {activity.targets.map((target) => (
            <li key={target.text}>
              <strong>{target.text}</strong>
              {target.vi ? ` — ${target.vi}` : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          Nghe tới khi bạn nói lại được. Nghe lại không tính là trợ giúp, nhìn
          chữ thì có.
        </p>
      )}

      {phase === "saving" ? (
        <p className="text-sm text-[var(--muted-foreground)]">Đang lưu…</p>
      ) : phase === "done" ? (
        <div className="flex flex-col gap-3">
          {outcome ? (
            <p className="text-sm" data-testid="unit-activity-result">
              {outcome.perfect
                ? "Đúng."
                : `Chưa ra: ${outcome.missed.join(", ")}`}
            </p>
          ) : null}
          <p className="text-sm text-[var(--muted-foreground)]">
            {saveFailed
              ? "Chưa lưu được. Phần này sẽ quay lại — sản phẩm không nói dối rằng đã ghi."
              : graded
                ? "Đã ghi lại."
                : "Phần này không ghi bằng chứng: còn được mở trợ giúp thì không phân biệt được biết với đọc thấy."}
          </p>
          <Button onClick={onNext}>Tiếp theo</Button>
        </div>
      ) : graded ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Gõ lại đúng phần tiếng Anh bạn vừa nghe.</p>
          <Input
            aria-label="Phần bạn nghe được"
            value={written}
            onChange={(event) => setWritten(event.target.value)}
          />
          <Button onClick={submit}>Kiểm tra</Button>
        </div>
      ) : (
        <Button onClick={submit}>Xong phần này</Button>
      )}
    </Card>
  );
}
