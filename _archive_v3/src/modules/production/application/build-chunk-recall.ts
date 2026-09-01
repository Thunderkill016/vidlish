import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * Asks the learner to produce a whole chunk from its Vietnamese meaning.
 *
 * The other production exercise in this product removes one word from a
 * sentence. This removes the sentence and leaves the meaning, which is a
 * different and harder thing — and it is the one aimed squarely at what the
 * product owner said blocks him: *biết từ nhưng không ghép thành câu*.
 *
 * Why chunks rather than words. Formulaic sequences — multi-word stretches
 * retrieved whole instead of assembled — significantly predicted speech fluency
 * (β = .40, R² = .16), and the mechanism is specific: they reduced **pausing**
 * and did not raise speech rate. Pauses are where assembly happens. Someone who
 * has *"nice to meet you"* stored whole does not assemble it; someone building
 * it from four words does, and pauses.
 *
 * That matters more for a Vietnamese speaker than for most. Vietnamese has no
 * verb conjugation, no articles and no plural inflection, so the machinery
 * English uses to join words is absent from the first language rather than
 * merely unpractised. A stored chunk sidesteps machinery the learner does not
 * yet have — and carries it, so it can be noticed later.
 *
 * The curriculum has called its unit `targetChunks` since it was written, while
 * the review key stayed a single word. This closes that gap.
 */

export type ChunkRecallItem = {
  /** Vietnamese meaning, shown as the prompt. */
  readonly promptVi: string;
  /** The English chunk the learner must produce. */
  readonly answer: string;
  readonly unitId: string;
  /** How many words it is. Shown, because a blank of unknown length is unfair. */
  readonly words: number;
};

/** Single words are already covered by the cloze exercise. */
const MINIMUM_WORDS = 2;

export function chunkWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Marks what the learner wrote against the chunk.
 *
 * Case, surrounding punctuation and repeated spaces are forgiven; word order and
 * spelling are not. The learner is being asked to produce a stored form, and a
 * product that accepts a rearrangement teaches the rearrangement.
 */
export function markChunkRecall(item: ChunkRecallItem, written: string): boolean {
  return normalise(written) === normalise(item.answer);
}

function normalise(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/**
 * Picks chunks the learner is ready to be asked for.
 *
 * Only from units whose language they have already met — asking for a chunk
 * from a unit they have never opened is a test, not practice. Shortest first:
 * a two-word chunk is a smaller step than a five-word one, and this exercise is
 * already the hardest thing in the session.
 */
export function selectChunkRecall(input: {
  readonly units: readonly FoundationUnit[];
  readonly known: ReadonlySet<string>;
  readonly wanted: number;
}): readonly ChunkRecallItem[] {
  const items: ChunkRecallItem[] = [];
  const seen = new Set<string>();

  for (const unit of input.units) {
    for (const chunk of unit.targetChunks) {
      const words = chunkWordCount(chunk.text);
      if (words < MINIMUM_WORDS) continue;

      const key = chunk.text.toLocaleLowerCase("en-US");
      if (seen.has(key)) continue;

      // Every word in the chunk has to be one the learner has produced unaided.
      // Otherwise this asks them to recall something they were never taught.
      const parts = key.split(/\s+/).map((word) => word.replace(/[^a-z']/g, ""));
      if (!parts.every((word) => word.length === 0 || input.known.has(word))) continue;

      seen.add(key);
      items.push({
        promptVi: chunk.vi,
        answer: chunk.text,
        unitId: unit.id,
        words,
      });
    }
  }

  return items
    .sort((a, b) => a.words - b.words || a.answer.localeCompare(b.answer))
    .slice(0, input.wanted);
}
