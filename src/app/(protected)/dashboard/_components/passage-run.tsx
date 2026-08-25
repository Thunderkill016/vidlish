"use client";

import Link from "next/link";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { PassageReader } from "../../read/_components/passage-reader";

/**
 * The reading step of the session.
 *
 * Reuses the reading surface rather than a second one: a word tapped here
 * behaves exactly as it does at `/read`, because a learner should not have to
 * learn two ways to look a word up. The layer that makes real English readable
 * — Vietnamese meaning at the word, audio on the line, known words unmarked —
 * belongs to the product, not to one route.
 */
export function PassageRun({
  passage,
  onFinish,
}: {
  passage: {
    readonly textId: string;
    readonly title: string;
    readonly paragraphs: readonly string[];
    readonly sourceUrl: string;
    readonly sourceLabel: string;
  };
  onFinish: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--faint-foreground)]">
          Đọc
        </p>
        <h2 className="text-lg font-bold">{passage.title}</h2>
      </Card>

      <PassageReader
        textId={passage.textId}
        paragraphs={passage.paragraphs}
        known={[]}
        learning={[]}
      />

      <p className="text-xs text-[var(--muted-foreground)]">
        Nguồn:{" "}
        <Link href={passage.sourceUrl} className="font-semibold text-[var(--primary)]">
          {passage.sourceLabel}
        </Link>
      </p>

      <Button onClick={onFinish}>Xong phần đọc</Button>
    </div>
  );
}
