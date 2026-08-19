import { ENGLISH_FREQUENCY_RANKED } from "../data/english-frequency-ranked";

import {
  estimateLexicalCoverage,
  tokenizeEnglish,
  VIEWING_COMPREHENSION_COVERAGE,
} from "./lexical-coverage";
import type { CoverageCefrLevel } from "./lexical-coverage";

/**
 * Cuts a transcript into topic units a learner can study one at a time.
 *
 * A one-hour video is not one lesson. Research on segmentation in multimedia
 * learning measures large gains from cutting content into meaningful sections
 * the learner navigates themselves — vocabulary learning 13.8 vs 11.2, reading
 * comprehension 13.2 vs 9.7, and lower cognitive load — so a long video should
 * become a series of lessons rather than one impossible one.
 *
 * The existing window builder cuts on breath groups (a pause, 30 seconds, or 90
 * words). Those are the right unit for a citation and the wrong unit for a
 * study session: a one-hour video yields about 120 of them. Topic units sit
 * above windows and group them.
 *
 * Boundaries are found without a model, so the same transcript always cuts the
 * same way and the result can gate authoring.
 */

export type TranscriptLikeSegment = {
  readonly id: string;
  readonly text: string;
  readonly startMs: number;
  readonly endMs: number;
};

export type TopicUnit = {
  /** Segments belonging to this unit, in transcript order. */
  readonly segmentIds: readonly string[];
  readonly startMs: number;
  readonly endMs: number;
  readonly wordCount: number;
  /**
   * Share of running words in this unit the learner is assumed to know. A long
   * video has chapters within reach and chapters far beyond it; measuring per
   * unit is what makes that difference visible.
   */
  readonly lexicalCoverage: number | null;
};

/**
 * Function words dominate every English transcript, so comparing raw word
 * overlap between two passages says almost nothing about whether the topic
 * changed. Treating the most frequent words as stopwords leaves the content
 * words, which is where a topic shift actually shows up.
 */
const FUNCTION_WORD_RANK_CEILING = 100;
const FUNCTION_WORDS: ReadonlySet<string> = new Set(
  ENGLISH_FREQUENCY_RANKED.slice(0, FUNCTION_WORD_RANK_CEILING),
);

/** A pause this long reads as a deliberate break rather than a breath. */
const STRONG_PAUSE_MS = 2_000;

const DEFAULTS = {
  /** Below this a unit is too short to be a session of its own. */
  minMs: 120_000,
  /** Above this the unit stops being one topic and cognitive load climbs. */
  maxMs: 600_000,
  /** Segments compared on each side of a candidate boundary. */
  blockSize: 4,
} as const;

export type TopicSegmentationOptions = {
  readonly minMs?: number;
  readonly maxMs?: number;
  readonly blockSize?: number;
  readonly cefrLevel?: CoverageCefrLevel;
};

function contentWords(text: string): string[] {
  return tokenizeEnglish(text).filter((word) => !FUNCTION_WORDS.has(word));
}

function termCounts(words: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return counts;
}

/**
 * Cosine similarity between two bags of content words. 1 means the two blocks
 * talk about the same things; 0 means they share nothing.
 */
