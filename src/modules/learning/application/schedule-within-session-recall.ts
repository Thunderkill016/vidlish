/**
 * What comes back inside the session the learner is in right now.
 *
 * The delayed scheduler decides which day an item returns. Nothing decides
 * which minute — and that is the gap: an item that is never retrieved before
 * the session ends usually does not survive to the first delayed review at all.
 * Pimsleur's oldest mechanic is exactly this, asking for a phrase again after
 * about a minute, then five, then fifteen, before any review across days.
 *
 * Two departures from that, both deliberate:
 *
 * Intervals are counted in **intervening steps**, not wall-clock minutes. A
 * self-paced learner can stare at one sentence for four minutes or clear three
 * in forty seconds, and a clock-based schedule serves them very differently for
 * no reason connected to memory. What has to sit between two attempts is other
 * material, so the answer is not still in mind.
 *
 * The schedule **contracts on failure**. Expanding retrieval only helps when
 * the retrievals succeed; widening the gap after a learner has just failed
 * merely schedules a second failure. So a miss sends the item back to the
 * shortest interval, and the expansion starts again.
 */

export type WithinSessionItem = {
  readonly key: string;
  /** Step at which the item was last seen, whether introduced or recalled. */
  readonly lastStep: number;
  /** Successful unaided recalls so far in this session. */
  readonly successes: number;
  /** True when the most recent attempt in this session was wrong. */
  readonly lastAttemptFailed?: boolean;
};

export type WithinSessionAction =
  | { kind: "recall"; itemKey: string; overdueBy: number }
  | { kind: "introduce_new" }
  | { kind: "session_complete" };

/**
 * Steps that must pass before an item returns, by number of successes so far.
 *
 * Roughly Pimsleur's one/five/fifteen minutes compressed into a session of
 * five to twelve minutes. Three successes is graduation: a fourth return inside
 * the same session costs a slot and adds nothing the delayed scheduler will not
 * measure better tomorrow.
 */
const EXPANDING_GAPS = [2, 5, 12] as const;

export const WITHIN_SESSION_GRADUATION = EXPANDING_GAPS.length;

function gapFor(item: WithinSessionItem): number {
  if (item.lastAttemptFailed) return EXPANDING_GAPS[0];
  return EXPANDING_GAPS[Math.min(item.successes, EXPANDING_GAPS.length - 1)];
}

function hasGraduated(item: WithinSessionItem): boolean {
  return !item.lastAttemptFailed && item.successes >= WITHIN_SESSION_GRADUATION;
}

/**
 * Most overdue first, then the item seen longest ago, then by key.
 *
 * The last of those decides nothing pedagogically and exists only so the answer
 * cannot depend on array position — two items introduced at the same step with
 * the same history tie on everything else, and without a final rule the session
 * would depend on how the caller happened to build its list.
 */
function outranks(
  item: WithinSessionItem,
  overdueBy: number,
  best: { item: WithinSessionItem; overdueBy: number },
): boolean {
  if (overdueBy !== best.overdueBy) return overdueBy > best.overdueBy;
  if (item.lastStep !== best.item.lastStep) {
    return item.lastStep < best.item.lastStep;
  }
  return item.key < best.item.key;
}

export function scheduleWithinSessionRecall(input: {
  readonly items: readonly WithinSessionItem[];
  /** Steps taken in this session so far. */
  readonly step: number;
  /** Whether there is still new material this session is allowed to introduce. */
  readonly newMaterialRemains: boolean;
}): WithinSessionAction {
  let due: { item: WithinSessionItem; overdueBy: number } | null = null;

  for (const item of input.items) {
    if (hasGraduated(item)) continue;
    const overdueBy = input.step - item.lastStep - gapFor(item);
    if (overdueBy < 0) continue;
    if (due === null || outranks(item, overdueBy, due)) {
      due = { item, overdueBy };
    }
  }

  // A due recall outranks new material. Introducing instead would let the
  // session end with items introduced and never retrieved, which is the exact
  // failure this exists to prevent.
  if (due) {
    return { kind: "recall", itemKey: due.item.key, overdueBy: due.overdueBy };
  }
  if (input.newMaterialRemains) return { kind: "introduce_new" };

  // Nothing is due and there is nothing new left to put between attempts. The
  // gap is a target, not a guarantee: serving an item slightly early is a worse
  // retrieval than a full gap would have given, and ending the session with an
  // item that was never retrieved at all is worse than that. So the item
  // closest to due is served, and `overdueBy` goes negative to say how short
  // the gap was — the caller can record that rather than discover it later.
  let soonest: { item: WithinSessionItem; overdueBy: number } | null = null;
  for (const item of input.items) {
    if (hasGraduated(item)) continue;
    const overdueBy = input.step - item.lastStep - gapFor(item);
    if (soonest === null || outranks(item, overdueBy, soonest)) {
      soonest = { item, overdueBy };
    }
  }

  if (soonest) {
    return {
      kind: "recall",
      itemKey: soonest.item.key,
      overdueBy: soonest.overdueBy,
    };
  }
  return { kind: "session_complete" };
}
