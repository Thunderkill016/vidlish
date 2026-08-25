"use client";

import { useMemo, useState } from "react";

import { vietnameseGlossFor } from "@/adapters/vocabulary/vietnamese-glosses";
import {
  coverageOf,
  readPassage,
  statusOf,
  type PassageToken,
  type WordStatus,
} from "@/modules/reading/application/read-passage";
import { playEnglishLines } from "@/platform/speech/play-english-line";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

/**
 * Real English, with every word carrying what this learner knows about it.
 *
 * Three rules here are evidence, not taste, and each is easy to get backwards:
 *
 *   - The meaning appears **at the word**, never in a margin or side panel.
 *     Comparing in-text against marginal glosses, the in-text group carried
 *     lower cognitive load and comprehended better: separating a word from its
 *     gloss splits attention and spends working memory bridging the gap.
 *   - The meaning is **Vietnamese**. L1 glossing beat L2 glossing across 78
 *     effect sizes from 26 studies, and the advantage was largest for beginners.
 *   - Every paragraph is **playable**. Over 26 weeks, readers with audio gained
 *     substantially more than silent readers on both rate and comprehension — a
 *     beginner's first failure is not understanding, it is hearing where one
 *     word stops.
 *
 * And a known word is shown with *no marking at all*. The page becomes plainer
 * as the learner improves, so the text itself is the progress display.
 */

const STATUS_CLASS: Record<WordStatus, string> = {
  known: "",
  learning:
    "rounded-[3px] bg-[var(--evidence-wash)] shadow-[inset_0_-2px_0_var(--evidence-border)]",
  new: "rounded-[3px] bg-[var(--primary-wash)] shadow-[inset_0_-2px_0_var(--primary)]",
};

export function PassageReader({
  paragraphs,
  known,
  learning,
}: {
  paragraphs: readonly string[];
  known: readonly string[];
  learning: readonly string[];
}) {
  const knownSet = useMemo(() => new Set(known), [known]);
  // Words tapped in this sitting. Held locally: tapping is meeting a word, not
  // proving anything about it, and the evidence model has no row for "looked at".
  const [met, setMet] = useState<ReadonlySet<string>>(() => new Set(learning));
  const [open, setOpen] = useState<string | null>(null);

  const sets = useMemo(() => ({ known: knownSet, learning: met }), [knownSet, met]);
  const rendered = useMemo(
    () => paragraphs.map((paragraph) => readPassage(paragraph)),
    [paragraphs],
  );
  const coverage = useMemo(
    () => coverageOf(rendered.flat(), sets),
    [rendered, sets],
  );

  // Keyed by paragraph as well as position: `readPassage` numbers words from
  // zero in every paragraph, so index alone is not an identity. Without the
  // paragraph, tapping one word opened the gloss on every same-numbered word
  // further down the page.
  function tap(paragraphIndex: number, token: PassageToken) {
    if (token.kind !== "word") return;
    const key = `${paragraphIndex}:${token.index}`;
    setOpen((current) => (current === key ? null : key));
    setMet((current) => {
      if (current.has(token.lemma)) return current;
      const next = new Set(current);
      next.add(token.lemma);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-col gap-2" data-testid="reading-coverage">
        <p className="text-sm text-[var(--muted-foreground)]">
          Bạn đã biết{" "}
          <strong className="text-[var(--foreground)]">
            {Math.round(100 * coverage.knownShare)}%
          </strong>{" "}
          số từ trong bài này ({coverage.known}/{coverage.words}).
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          Con số này để bạn biết mình đang ở đâu, không phải để chặn bạn đọc. Ngưỡng
          95% là ngưỡng đọc <em>một mình</em> — còn ở đây bạn chạm một cái là ra nghĩa.
        </p>
      </Card>

      {rendered.map((tokens, paragraphIndex) => (
        <div
          key={paragraphs[paragraphIndex]}
          className="flex flex-col gap-2"
          data-testid="reading-paragraph"
        >
          <p className="text-[1.05rem] leading-[2] tracking-[0.004em]">
            {tokens.map((token, tokenIndex) =>
              token.kind === "gap" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: gaps have no identity
                <span key={`gap-${paragraphIndex}-${tokenIndex}`}>{token.text}</span>
              ) : (
                <Word
                  key={`w-${paragraphIndex}-${token.index}`}
                  token={token}
                  status={statusOf(token, sets)}
                  open={open === `${paragraphIndex}:${token.index}`}
                  onTap={() => tap(paragraphIndex, token)}
                />
              ),
            )}
          </p>
          <div>
            <Button
              variant="secondary"
              onClick={() => playEnglishLines([paragraphs[paragraphIndex]!])}
            >
              Nghe đoạn này
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Word({
  token,
  status,
  open,
  onTap,
}: {
  token: Extract<PassageToken, { kind: "word" }>;
  status: WordStatus;
  open: boolean;
  onTap: () => void;
}) {
  // The gloss is looked up on every candidate base form, so meeting `programs`
  // finds what the dictionary holds for `program`.
  const gloss = token.candidates
    .map((candidate) => vietnameseGlossFor(candidate))
    .find((entry) => entry && entry.length > 0);

  return (
    <button
      type="button"
      onClick={onTap}
      className={`cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-[inherit] leading-[inherit] ${STATUS_CLASS[status]}`}
      data-testid={`reading-word-${status}`}
      aria-label={`${token.text} — chạm để xem nghĩa`}
    >
      {token.text}
      {open ? (
        <span
          className="ml-1.5 inline-flex items-baseline gap-2 whitespace-nowrap rounded-full bg-[var(--accent-wash)] px-2 py-0.5 align-baseline text-[0.8rem] font-semibold text-[var(--accent)]"
          data-testid="reading-gloss"
        >
          {gloss ? gloss.join(" · ") : "chưa có nghĩa trong kho"}
          <span
            role="button"
            tabIndex={0}
            aria-label={`Nghe ${token.text}`}
            className="font-normal opacity-75"
            onClick={(event) => {
              event.stopPropagation();
              playEnglishLines([token.text]);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.stopPropagation();
              playEnglishLines([token.text]);
            }}
          >
            ▶
          </span>
        </span>
      ) : null}
    </button>
  );
}