function cosineSimilarity(
  left: ReadonlyMap<string, number>,
  right: ReadonlyMap<string, number>,
): number {
  let dot = 0;
  for (const [word, count] of left) dot += count * (right.get(word) ?? 0);
  if (dot === 0) return 0;

  let leftNorm = 0;
  for (const count of left.values()) leftNorm += count * count;
  let rightNorm = 0;
  for (const count of right.values()) rightNorm += count * count;
  if (leftNorm === 0 || rightNorm === 0) return 0;

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

/**
 * How strongly the transcript wants to break between `segments[index - 1]` and
 * `segments[index]`. Combines two independent signals: the vocabulary on each
 * side diverging, and the speaker pausing.
 */
function boundaryScore(
  segments: readonly TranscriptLikeSegment[],
  index: number,
  blockSize: number,
): number {
  const before = segments.slice(Math.max(0, index - blockSize), index);
  const after = segments.slice(index, index + blockSize);
  if (before.length === 0 || after.length === 0) return 0;

  const similarity = cosineSimilarity(
    termCounts(before.flatMap((segment) => contentWords(segment.text))),
    termCounts(after.flatMap((segment) => contentWords(segment.text))),
  );

  const gapMs = segments[index]!.startMs - segments[index - 1]!.endMs;
  const pauseBonus = gapMs >= STRONG_PAUSE_MS ? 0.15 : 0;

  return Math.min(1, 1 - similarity + pauseBonus);
}

/**
 * Groups segments into topic units.
 *
 * Duration bounds win over the cohesion signal: a unit is never cut below
 * `minMs`, and is always cut at `maxMs` even mid-topic, because an unbounded
 * unit is the failure this function exists to prevent. Between those bounds the
 * cut lands on the weakest cohesion point found so far.
 */
export function segmentIntoTopicUnits(
  segments: readonly TranscriptLikeSegment[],
  options: TopicSegmentationOptions = {},
): TopicUnit[] {
  const minMs = options.minMs ?? DEFAULTS.minMs;
  const maxMs = options.maxMs ?? DEFAULTS.maxMs;
  const blockSize = options.blockSize ?? DEFAULTS.blockSize;
  const cefrLevel = options.cefrLevel ?? "B1";

  if (segments.length === 0) return [];

  const units: TopicUnit[] = [];
  let unitStart = 0;
  let bestCutIndex: number | null = null;
  let bestCutScore = -1;

  const flush = (endExclusive: number) => {
    const members = segments.slice(unitStart, endExclusive);
    const first = members[0];
    const last = members[members.length - 1];
    if (!first || !last) return;

    const words = members.flatMap((segment) => tokenizeEnglish(segment.text));
    units.push({
      segmentIds: members.map((segment) => segment.id),
      startMs: first.startMs,
      endMs: last.endMs,
      wordCount: words.length,
      lexicalCoverage: estimateLexicalCoverage(words, cefrLevel),
    });
    unitStart = endExclusive;
    bestCutIndex = null;
    bestCutScore = -1;
  };

  for (let index = 1; index < segments.length; index += 1) {
    const spanMs = segments[index - 1]!.endMs - segments[unitStart]!.startMs;
    if (spanMs < minMs) continue;

    const score = boundaryScore(segments, index, blockSize);
    if (score > bestCutScore) {
      bestCutScore = score;
      bestCutIndex = index;
    }

    const projectedMs = segments[index]!.endMs - segments[unitStart]!.startMs;
    if (projectedMs >= maxMs) {
      // Past the ceiling: cut at the weakest cohesion point seen in this unit,
      // falling back to here if nothing scored.
      flush(bestCutIndex ?? index);
    }
  }

  // Whatever is left is the final unit. Merging a short tail back into the
  // previous unit would push that one past maxMs, so it stands on its own.
  flush(segments.length);
  return units;
}

/**
 * Picks the unit to build the lesson from.
 *
 * A long video is not uniformly hard: some chapters sit within the learner's
 * reach and some are far past it. With a five-minute budget only one stretch
 * gets taught anyway, so the question is which one — and coverage answers it
 * better than position does.
 *
 * Among units the learner can follow, this takes the *lowest* coverage rather
 * than the highest. The easiest chapter is usually the one with nothing left to
 * learn; the useful one is the hardest chapter still within reach, which is
 * where new material sits close enough to existing knowledge to be picked up.
 *
 * When no unit clears the band it returns the most reachable one instead of
 * nothing. Coverage never rejects a video — no single threshold holds across
 * every video, accent and learner, so a number this rough must not be the thing
 * that tells a learner no.
 */
export function selectTeachableUnit(
  units: readonly TopicUnit[],
  band: number = VIEWING_COMPREHENSION_COVERAGE,
): TopicUnit | null {
  if (units.length === 0) return null;

  // An unmeasurable unit sorts as reachable rather than being dropped: silence
  // about a unit is not evidence against it.
  const coverageOf = (unit: TopicUnit) => unit.lexicalCoverage ?? 1;
  const withinReach = units.filter((unit) => coverageOf(unit) >= band);

  if (withinReach.length > 0) {
    return withinReach.reduce((hardest, unit) =>
      coverageOf(unit) < coverageOf(hardest) ? unit : hardest,
    );
  }

  return units.reduce((easiest, unit) =>
    coverageOf(unit) > coverageOf(easiest) ? unit : easiest,
  );
}
