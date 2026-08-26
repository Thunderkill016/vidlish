"use client";

import { useState } from "react";

import {
  markCloze,
  type ClozeItem,
} from "@/modules/production/application/build-cloze-item";
import { playEnglishLines } from "@/platform/speech/play-english-line";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * A run of sentences with one word missing.
 *
 * One component serves both review and sentence building, because they are the
 * same act: retrieve a form from memory with nothing in the context to infer it
 * from. Only the source of the sentences differs — words that are due, or words
 * recently met. Noticing that removed two of the three overlapping surfaces the
 * product owner objected to.
 *
 * Typed rather than chosen, because choosing from options is recognition, and
 * recognition is the thing that already works for this learner. Silent, because
 * he is usually somewhere he cannot speak.
 */
export function ClozeRun({
  title,
  subtitle,
  items,
  onFinish,
}: {
  title: string;
  subtitle: string;
  items: readonly ClozeItem[];
  onFinish: (correct: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [written, setWritten] = useState("");
  const [answered, setAnswered] = useState<{ written: string; correct: boolean } | null>(
    null,
  );
  const [correct, setCorrect] = useState(0);

  const item = items[index];
  if (!item) {
    onFinish(correct);
    return null;
  }

  function submit() {
    if (!item || answered) return;
    const isCorrect = markCloze(item, written) === "correct";
    setAnswered({ written, correct: isCorrect });
    if (isCorrect) setCorrect((count) => count + 1);
  }

  function next() {
    setIndex((current) => current + 1);
    setWritten("");
    setAnswered(null);
  }

  return (
    <Card className="flex flex-col gap-4" data-testid="cloze-run">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--faint-foreground)]">
          {title} · {index + 1}/{items.length}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">{subtitle}</p>
      </div>

      <p className="text-xl leading-relaxed" data-testid="cloze-prompt">
        {item.prompt}
      </p>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="cloze-feedback">
          <p className="text-sm">
            {answered.correct ? (
              <>
                Đúng. <strong>{item.sentence}</strong>
              </>
            ) : (
              <>
                Từ còn thiếu là <strong>{item.answer}</strong>. Bạn viết “
                {answered.written || "(để trống)"}”.
              </>
            )}
          </p>
          {/* Playable only after the attempt: hearing it first turns a
              production task into a listening one. */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => playEnglishLines([item.sentence])}
            >
              Nghe câu này
            </Button>
            <Button onClick={next}>Tiếp</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Input
            value={written}
            onChange={(event) => setWritten(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="Từ còn thiếu"
            aria-label="Từ còn thiếu"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            data-testid="cloze-input"
          />
          <Button onClick={submit}>Kiểm tra</Button>
        </div>
      )}
    </Card>
  );
}
