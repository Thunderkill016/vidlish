import { tokenise } from "./check-comprehensible-input";

/**
 * How much of a text this learner can already read.
 *
 * `lexical-coverage.ts` answers a related question a different way: it assumes a
 * vocabulary size from a CEFR band and asks whether a video is teachable at
 * that level. That assumption is the right tool for deciding what to do with a
 * video nobody has met yet. It is the wrong tool for telling a learner where
 * they stand, because it describes a level rather than a person — two learners
 * at "A2" have different words, and only one of them can read this page.
 *
 * So this measures against evidence: the words this learner has actually
 * produced unaided. The number moves only when they learn something, which is
 * what makes it worth showing them.
 *
 * The research thresholds are the same ones the video path uses: around 95% of
 * the running words known is the floor for understanding anything, and around
 * 98% is where a reader stops needing support.
 */

export const MINIMAL_COMPREHENSION_COVERAGE = 0.95;
export const UNSUPPORTED_COMPREHENSION_COVERAGE = 0.98;

export type KnownCoverage = {
  /** Running words, so a word appearing five times counts five times. */
  readonly total: number;
  readonly covered: number;
  readonly coverage: number;
  /** Distinct unknown words, in the order they appear. */
  readonly unknown: string[];
  readonly readable: boolean;
  readonly readableWithoutSupport: boolean;
};

export function measureKnownCoverage(input: {
  readonly text: string;
  readonly known: ReadonlySet<string>;
}): KnownCoverage {
  const words = tokenise(input.text);
  const unknown: string[] = [];
  const seenUnknown = new Set<string>();
  let covered = 0;

  for (const word of words) {
    if (input.known.has(word)) {
      covered += 1;
      continue;
    }
    if (!seenUnknown.has(word)) {
      seenUnknown.add(word);
      unknown.push(word);
    }
  }

  // An empty text is not fully covered, it is unmeasured. Reporting 100% would
  // put a perfect score on the progress page for a learner who knows nothing.
  const coverage = words.length === 0 ? 0 : covered / words.length;

  return {
    total: words.length,
    covered,
    coverage,
    unknown,
    readable: words.length > 0 && coverage >= MINIMAL_COMPREHENSION_COVERAGE,
    readableWithoutSupport:
      words.length > 0 && coverage >= UNSUPPORTED_COMPREHENSION_COVERAGE,
  };
}
