"use client";

import { useEffect, useRef, useState } from "react";

import { playEnglishLines } from "@/platform/speech/play-english-line";
import {
  checkOnDeviceEnglishDictation,
  startOnDeviceSpeechProbe,
  type OnDeviceSpeechAvailability,
  type OnDeviceSpeechProbeController,
} from "@/platform/speech/on-device-speech-probe";
import {
  beginnerAttemptResponseSchema,
  type BeginnerUnitActivity,
} from "@/shared/contracts/beginner-session";
import { ShadowingBlock } from "./shadowing-block";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * One curriculum activity, run — as the skill it claims to be.
 *
 * Every unit activity carries a skill, and this component used to ignore it:
 * listening, speaking, reading and writing all rendered the same text box and
 * posted the same `dictation` attempt. Thirteen of the twenty-two authored
 * activities claim speaking, so the product was recording speaking practice
 * from a keyboard — attendance dressed as evidence.
 *
 * Each skill now has to be done to be recorded:
 *
 * - listening: the lines are heard, then written down. Asking for the text
 *   first is support and is recorded as such.
 * - speaking: the learner speaks and an on-device recogniser transcribes it.
 *   If no recogniser is available the activity refuses to bank anything rather
 *   than falling back to typing, because a typed answer is not speech.
 * - reading: the English is shown and never spoken, and the answer is which
 *   meaning it carries. Playing it would make it a listening task.
 * - writing: the meaning is shown and the English is produced from it. No audio
 *   at all — with the sentence in your ears this is copying, not writing.
 *
 * The browser still never holds the answer. The server issued a challenge whose
 * kind came from the skill, and it rejects an attempt whose kind disagrees.
 */

type Phase = "presenting" | "producing" | "saving" | "done";


const STRAND_LABEL: Record<BeginnerUnitActivity["strand"], string> = {
  meaning_focused_input: "Nghe để hiểu",
  meaning_focused_output: "Dùng thật",
  language_focused: "Nhớ lại",
  fluency_development: "Nói cho trôi",
};

const SKILL_LABEL: Record<BeginnerUnitActivity["skill"], string> = {
  listening: "Nghe",
  speaking: "Nói",
  reading: "Đọc",
  writing: "Viết",
};

/** Which attempt the server will accept for this skill. */
const ATTEMPT_KIND: Record<BeginnerUnitActivity["skill"], string> = {
  listening: "dictation",
  speaking: "spoken",
  reading: "reading",
  writing: "written",
};

