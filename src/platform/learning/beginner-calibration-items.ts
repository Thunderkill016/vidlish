import { sampleNonwords } from "@/adapters/vocabulary/nonword-catalogue";

/** Real words the learner claims, mixed with words that cannot be known. */
const REAL_ITEMS = 7;
const NONWORD_ITEMS = 3;

export type BeginnerCalibrationAnswer = {
  readonly item: string;
  readonly claimedKnown: boolean;
};

/**
 * The one deterministic construction used by both GET and POST.
 *
 * The seed changes only when the learner's known set length changes, preserving
 * the previous behaviour while making it possible for POST to prove that it is
 * evaluating the exact set the server currently issues.
 */
export function beginnerCalibrationItemsForKnown(
  known: readonly string[],
): string[] {
  const words = known.slice(0, REAL_ITEMS);
  const fakes = sampleNonwords(NONWORD_ITEMS, known.length);

  // Interleaved rather than appended: three unknown-looking items in a row at
  // the end tell the learner exactly which ones to say no to.
  const items: string[] = [];
  const pool = [...words, ...fakes];
  for (let index = 0; index < pool.length; index += 1) {
    items.splice((index * 7) % (items.length + 1), 0, pool[index]);
  }
  return items;
}

/**
 * True only when the request contains the server's current items with the same
 * multiplicity. Order is not evidence, so the browser may return answers in a
 * different order; adding, removing, duplicating, or substituting an item is
 * rejected.
 */
export function answersMatchCalibrationItems(
  expectedItems: readonly string[],
  answers: readonly BeginnerCalibrationAnswer[],
): boolean {
  if (answers.length !== expectedItems.length) return false;

  const expectedCounts = new Map<string, number>();
  for (const item of expectedItems) {
    expectedCounts.set(item, (expectedCounts.get(item) ?? 0) + 1);
  }

  for (const answer of answers) {
    const remaining = expectedCounts.get(answer.item) ?? 0;
    if (remaining <= 0) return false;
    if (remaining === 1) expectedCounts.delete(answer.item);
    else expectedCounts.set(answer.item, remaining - 1);
  }

  return expectedCounts.size === 0;
}
