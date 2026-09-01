import { ENGLISH_FREQUENCY_RANKED } from "../data/english-frequency-ranked";

/**
 * How much of a video's speech the learner is likely to already know.
 *
 * This is the number that decides whether a video is teachable at all. Research
 * on lexical coverage puts 95% at the threshold for minimal comprehension and
 * 98% at comprehension without support; authentic video needs roughly 7000 word
 * families to reach 98%. A learner around B1 sits near 3000, so most real
 * YouTube speech lands *below* the minimum threshold for the learners Nếp
 * serves. Without measuring it, the pipeline cannot tell an appropriate video
 * from an impossible one, and cannot decide how much support to show.
 *
 * The estimate is deliberately deterministic and model-free: same transcript and
 * same level always give the same number, so it can gate authoring.
 */

/** Rank lookup, built once. Index in the ranked list == frequency rank. */
const RANK_BY_WORD: ReadonlyMap<string, number> = new Map(
  ENGLISH_FREQUENCY_RANKED.map((word, index) => [word, index + 1] as const),
);

/**
 * Vocabulary size in word families assumed for each level, used as "the first N
 * frequency ranks are known". These are the commonly cited bands, and they are
 * inputs to a heuristic rather than a claim about any individual learner.
 */
const ASSUMED_VOCABULARY_BY_CEFR = {
  A1: 750,
  A2: 1_500,
  B1: 3_000,
  B2: 5_000,
  C1: 8_000,
} as const;

export type CoverageCefrLevel = keyof typeof ASSUMED_VOCABULARY_BY_CEFR;

/**
 * Coverage thresholds are modality-specific, and Nếp's later video path is a
 * viewing product.
 *
 * The literature separates three numbers: roughly 98% for reading, 95% for
 * listening, and around 90% for viewing — audiovisual input carries imagery
 * that supports meaning, so a learner follows video at a coverage that would
 * leave them stranded on a page. Van Zeeland and Schmitt also measured only a
 * small gap between 90% and 95% for listening (73.5% vs 76% comprehension),
 * which is not the cliff a single hard threshold implies.
 *
 * So 0.90 is the band this product reads against. It is a band, not a gate:
 * nothing in the pipeline may reject a video for falling under it, because no
 * single coverage threshold holds across every video, accent and learner.
 */
export const VIEWING_COMPREHENSION_COVERAGE = 0.9;

/** Kept for reference: the listening figure, which does not apply here. */
export const LISTENING_COMPREHENSION_COVERAGE = 0.95;

/**
 * Suffixes stripped when a surface form is not in the list, so "watching" can
 * match "watch". This is deliberately crude: a real lemmatiser is a dependency
 * and a maintenance burden, and the estimate only needs to be stable and
 * roughly right, not linguistically complete. Order matters — longest first.
 */
const SUFFIXES = ["'s", "s'", "ing", "ies", "ied", "es", "ed", "ly", "s"] as const;

function rankOf(word: string): number | null {
  // Best rank across the surface form and its plausible base forms, not the
  // first hit. Coverage is a word-family question: an inflected form often
  // carries its own, worse rank ("watching" sits well below "watch"), and
  // stopping at the direct hit would count a learner who plainly knows "watch"
  // as not knowing it.
  let best: number | null = RANK_BY_WORD.get(word) ?? null;
  const consider = (candidate: string | undefined) => {
    if (candidate === undefined) return;
    const rank = RANK_BY_WORD.get(candidate);
    if (rank === undefined) return;
    if (best === null || rank < best) best = rank;
  };

  for (const suffix of SUFFIXES) {
    if (!word.endsWith(suffix) || word.length - suffix.length < 2) continue;
    const stem = word.slice(0, word.length - suffix.length);
    consider(stem);
    // "studies" -> "study", "carried" -> "carry"
    if (suffix === "ies" || suffix === "ied") consider(`${stem}y`);
    if (suffix === "ing" || suffix === "ed") {
      // "making" -> "make"
      consider(`${stem}e`);
      // "running" -> "run"
      const last = stem.at(-1);
      if (last !== undefined && stem.at(-2) === last) consider(stem.slice(0, -1));
    }
  }
  return best;
}

/**
 * Splits English speech into countable running words. Numerals are dropped
 * rather than counted as unknown: "1995" is not a vocabulary burden, and
 * counting it as unknown would understate coverage on any video with dates.
 */
export function tokenizeEnglish(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .split(/[^a-z']+/)
    .map((token) => token.replace(/^'+|'+$/g, ""))
    .filter((token) => token.length > 0);
}

/**
 * Share of running words that fall inside the learner's assumed vocabulary.
 * Returns null for empty input rather than a misleading 0 or 1 — no words means
 * no evidence, and the caller must be able to tell that apart from "nothing was
 * known".
 */
export function estimateLexicalCoverage(
  words: readonly string[],
  cefrLevel: CoverageCefrLevel,
): number | null {
  if (words.length === 0) return null;

  const knownRankCeiling = ASSUMED_VOCABULARY_BY_CEFR[cefrLevel];
  let known = 0;
  for (const word of words) {
    const rank = rankOf(word);
    if (rank !== null && rank <= knownRankCeiling) known += 1;
  }
  return Math.round((known / words.length) * 1000) / 1000;
}

/**
 * Whether the session should offer support from the first viewing rather than
 * holding it back.
 *
 * This decides how much scaffolding to open with — captions on, glosses ready —
 * and nothing else. It must never decide whether a video is teachable at all:
 * withholding captions is a desirable difficulty only for a learner already
 * following the speech, and for everyone else it is just a wall.
 *
 * An unmeasurable coverage returns true, so the failure mode is too much help
 * rather than a learner left without any.
 */
export function needsComprehensionSupport(coverage: number | null): boolean {
  if (coverage === null) return true;
  return coverage < VIEWING_COMPREHENSION_COVERAGE;
}
