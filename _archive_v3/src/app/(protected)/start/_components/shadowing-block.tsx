"use client";

import { useEffect, useRef, useState } from "react";

import { curriculumAudioFor, syllablesForLine } from "@/adapters/audio/curriculum-audio";
import {
  canBeShadowed,
  scoreShadowingRhythm,
  type ShadowingRhythmScore,
} from "@/modules/shadowing/application/score-shadowing-rhythm";
import {
  MEASURED_SHADOWING_STAGE,
  SHADOWING_STAGES,
  nextShadowingStage,
  type ShadowingStage,
} from "@/modules/shadowing/application/shadowing-stages";
import {
  captureSpeechEnvelope,
  envelopeOfAudioFile,
} from "@/platform/speech/capture-speech-envelope";
import {
  checkOnDeviceEnglishDictation,
  startOnDeviceSpeechProbe,
} from "@/platform/speech/on-device-speech-probe";
import { playEnglishLines } from "@/platform/speech/play-english-line";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/**
 * One line, shadowed through the seven stages.
 *
 * Shadowing is repeating speech as it arrives, and it is the one technique in
 * this product's evidence base that improves the music of a sentence —
 * intonation, linking, stress — and carries into unscripted speech. It does not
 * fix individual sounds, and nothing here says it does.
 *
 * Two things this component refuses to do, both because the evidence made them
 * unavailable rather than because they were hard:
 *
 *   - It will not measure a stage with the script on screen. Shadowing was
 *     compared head to head against reading along with a script and beat it, so
 *     recording a scripted stage would file the losing technique under the
 *     winning technique's name.
 *   - It will not report one combined score. Words and rhythm are separate
 *     measures of separate things, and a learner who says every word while
 *     flattening every contour has done exactly half of this.
 *
 * The reasoning and the numbers are in docs/product/SHADOWING_SPEC.md.
 */

type Line = { readonly text: string; readonly vi: string };

type Measurement =
  | { readonly kind: "idle" }
  | { readonly kind: "no_microphone"; readonly reason: string }
  | { readonly kind: "recording" }
  | { readonly kind: "scoring" }
  | {
      readonly kind: "scored";
      readonly rhythm: ShadowingRhythmScore;
      /** Null when no recogniser was available to check the words. */
      readonly saidTheWords: boolean | null;
    };

