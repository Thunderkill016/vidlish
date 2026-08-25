"use client";

import { useEffect, useRef, useState } from "react";

import { pronunciationAudioFor } from "@/adapters/audio/pronunciation-audio";
import {
  buildIdentificationTrial,
  nextContrast,
  type IdentificationTrial,
} from "@/modules/pronunciation/application/build-identification-trial";
import { contrast, type Contrast } from "@/modules/pronunciation/content/minimal-pairs";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/**
 * Hearing a difference you cannot currently hear.
 *
 * High variability phonetic training is the best-evidenced technique in this
 * product: g = 0.92 pre/post and g = 0.67 against a control group across 79
 * studies, with gains that lasted and partly generalised to sounds never
 * trained. The task is the plain one those studies used — play a word, choose
 * between two spellings that differ only in the sound being trained — and the
 * variability that makes it work is the voice changing underneath.
 *
 * Two rules this screen follows because the evidence made them, not because
 * they read well:
 *
 *   - The explanation comes first, every time the contrast changes. Presenting
 *     phonetic information about the target before perception training measurably
 *     improves how much of the gain reaches production. Skipping it to get to
 *     the trials faster is a weaker treatment, not a leaner one.
 *   - Nothing here claims to fix an accent. HVPT trains perception; its transfer
 *     to production is +10.5% on the exact words trained, +4.5% on untrained
 *     ones, with no evidence of lasting production gains. This teaches the ear.
 */

type Answered = {
  readonly trial: IdentificationTrial;
  readonly chosen: string;
  readonly correct: boolean;
};

type Progress = Record<string, { correct: number; total: number }>;

export function HearTheDifference() {
  const [current, setCurrent] = useState<Contrast>(() => nextContrast({}));
  const [explained, setExplained] = useState(false);
  const [trial, setTrial] = useState<IdentificationTrial | null>(null);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audio.current?.pause();
      audio.current = null;
    };
  }, []);

  function play(word: string, voice: string) {
    const url = pronunciationAudioFor(word, voice);
    if (!url) return;
    audio.current?.pause();
    const element = new Audio(url);
    audio.current = element;
    void element.play().catch(() => {
      // A blocked autoplay is not a learning failure; the learner can press again.
    });
  }

  function startTrial(target: Contrast = current) {
    const next = buildIdentificationTrial({ contrastId: target.id });
    setTrial(next);
    setAnswered(null);
    play(next.spoken, next.voice);
  }

  function answer(chosen: string) {
    if (!trial || answered) return;
    const correct = chosen === trial.spoken;
    setAnswered({ trial, chosen, correct });
    setProgress((previous) => {
      const record = previous[trial.contrastId] ?? { correct: 0, total: 0 };
      return {
        ...previous,
        [trial.contrastId]: {
          correct: record.correct + (correct ? 1 : 0),
          total: record.total + 1,
        },
      };
    });
  }

  function continueTraining() {
    const record = progress[current.id];
    // Move on once the learner is reliably hearing this one, and pick the next
    // by weakness rather than by list order.
    if (record && record.total >= 10 && record.correct / record.total >= 0.8) {
      const next = contrast(nextContrast(progress).id);
      setCurrent(next);
      setExplained(false);
      setTrial(null);
      return;
    }
    startTrial();
  }

  if (!explained) {
    return (
      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            Nghe ra sự khác nhau
          </p>
          <h2 className="text-lg font-semibold">{current.titleVi}</h2>
        </div>
        <p className="text-sm leading-relaxed">{current.explanationVi}</p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Phần này luyện <strong>tai</strong>. Nó dạy bạn nghe ra một khác biệt
          hiện giờ bạn chưa nghe ra — và đó là điều nó có bằng chứng. Nó không
          sửa giọng bạn, và sẽ không nói rằng nó làm được việc đó.
        </p>
        <Button
          onClick={() => {
            setExplained(true);
            startTrial();
          }}
        >
          Bắt đầu nghe
        </Button>
      </Card>
    );
  }

  const record = progress[current.id];

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{current.titleVi}</h2>
        {record ? (
          <p
            className="text-sm text-[var(--muted-foreground)]"
            data-testid="hvpt-progress"
          >
            {record.correct}/{record.total}
          </p>
        ) : null}
      </div>

      {trial ? (
        <>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => play(trial.spoken, trial.voice)}>
              Nghe lại
            </Button>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Bạn vừa nghe từ nào?
          </p>
          <div className="flex gap-2">
            {trial.options.map((option) => (
              <Button
                key={option}
                variant={
                  answered && option === trial.spoken ? "primary" : "secondary"
                }
                disabled={answered !== null}
                onClick={() => answer(option)}
                data-testid={`hvpt-option-${option}`}
              >
                {option}
              </Button>
            ))}
          </div>

          {answered ? (
            <div className="flex flex-col gap-3" data-testid="hvpt-feedback">
              <p className="text-sm">
                {answered.correct
                  ? `Đúng — đó là “${trial.spoken}”.`
                  : `Đó là “${trial.spoken}”, không phải “${answered.chosen}”.`}
              </p>
              {/* Hearing the two side by side is the correction. Being told the
                  answer without hearing the contrast again teaches nothing about
                  the sound. */}
              <div className="flex gap-2">
                {trial.options.map((option) => (
                  <Button
                    key={option}
                    variant="secondary"
                    onClick={() => play(option, trial.voice)}
                  >
                    Nghe “{option}”
                  </Button>
                ))}
              </div>
              <Button onClick={continueTraining}>Từ tiếp theo</Button>
            </div>
          ) : null}
        </>
      ) : (
        <Button onClick={() => startTrial()}>Nghe từ đầu tiên</Button>
      )}

      <p className="text-xs text-[var(--muted-foreground)]">
        Giọng đọc đổi liên tục là cố ý: nghe một giọng thì chỉ quen một giọng,
        không phải quen âm. Phần này là luyện tập, chưa được ghi thành bằng chứng
        — muốn nói bạn đã nghe ra thật thì phải có bài đo trước và sau, kèm một
        giọng chưa từng luyện.
      </p>
    </Card>
  );
}
