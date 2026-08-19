"use client";

import type { LessonCitation } from "@/shared/contracts/lesson";

import { formatTimestamp } from "./format-timestamp";

/**
 * The evidence behind a teachable item: the exact transcript line, playable in
 * place. The text is server-hydrated, never model-authored.
 *
 * The play button is what turns a citation into practice — the learner hears
 * the line instead of reading a claim about it. The YouTube link stays beside
 * it so the source is still verifiable outside Vidlish.
 */
export function CitationList({
  segmentIds,
  citations,
  videoId,
  onPlay,
}: {
  segmentIds: readonly string[];
  citations: readonly LessonCitation[];
  videoId: string;
  onPlay: (startMs: number, endMs: number) => void;
}) {
  const cited = segmentIds
    .map((id) => citations.find((citation) => citation.segmentId === id))
    .filter((citation): citation is LessonCitation => Boolean(citation));
  if (cited.length === 0) return null;

  return (
    // Amber is reserved for provenance across the whole product: seeing it means
    // this text came from the video and can be checked against it. The grounding
    // invariant is the thing Vidlish promises, so it gets a visual identity
    // rather than reading as incidental metadata.
    <ul className="space-y-1 rounded-r-[var(--radius-sm)] border-l-[3px] border-[var(--evidence-border)] bg-[var(--evidence-wash)] py-2 pl-3 pr-2">
      {cited.map((citation) => (
        <li key={citation.segmentId} className="text-sm">
          <button
            type="button"
            onClick={() => onPlay(citation.startMs, citation.endMs)}
            aria-label={`Nghe câu tại ${formatTimestamp(citation.startMs)}`}
            className="mr-1 inline-flex min-h-8 items-center gap-1 rounded-lg border border-[var(--evidence-border)] bg-[var(--card)] px-2 font-mono text-xs font-semibold text-[var(--evidence)] hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            <span aria-hidden="true">▶</span>
            {formatTimestamp(citation.startMs)}
          </button>
          <span className="text-[var(--foreground)]">
            &ldquo;{citation.text}&rdquo;
          </span>{" "}
          <a
            className="text-xs text-[var(--muted-foreground)] underline"
            href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(citation.startMs / 1000)}s`}
            target="_blank"
            rel="noreferrer noopener"
          >
            YouTube
          </a>
        </li>
      ))}
    </ul>
  );
}