export function UnitActivity({
  activity,
  onNext,
}: {
  activity: BeginnerUnitActivity;
  onNext: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("presenting");
  const [usedSupport, setUsedSupport] = useState(false);
  const [written, setWritten] = useState("");
  const [outcome, setOutcome] = useState<
    { perfect: boolean; missed: string[]; heardBack?: string } | null
  >(null);
  const [saveFailed, setSaveFailed] = useState(false);
  /** Whether the learner has asked for the missing words rather than recalling them. */
  const [revealed, setRevealed] = useState(false);

  const [micState, setMicState] = useState<
    "idle" | "checking" | "listening" | "blocked"
  >("idle");
  const [micReason, setMicReason] = useState<string | null>(null);
  const controller = useRef<OnDeviceSpeechProbeController | null>(null);
  const stream = useRef<MediaStream | null>(null);

  const graded = activity.challengeId !== undefined;
  const skill = activity.skill;

  // Reading and writing are silent on purpose. Audio would turn the first into
  // listening and the second into copying.
  const mayHear = skill === "listening" || skill === "speaking";
  const showsEnglishUpFront = skill === "reading";
  const showsMeaningUpFront = skill === "writing";

  useEffect(() => {
    return () => {
      controller.current?.abort();
      for (const track of stream.current?.getTracks() ?? []) track.stop();
    };
  }, []);

  // Fluency activities are shadowing, and shadowing is a seven-stage sequence,
  // not a prompt with a text box. Twenty-nine of these were authored and every
  // one of them used to render as "read this and press done" — the instruction
  // said fluency and the interaction recorded attendance.
  //
  // Nothing is banked here. Shadowing's measure is rhythm, and the evidence
  // model has no slot for rhythm; filing it as a spoken attempt would record
  // one thing under another thing's name. It is practice, and the dose that the
  // studies delivered was fifteen minutes twice a week for ten weeks — one
  // block is not evidence of anything and is not stored as if it were.
  if (activity.strand === "fluency_development") {
    return <ShadowingBlock lines={activity.targets} onDone={onNext} />;
  }

  async function speakAnswer() {
    if (!activity.challengeId) return;
    setMicState("checking");
    setMicReason(null);

    let availability: OnDeviceSpeechAvailability;
    try {
      availability = await checkOnDeviceEnglishDictation();
    } catch {
      availability = "unsupported";
    }
    if (availability !== "available") {
      // Fail closed. Offering the text box here is exactly the substitution
      // this component exists to stop.
      setMicState("blocked");
      setMicReason(
        "Trình duyệt này chưa nhận được tiếng nói ngay trên máy. Phần nói sẽ không được ghi là đã làm — sản phẩm không đổi phần nói thành phần gõ.",
      );
      return;
    }

    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicState("blocked");
      setMicReason("Chưa dùng được micro, nên chưa ghi được phần nói.");
      return;
    }
    stream.current = media;
    const [track] = media.getAudioTracks();
    if (!track) {
      setMicState("blocked");
      setMicReason("Chưa dùng được micro, nên chưa ghi được phần nói.");
      return;
    }

    setMicState("listening");
    controller.current = startOnDeviceSpeechProbe({
      audioTrack: track,
      targetPhrases: activity.targets.map((target) => target.text),
      onTranscript: (transcript) => {
        void submit(transcript);
      },
      onResult: () => {},
      onError: () => {
        setMicState("blocked");
        setMicReason("Chưa nghe rõ. Thử nói lại gần micro hơn.");
      },
    });
    if (!controller.current) {
      setMicState("blocked");
      setMicReason("Trình duyệt này chưa chạy được máy nhận tiếng nói tại chỗ.");
    }
  }

  async function submit(spokenTranscript?: string) {
    if (!activity.challengeId) {
      onNext();
      return;
    }
    setPhase("saving");
    try {
      const answer =
        skill === "speaking"
          ? { transcript: spokenTranscript ?? "" }
          : skill === "reading"
            ? { chosenVi: written }
            : skill === "writing"
              ? { written }
              : { heard: written };

      const response = await fetch("/api/beginner/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: ATTEMPT_KIND[skill],
          challengeId: activity.challengeId,
          usedSupport,
          ...answer,
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
              ...(saved.data.heardBack === undefined
                ? {}
                : { heardBack: saved.data.heardBack }),
            }
          : saved.success
            ? { perfect: saved.data.known, missed: [] }
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
        <span
          className="text-xs font-semibold text-[var(--muted-foreground)]"
          data-testid="unit-activity-skill"
        >
          {SKILL_LABEL[skill]}
        </span>
      </div>

      <p className="text-base">{activity.promptVi}</p>

      {mayHear ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => playEnglishLines(activity.listen)}>Nghe</Button>
          {phase === "presenting" && !usedSupport ? (
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
      ) : null}

      {showsEnglishUpFront ? (
        <ul
          className="flex flex-col gap-1 text-lg font-semibold"
          data-testid="unit-activity-reading-text"
        >
          {activity.targets.map((target) => (
            <li key={target.text}>{target.text}</li>
          ))}
        </ul>
      ) : null}

      {showsMeaningUpFront ? (
        <ul
          className="flex flex-col gap-1 text-base"
          data-testid="unit-activity-meaning"
        >
          {activity.targets.map((target) => (
            <li key={target.text}>{target.vi}</li>
          ))}
        </ul>
      ) : null}

      {mayHear ? (
        usedSupport ? (
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
        )
      ) : null}

      {phase === "saving" ? (
        <p className="text-sm text-[var(--muted-foreground)]">Đang lưu…</p>
      ) : phase === "done" ? (
        <div className="flex flex-col gap-3">
          {outcome ? (
            <p className="text-sm" data-testid="unit-activity-result">
              {outcome.perfect
                ? "Đúng."
                : outcome.missed.length === 0
                  ? "Chưa đúng."
                  : revealed
                    ? `Chưa ra: ${outcome.missed.join(", ")}`
                    : `Còn ${outcome.missed.length} từ chưa ra.`}
            </p>
          ) : null}
          {outcome && !outcome.perfect && outcome.missed.length > 0 && !revealed ? (
            // Prompt before recast. Supplying the missing words is the easier
            // build and the weaker treatment: across the meta-analysis oral
            // corrective feedback runs at d = 0.64, and prompts — pushing the
            // learner to produce the form — beat recasts that hand it over,
            // most clearly on free constructed responses, which is the kind of
            // speech this product is trying to build. So the count comes first
            // and the words only when asked for.
            <div className="flex flex-col gap-2" data-testid="unit-activity-prompt">
              <p className="text-sm text-[var(--muted-foreground)]">
                Nghe lại và thử nhớ ra trước đã. Nhớ lại được thì nhớ lâu hơn
                đọc thấy.
              </p>
              <div className="flex gap-2">
                {mayHear ? (
                  <Button
                    variant="secondary"
                    onClick={() => playEnglishLines(activity.targets.map((t) => t.text))}
                  >
                    Nghe lại
                  </Button>
                ) : null}
                <Button variant="secondary" onClick={() => setRevealed(true)}>
                  Cho xem
                </Button>
              </div>
            </div>
          ) : null}
          {outcome?.heardBack !== undefined ? (
            <p
              className="text-sm text-[var(--muted-foreground)]"
              data-testid="unit-activity-heard-back"
            >
              Máy nghe được: “{outcome.heardBack || "(không rõ)"}”. Nếu bạn nói
              đúng mà máy nghe sai, lỗi nằm ở máy nghe — nó chưa được đo trên
              giọng người Việt.
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
      ) : !graded ? (
        <Button onClick={() => void submit()}>Xong phần này</Button>
      ) : skill === "speaking" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Nói ra tiếng. Phần này chỉ được ghi khi bạn thật sự nói.
          </p>
          <Button
            onClick={speakAnswer}
            disabled={micState === "checking" || micState === "listening"}
          >
            {micState === "listening" ? "Đang nghe bạn nói…" : "Nói"}
          </Button>
          {micReason ? (
            <p
              className="text-sm text-[var(--muted-foreground)]"
              data-testid="unit-activity-mic-blocked"
            >
              {micReason}
            </p>
          ) : null}
          {micState === "blocked" ? (
            <Button variant="secondary" onClick={onNext}>
              Bỏ qua phần nói
            </Button>
          ) : null}
        </div>
      ) : skill === "reading" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Câu trên có nghĩa là gì?</p>
          <div
            className="flex flex-col gap-2"
            data-testid="unit-activity-reading-options"
          >
            {(activity.readingOptions ?? []).map((option) => (
              <Button
                key={option}
                variant="secondary"
                onClick={() => {
                  setWritten(option);
                  void submit();
                }}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            {skill === "writing"
              ? "Viết phần tiếng Anh mang nghĩa đó."
              : "Gõ lại đúng phần tiếng Anh bạn vừa nghe."}
          </p>
          <Input
            aria-label={
              skill === "writing" ? "Phần bạn viết" : "Phần bạn nghe được"
            }
            value={written}
            onChange={(event) => setWritten(event.target.value)}
          />
          <Button onClick={() => void submit()}>Kiểm tra</Button>
        </div>
      )}
    </Card>
  );
}