export function ShadowingBlock({
  lines,
  onDone,
}: {
  lines: readonly Line[];
  onDone: () => void;
}) {
  // A line under four syllables has no rhythm to measure. Filtering here rather
  // than at the scorer means the learner is never handed a line whose result
  // would have to be withheld after they had already spoken it.
  const shadowable = lines.filter((line) => {
    const syllables = syllablesForLine(line.text);
    return syllables !== null && canBeShadowed(syllables);
  });

  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<ShadowingStage>(SHADOWING_STAGES[0]);
  const [measurement, setMeasurement] = useState<Measurement>({ kind: "idle" });
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => cleanup.current?.();
  }, []);

  if (shadowable.length === 0) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <p className="text-sm">
          Phần này chưa có câu nào đủ dài để luyện nói theo. Nhịp điệu cần ít nhất
          bốn âm tiết mới đo được.
        </p>
        <Button onClick={onDone}>Tiếp theo</Button>
      </Card>
    );
  }

  const line = shadowable[index]!;
  const measured = stage.id === MEASURED_SHADOWING_STAGE;

  function play() {
    playEnglishLines([line.text]);
  }

  function advance() {
    const next = nextShadowingStage(stage.id);
    if (next) {
      setStage(next);
      setMeasurement({ kind: "idle" });
      return;
    }
    if (index + 1 < shadowable.length) {
      setIndex(index + 1);
      setStage(SHADOWING_STAGES[0]);
      setMeasurement({ kind: "idle" });
      return;
    }
    onDone();
  }

  async function shadowAndMeasure() {
    setMeasurement({ kind: "recording" });

    const audioUrl = curriculumAudioFor(line.text);
    const syllables = syllablesForLine(line.text);
    if (!audioUrl || syllables === null) {
      // Nothing to compare against. Refusing is the only honest option: a
      // rhythm score with no reference rhythm is a number with no meaning.
      setMeasurement({
        kind: "no_microphone",
        reason: "Câu này chưa có bản đọc mẫu để so nhịp, nên chưa đo được.",
      });
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        // Shadowing means speaking *while* the model plays, so the speakers are
        // live in the same room as the microphone. Without cancellation the
        // recording contains the model's own voice, and the rhythm score then
        // measures the reference against a copy of itself — which fails in the
        // one direction this product must never fail in: it makes the learner
        // look like they tracked perfectly when they did not.
        //
        // Browser echo cancellation is built for exactly this. It is not
        // perfect, which is why the screen also asks for headphones: with them
        // the problem does not arise at all.
        audio: { echoCancellation: true, noiseSuppression: false },
      });
    } catch {
      setMeasurement({
        kind: "no_microphone",
        reason:
          "Chưa dùng được micro, nên chưa đo được. Phần này chỉ ghi khi bạn thật sự nói.",
      });
      return;
    }

    const capture = await captureSpeechEnvelope({ stream });
    if (!capture) {
      for (const track of stream.getTracks()) track.stop();
      setMeasurement({
        kind: "no_microphone",
        reason: "Trình duyệt này chưa đo được âm thanh, nên chưa ghi được phần nói.",
      });
      return;
    }

    // The recogniser is a separate, optional check. Its absence costs the word
    // half of the measurement, not the whole stage — the rhythm is still real.
    let saidTheWords: boolean | null = null;
    let probe: { abort(): void } | null = null;
    const availability = await checkOnDeviceEnglishDictation().catch(
      () => "unsupported" as const,
    );
    if (availability === "available") {
      const track = stream.getAudioTracks()[0];
      if (track) {
        probe = startOnDeviceSpeechProbe({
          audioTrack: track,
          targetPhrases: [line.text],
          onResult(result) {
            saidTheWords = result.targetPhraseDetected;
          },
        });
      }
    }

    const finish = () => {
      const learner = capture.stop();
      probe?.abort();
      for (const track of stream.getTracks()) track.stop();
      cleanup.current = null;

      setMeasurement({ kind: "scoring" });
      void (async () => {
        const reference = await envelopeOfAudioFile(audioUrl);
        if (!reference) {
          setMeasurement({
            kind: "no_microphone",
            reason: "Chưa đọc được bản mẫu để so nhịp.",
          });
          return;
        }
        setMeasurement({
          kind: "scored",
          rhythm: scoreShadowingRhythm({ learner, reference, syllables }),
          saidTheWords,
        });
      })();
    };

    cleanup.current = finish;
    play();
    setMeasurement({ kind: "recording" });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
          Bước {stage.order}/{SHADOWING_STAGES.length} · Câu {index + 1}/
          {shadowable.length}
        </p>
        <h2 className="text-lg font-semibold">{stage.titleVi}</h2>
        <p className="text-sm text-[var(--muted-foreground)]">{stage.instructionVi}</p>
      </div>

      {stage.showsScript ? (
        <p className="text-xl font-medium" data-testid="shadowing-script">
          {line.text}
        </p>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          (Chữ đang ẩn — bước này nghe bằng tai.)
        </p>
      )}

      {stage.id === "check_understanding" || stage.id === "check_details" ? (
        <p className="text-sm" data-testid="shadowing-meaning">
          {line.vi}
        </p>
      ) : null}

      {measured ? (
        <MeasuredStage
          measurement={measurement}
          onStart={() => void shadowAndMeasure()}
          onStop={() => cleanup.current?.()}
          onNext={advance}
        />
      ) : (
        <div className="flex gap-2">
          {stage.playsAudio ? (
            <Button variant="secondary" onClick={play}>
              {stage.repetitions > 1 ? `Nghe (${stage.repetitions} lần)` : "Nghe"}
            </Button>
          ) : null}
          <Button onClick={advance}>Xong bước này</Button>
        </div>
      )}
    </Card>
  );
}

