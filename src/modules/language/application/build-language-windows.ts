import { createHash } from "node:crypto";

import type { CanonicalTranscript } from "@/shared/contracts/transcript";
import {
  languageAnalysisWindowSchema,
  type LanguageAnalysisWindow,
  type LanguageEligibilityPolicy,
} from "@/shared/contracts/language-eligibility";

export function countLanguageWords(text: string): number {
  return text.match(/\p{L}+(?:['’]\p{L}+)?/gu)?.length ?? 0;
}

function windowId(transcriptHash: string, segmentIds: string[]): string {
  return `win_${createHash("sha256")
    .update(`${transcriptHash}:${segmentIds.join(":")}`, "utf8")
    .digest("hex")
    .slice(0, 24)}`;
}

export function buildLanguageWindows(
  transcript: CanonicalTranscript,
  policy: LanguageEligibilityPolicy,
): LanguageAnalysisWindow[] {
  const segments = [...transcript.segments].sort(
    (left, right) => left.position - right.position,
  );
  const windows: LanguageAnalysisWindow[] = [];
  let current: typeof segments = [];

  function commitCurrent(): void {
    if (current.length === 0) return;
    const text = current.map((segment) => segment.text).join(" ").trim();
    const segmentIds = current.map((segment) => segment.id);
    windows.push(
      languageAnalysisWindowSchema.parse({
        id: windowId(transcript.normalizedHash, segmentIds),
        segmentIds,
        startMs: current[0].startMs,
        endMs: current[current.length - 1].endMs,
        text,
        wordCount: Math.max(1, countLanguageWords(text)),
      }),
    );
    current = [];
  }

  for (const segment of segments) {
    if (current.length === 0) {
      current.push(segment);
      continue;
    }

    const currentStart = current[0].startMs;
    const previous = current[current.length - 1];
    const proposedText = [...current, segment]
      .map((item) => item.text)
      .join(" ");
    const proposedWords = countLanguageWords(proposedText);
    const gapMs = Math.max(0, segment.startMs - previous.endMs);
    const proposedDurationMs = segment.endMs - currentStart;
    const shouldSplit =
      gapMs > policy.maxWindowGapMs ||
      proposedDurationMs > policy.maxWindowDurationMs ||
      (countLanguageWords(
        current.map((item) => item.text).join(" "),
      ) >= policy.targetWindowWords &&
        proposedWords > policy.targetWindowWords);

    if (shouldSplit) commitCurrent();
    current.push(segment);
  }
  commitCurrent();

  if (
    windows.length > 1 &&
    windows[windows.length - 1].wordCount < policy.minWindowWords
  ) {
    const trailing = windows.pop();
    const previous = windows.pop();
    if (trailing && previous) {
      const text = `${previous.text} ${trailing.text}`.trim();
      const segmentIds = [...previous.segmentIds, ...trailing.segmentIds];
      windows.push(
        languageAnalysisWindowSchema.parse({
          id: windowId(transcript.normalizedHash, segmentIds),
          segmentIds,
          startMs: previous.startMs,
          endMs: trailing.endMs,
          text,
          wordCount: Math.max(1, countLanguageWords(text)),
        }),
      );
    }
  }

  return windows;
}
