"use client";

import { useEffect, useRef, useState } from "react";

import {
  checkOnDeviceEnglishDictation,
  startOnDeviceSpeechProbe,
  type OnDeviceSpeechProbeController,
} from "@/platform/speech/on-device-speech-probe";
import {
  imitationResultSchema,
  imitationSittingSchema,
  type ImitationResult,
  type ImitationSitting,
} from "@/shared/contracts/imitation-measurement";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/**
 * One sitting of the imitation measure.
 *
 * The learner hears a sentence and says it back. Nothing is ever shown as text
 * before they answer: with the sentence on screen this measures reading aloud,
 * and the number would keep rising while nothing changed.
 *
 * There is no "I got it right" button anywhere. The recogniser's transcript is
 * what is scored, and it is scored on the server against a sentence this page
 * never receives.
 */

type Phase =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "unavailable"; reason: string }
  | { kind: "asking"; index: number; listening: boolean }
  | { kind: "scoring" }
  | { kind: "done"; result: ImitationResult }
  | { kind: "failed"; reason: string };

export function ImitationSitting() {
  const [sitting, setSitting] = useState<ImitationSitting | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const answers = useRef<{ itemId: string; transcript: string }[]>([]);
  const controller = useRef<OnDeviceSpeechProbeController | null>(null);
  const stream = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      controller.current?.abort();
      for (const track of stream.current?.getTracks() ?? []) track.stop();
    };
  }, []);

  async function begin() {
    setPhase({ kind: "loading" });
    answers.current = [];

    let availability: string;
    try {
      availability = await checkOnDeviceEnglishDictation();
    } catch {
      availability = "unsupported";
    }
    if (availability !== "available") {
      // Fail closed. A measure that falls back to typing is measuring typing,
      // and the number would be filed next to the spoken ones as if it meant
      // the same thing.
      setPhase({
        kind: "unavailable",
        reason:
          "Máy này chưa nhận được tiếng nói ngay trên thiết bị. Phép đo cần bạn nói ra tiếng — gõ chữ không thay thế được, nên chưa đo được lần này.",
      });
      return;
    }

    try {
      const response = await fetch("/api/measure/imitation");
      if (!response.ok) throw new Error("sitting unavailable");
      const parsed = imitationSittingSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("sitting malformed");
      setSitting(parsed.data);
      setPhase({ kind: "asking", index: 0, listening: false });
    } catch {
      setPhase({ kind: "failed", reason: "Chưa lấy được bộ câu đo." });
    }
  }

  function play(index: number) {
    if (!sitting) return;
    const audio = new Audio(sitting.items[index].audioUrl);
    void audio.play().catch(() => {});
  }

  async function listen(index: number) {
    if (!sitting) return;
    setPhase({ kind: "asking", index, listening: true });

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase({ kind: "asking", index, listening: false });
      return;
    }
    stream.current = media;
    const [track] = media.getAudioTracks();
    if (!track) {
      setPhase({ kind: "asking", index, listening: false });
      return;
    }

    controller.current = startOnDeviceSpeechProbe({
      audioTrack: track,
      // The page does not hold the sentence, so it cannot pass target phrases.
      // Only the raw transcript is wanted; the server does the comparing.
      targetPhrases: [],
      onTranscript: (transcript) => advance(index, transcript),
      onResult: () => {},
      onError: () => advance(index, ""),
    });
    if (!controller.current) advance(index, "");
  }

  function advance(index: number, transcript: string) {
    if (!sitting) return;
    answers.current = [
      ...answers.current.filter((a) => a.itemId !== sitting.items[index].id),
      { itemId: sitting.items[index].id, transcript },
    ];
    const next = index + 1;
    if (next < sitting.items.length) {
      setPhase({ kind: "asking", index: next, listening: false });
      return;
    }
    void submit();
  }

  async function submit() {
    if (!sitting) return;
    setPhase({ kind: "scoring" });
    try {
      const response = await fetch("/api/measure/imitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankVersion: sitting.bankVersion,
          attempts: answers.current,
        }),
      });
      if (!response.ok) throw new Error("not scored");
      const parsed = imitationResultSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error("malformed result");
      setPhase({ kind: "done", result: parsed.data });
    } catch {
      setPhase({
        kind: "failed",
        reason: "Chưa chấm được lần đo này. Không có kết quả nào được ghi.",
      });
    }
  }

  if (phase.kind === "idle" || phase.kind === "loading") {
    return (
      <Card className="flex flex-col gap-4" data-testid="imitation-intro">
        <h2 className="text-xl font-bold">Đo xem bạn giữ được câu dài tới đâu</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Bạn sẽ nghe từng câu rồi nói lại. Câu dài hơn trí nhớ âm thanh thì
          không nhại được — muốn nói lại đúng thì phải hiểu cấu trúc câu. Vì thế
          đây là thứ đo được tiến bộ thật, khác với chuỗi ngày hay số bài đã làm.
        </p>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Bạn sẽ không nhìn thấy chữ. Nhìn thấy thì thành bài đọc to, và điểm sẽ
          tăng đều trong khi chẳng có gì thay đổi.
        </p>
        <Button onClick={begin} disabled={phase.kind === "loading"}>
          {phase.kind === "loading" ? "Đang chuẩn bị…" : "Bắt đầu đo"}
        </Button>
      </Card>
    );
  }

  if (phase.kind === "unavailable" || phase.kind === "failed") {
    return (
      <Card className="flex flex-col gap-3" data-testid="imitation-blocked">
        <p className="text-sm">{phase.kind === "unavailable" ? phase.reason : phase.reason}</p>
      </Card>
    );
  }

  if (phase.kind === "scoring") {
    return (
      <Card data-testid="imitation-scoring">
        <p className="text-sm text-[var(--muted-foreground)]">Đang chấm…</p>
      </Card>
    );
  }

  if (phase.kind === "done") {
    const { result } = phase;
    return (
      <Card className="flex flex-col gap-4" data-testid="imitation-result">
        <h2 className="text-xl font-bold">
          {result.aboveBank
            ? `Bạn giữ được cả ${result.heldTo} âm tiết — hết bộ câu`
            : `Bạn giữ được tới khoảng ${result.heldTo} âm tiết, và bắt đầu hụt ở ${result.brokeAt}`}
        </h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          {result.passed}/{result.attempted} câu nói lại được.{" "}
          {result.aboveBank
            ? "Không câu nào trong bộ đề đánh bại được bạn, nên con số trên là trần của bộ đề chứ không phải trần của bạn."
            : "Đây là một khoảng, không phải một điểm số: quanh ngưỡng của mình thì người học đúng câu dài và sai câu ngắn hơn, và gộp lại thành một con số là bịa ra độ chính xác không có."}
        </p>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Máy nhận tiếng nói chưa từng được đo trên giọng người Việt. Nếu bạn
          thấy nó nghe sai một câu bạn nói đúng, lỗi nằm ở máy — xem cột bên dưới
          để tự kiểm.
        </p>
        <ul className="flex flex-col gap-2 text-sm" data-testid="imitation-per-item">
          {result.perItem.map((entry) => (
            <li key={entry.itemId} className="flex flex-wrap gap-x-3">
              <span className="font-mono text-xs text-[var(--muted-foreground)]">
                {entry.syllables} âm tiết
              </span>
              <span>{entry.reproduced ? "nói lại được" : `sai ${entry.errors} từ`}</span>
              <span className="text-[var(--muted-foreground)]">
                máy nghe: “{entry.heardBack || "(không rõ)"}”
              </span>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  const item = sitting?.items[phase.index];
  if (!item) return null;

  return (
    <Card className="flex flex-col gap-4" data-testid="imitation-item">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">
          Câu {phase.index + 1}/{sitting?.items.length}
        </span>
        <span className="font-mono text-xs text-[var(--muted-foreground)]">
          {item.syllables} âm tiết
        </span>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">
        Nghe rồi nói lại đúng như bạn nghe được. Nghe lại được, nhưng không có chữ.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => play(phase.index)}>
          Nghe
        </Button>
        <Button onClick={() => listen(phase.index)} disabled={phase.listening}>
          {phase.listening ? "Đang nghe bạn nói…" : "Nói lại"}
        </Button>
        <Button variant="secondary" onClick={() => advance(phase.index, "")}>
          Không nói được
        </Button>
      </div>
    </Card>
  );
}
