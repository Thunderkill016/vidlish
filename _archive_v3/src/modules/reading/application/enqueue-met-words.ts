import { DEFAULT_NEW_ITEMS_PER_DAY } from "@/modules/learning/application/review-scheduler";

import type { PassageToken } from "./read-passage";

/**
 * Decides which of the words a learner tapped while reading go into the review
 * queue — and, just as importantly, which do not.
 *
 * Reading finds words. It cannot make them stick on its own: the pick-up rate
 * from reading is about one word in twelve, and a word needs more than eight
 * encounters before its form is half-remembered and more than fourteen for its
 * meaning. Spacing supplies the encounters reading leaves to chance, so a
 * tapped word has to reach the scheduler or it is gone.
 *
 * Two limits, and both exist to stop this feature harming the learner:
 *
 * **A tap is not a grade.** Tapping means the learner met a word, not that they
 * tried to recall it and failed — they may have tapped out of caution. So a word
 * already on the calendar is left exactly where it is. Recording a tap as a
 * failed recall would let a cautious reader wreck their own schedule.
 *
 * **New items are capped per day.** The scheduler already documents why: around
 * 7–10 new items a day is the most intake that keeps long-term retention above
 * 80%, and past that the learner builds a review debt they never repay. A long
 * reading session can easily produce forty taps. Enqueueing all of them would
 * be the most generous-looking way to ruin the queue.
 *
 * Which ones win the limited places is not first-come: it is the words that
 * appear most often in what was actually read. Frequency of occurrence was a
 * significant predictor of incidental vocabulary learning in the viewing and
 * reading studies behind this feature — a word met five times in one article is
 * already half-learned, and the schedule finishes the job.
 */

export type MetWord = { readonly lemma: string; readonly occurrences: number };

/** How often each candidate base form appears in what the learner just read. */
export function countOccurrences(
  tokens: readonly PassageToken[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    if (token.kind !== "word") continue;
    // Counted on the surface lemma so `programs` and `program` are one word.
    counts.set(token.lemma, (counts.get(token.lemma) ?? 0) + 1);
  }
  return counts;
}

export function selectWordsToEnqueue(input: {
  /** Base forms the learner tapped in this sitting. */
  readonly tapped: readonly string[];
  readonly occurrences: ReadonlyMap<string, number>;
  /** Base forms already on this learner's calendar; left untouched. */
  readonly alreadyScheduled: ReadonlySet<string>;
  /** New items this learner has already taken on today. */
  readonly newItemsToday: number;
  readonly capacity?: number;
}): readonly MetWord[] {
  const capacity = input.capacity ?? DEFAULT_NEW_ITEMS_PER_DAY;
  const room = Math.max(0, capacity - input.newItemsToday);
  if (room === 0) return [];

  const seen = new Set<string>();
  const candidates: MetWord[] = [];
  for (const lemma of input.tapped) {
    if (seen.has(lemma) || input.alreadyScheduled.has(lemma)) continue;
    seen.add(lemma);
    candidates.push({ lemma, occurrences: input.occurrences.get(lemma) ?? 1 });
  }

  // Most-met first; ties broken alphabetically so the same session always
  // produces the same queue and a test can pin it down.
  candidates.sort(
    (a, b) => b.occurrences - a.occurrences || a.lemma.localeCompare(b.lemma),
  );
  return candidates.slice(0, room);
}
