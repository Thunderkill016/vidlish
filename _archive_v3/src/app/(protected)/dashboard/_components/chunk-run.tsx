"use client";

import { useState } from "react";

import {
  markChunkRecall,
  type ChunkRecallItem,
} from "@/modules/production/application/build-chunk-recall";
import { playEnglishLines } from "@/platform/speech/play-english-line";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * Produce a whole chunk from its Vietnamese meaning.
 *
 * The hardest step in the session, and last for that reason. The cloze exercise
 * leaves a sentence standing and takes one word; this leaves nothing but the
 * meaning.
 *
 * The word count is shown on purpose. A blank of unknown length is a guessing
 * game about scope rather than a recall of a form, and the thing being trained
 * is the form.
 */
export function ChunkRun({
  items,
  onFinish,
}: {
  items: readonly ChunkRecallItem[];
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
    const isCorrect = markChunkRecall(item, written);
    setAnswered({ written, correct: isCorrect });
    if (isCorrect) setCorrect((count) => count + 1);
  }

  return (
    <Card className="flex flex-col gap-4" data-testid="chunk-run">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--faint-foreground)]">
          Nói cả cụm · {index + 1}/{items.length}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Không lắp từng chữ. Cụm nào có sẵn trong đầu thì bật ra nguyên khối —
          đó là thứ làm bạn bớt ngắt giữa câu.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xl font-semibold" data-testid="chunk-prompt">
          {item.promptVi}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          {item.words} từ tiếng Anh
        </p>
      </div>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="chunk-feedback">
          <p className="text-sm">
            {answered.correct ? (
              <>
                Đúng. <strong>{item.answer}</strong>
              </>
            ) : (
              <>
                Cụm đúng là <strong>{item.answer}</strong>. Bạn viết “
                {answered.written || "(để trống)"}”.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => playEnglishLines([item.answer])}
            >
              Nghe cụm này
            </Button>
            <Button
              onClick={() => {
                setIndex((current) => current + 1);
                setWritten("");
                setAnswered(null);
              }}
            >
              Tiếp
            </Button>
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
            placeholder="Viết cả cụm bằng tiếng Anh"
            aria-label="Cụm tiếng Anh"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            data-testid="chunk-input"
          />
          <Button onClick={submit}>Kiểm tra</Button>
        </div>
      )}
    </Card>
  );
}