function MeasuredStage({
  measurement,
  onStart,
  onStop,
  onNext,
}: {
  measurement: Measurement;
  onStart: () => void;
  onStop: () => void;
  onNext: () => void;
}) {
  if (measurement.kind === "idle") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Bấm bắt đầu, nghe và nói theo ngay. Bấm xong khi câu kết thúc.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Nên đeo tai nghe. Không có tai nghe thì micro thu cả tiếng đọc mẫu
          phát ra loa, và phần đo nhịp sẽ đẹp hơn thực tế.
        </p>
        <Button onClick={onStart}>Bắt đầu nói theo</Button>
      </div>
    );
  }

  if (measurement.kind === "recording") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm" data-testid="shadowing-recording">
          Đang nghe bạn nói…
        </p>
        <Button onClick={onStop}>Xong</Button>
      </div>
    );
  }

  if (measurement.kind === "scoring") {
    return <p className="text-sm text-[var(--muted-foreground)]">Đang đo…</p>;
  }

  if (measurement.kind === "no_microphone") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm" data-testid="shadowing-blocked">
          {measurement.reason}
        </p>
        <Button variant="secondary" onClick={onNext}>
          Bỏ qua bước này
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="shadowing-result">
      <RhythmResult rhythm={measurement.rhythm} saidTheWords={measurement.saidTheWords} />
      <Button onClick={onNext}>Tiếp theo</Button>
    </div>
  );
}

function RhythmResult({
  rhythm,
  saidTheWords,
}: {
  rhythm: ShadowingRhythmScore;
  saidTheWords: boolean | null;
}) {
  if (rhythm.kind === "no_speech") {
    return (
      <p className="text-sm">
        Không nghe thấy tiếng nói nào, nên không có gì để đo. Bước này không được
        ghi.
      </p>
    );
  }

  if (rhythm.kind === "too_short_for_rhythm") {
    return (
      <p className="text-sm">
        Câu này quá ngắn để đo nhịp ({rhythm.syllables} âm tiết).
      </p>
    );
  }

  const timing =
    rhythm.timing === "tracking"
      ? "Bạn bám được nhịp của người đọc."
      : rhythm.timing === "slower_than_model"
        ? "Bạn nói chậm hơn mẫu khá nhiều. Shadowing là bám theo, không phải đọc lại."
        : "Bạn nói nhanh hơn mẫu. Chạy trước thì không còn là nói theo nữa.";

  const contour =
    rhythm.contour === "matching"
      ? "Đường lên xuống của câu khớp với mẫu."
      : "Đường lên xuống chưa khớp — chỗ nhấn và chỗ ngắt còn khác mẫu.";

  return (
    <div className="flex flex-col gap-2 text-sm">
      {/* Two measures, never one number: they measure different things, and
          averaging them would hide the case this product cares most about —
          every word correct, every contour flat. */}
      <p data-testid="shadowing-words">
        <strong>Từ:</strong>{" "}
        {saidTheWords === null
          ? "không kiểm được (máy này chưa nhận dạng được tiếng nói ngay trên máy)."
          : saidTheWords
            ? "máy nghe ra câu bạn nói."
            : "máy chưa nghe ra câu — có thể bạn nói khác, cũng có thể máy nghe sai."}
      </p>
      <p data-testid="shadowing-rhythm">
        <strong>Nhịp:</strong> {timing} {contour}
      </p>
      <p className="text-xs text-[var(--muted-foreground)]">
        Nhịp đo bằng tốc độ âm tiết và đường to nhỏ của giọng —{" "}
        {rhythm.learnerArticulationRate.toFixed(1)} âm tiết/giây so với{" "}
        {rhythm.referenceArticulationRate.toFixed(1)} của mẫu. Đây là đo nhạc điệu
        của câu, không phải đo từng âm một: nói theo giúp nhạc điệu, không sửa
        từng âm.
      </p>
    </div>
  );
}
