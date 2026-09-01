"use client";

import { useState } from "react";

import {
  markTransferProbe,
  type TransferProbe,
} from "@/modules/production/application/build-transfer-probe";
import { playEnglishLines } from "@/platform/speech/play-english-line";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * Use a stored chunk in an unseen situation.
 *
 * This tests transfer — the strongest evidence this product can produce.
 * The learner is shown a scenario they have never practised in and asked to
 * apply a chunk they previously recalled.
 */
export function TransferRun({
  items,
  onFinish,
}: {
  items: readonly TransferProbe[];
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
    const isCorrect = markTransferProbe(item, written);
    setAnswered({ written, correct: isCorrect });
    if (isCorrect) setCorrect((count) => count + 1);
  }

  return (
    <Card className="flex flex-col gap-4" data-testid="transfer-run">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          Ngữ cảnh mới · {index + 1}/{items.length}
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Dùng cụm đã học vào một tình huống bạn chưa từng thấy. Đây là bằng
          chứng bạn dùng được thật, không phải học vẹt một câu cố định.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-lg bg-[var(--muted)] p-3.5">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          Tình huống
        </p>
        <p className="text-base font-semibold leading-relaxed" data-testid="transfer-scenario">
          {item.scenarioVi}
        </p>
      </div>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="transfer-feedback">
          <p className="text-sm">
            {answered.correct ? (
              <>
                Chính xác. <strong>{item.chunk}</strong>
              </>
            ) : (
              <>
                Cụm cần dùng là <strong>{item.chunk}</strong>. Bạn viết “
                {answered.written || "(để trống)"}”.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => playEnglishLines([item.chunk])}
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
            placeholder="Viết câu tiếng Anh phù hợp tình huống"
            aria-label="Câu tiếng Anh tình huống mới"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            data-testid="transfer-input"
          />
          <Button onClick={submit}>Kiểm tra</Button>
        </div>
      )}
    </Card>
  );
}
