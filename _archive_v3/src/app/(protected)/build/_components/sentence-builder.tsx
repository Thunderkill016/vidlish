"use client";

import { useMemo, useState } from "react";

import {
  markCloze,
  type ClozeItem,
} from "@/modules/production/application/build-cloze-item";
import { playEnglishLines } from "@/platform/speech/play-english-line";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";

/**
 * One word missing from a sentence the learner can otherwise read.
 *
 * Built for the block the product owner named about himself: *biết từ nhưng
 * không ghép thành câu*. Everything measured before this was recognition —
 * words known, coverage percentages, words recognised in a passage. Recognition
 * is not the blocked step.
 *
 * Why it is typed rather than chosen from options: choosing is recognition
 * again. Why nothing is spoken: he is usually somewhere he cannot speak, and a
 * production route usable only in private is a route mostly unused.
 *
 * And why the sentence carries no hint: retrieval beat context-inference on
 * recall of form, recall of meaning, and recognition in a new context. A
 * sentence that gives the answer away teaches nothing.
 *
 * The count shown is **sentences finished**, not words learned. That is the
 * metric this product had wrong, and the one Clozemaster changed to.
 */

type Answered = { readonly written: string; readonly correct: boolean };

export function SentenceBuilder({ items }: { items: readonly ClozeItem[] }) {
  const [index, setIndex] = useState(0);
  const [written, setWritten] = useState("");
  const [answered, setAnswered] = useState<Answered | null>(null);
  const [finished, setFinished] = useState(0);

  const item = items[index];
  const done = useMemo(() => index >= items.length, [index, items.length]);

  if (items.length === 0) {
    return (
      <Card className="flex flex-col gap-2">
        <p className="text-sm">
          Chưa có câu nào vừa sức. Mỗi câu ở đây chỉ được phép có đúng một từ bạn
          chưa biết — hai từ lạ thì bạn đoán, mà đoán thì không để lại gì.
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Học thêm vài từ ở phần Lộ trình rồi quay lại.
        </p>
      </Card>
    );
  }

  if (done || !item) {
    return (
      <Card className="flex flex-col gap-3" data-testid="builder-done">
        <p className="text-lg font-bold">
          Xong {finished}/{items.length} câu.
        </p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Đếm bằng số câu ghép được, không phải số từ đã gặp. Ghép được một câu
          là làm được thứ bạn nói mình chưa làm được.
        </p>
      </Card>
    );
  }

  function submit() {
    if (!item || answered) return;
    const correct = markCloze(item, written) === "correct";
    setAnswered({ written, correct });
    if (correct) setFinished((count) => count + 1);
  }

  function next() {
    setIndex((current) => current + 1);
    setWritten("");
    setAnswered(null);
  }

  return (
    <Card className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--faint-foreground)]">
        Câu {index + 1}/{items.length} · đã ghép được {finished}
      </p>

      <p className="text-xl leading-relaxed" data-testid="builder-prompt">
        {item.prompt}
      </p>

      {answered ? (
        <div className="flex flex-col gap-3" data-testid="builder-feedback">
          <p className="text-sm">
            {answered.correct ? (
              <>
                Đúng. Câu đầy đủ: <strong>{item.sentence}</strong>
              </>
            ) : (
              <>
                Từ còn thiếu là <strong>{item.answer}</strong>. Bạn viết “
                {answered.written || "(để trống)"}”.
              </>
            )}
          </p>
          {/* Heard only after the attempt. Playing it first would turn a
              production task into a listening one. */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => playEnglishLines([item.sentence])}
            >
              Nghe câu này
            </Button>
            <Button onClick={next}>Câu tiếp theo</Button>
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
            data-testid="builder-input"
          />
          <Button onClick={submit}>Kiểm tra</Button>
          <p className="text-xs text-[var(--muted-foreground)]">
            Không có gợi ý và không có đáp án để chọn. Tự nhớ ra được thì mới
            nhớ lâu — nhìn thấy rồi nhận ra thì không.
          </p>
        </div>
      )}
    </Card>
  );
}
