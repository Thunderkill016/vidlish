import type { LearningStrand } from "@/shared/contracts/curriculum";

/**
 * The one thing worth doing now.
 *
 * The product had six surfaces — dashboard, create, library, review, progress,
 * start — each with its own source of truth, and a learner had to decide for
 * themselves what today was for. That is a menu, not a course. Someone who
 * knows enough to choose well does not need the product; someone who does not
 * will pick whatever looks easiest, which is reliably the thing that teaches
 * least.
 *
 * So one question drives the whole site: what should this person do next. Two
 * inputs answer it — what the curriculum says they should be able to do, and
 * what their evidence says they can — and everything else on the site becomes
 * detail hanging off that answer.
 *
 * The order below is not preference. Reviews come first because a review that
 * falls due and is skipped is the spacing mechanism failing outright, and the
 * item is lost rather than delayed. New material comes last because it is the
 * only category that can always be manufactured, so it is the only one that can
 * safely wait.
 */

export type LearningAction =
  | { kind: "review_due"; itemKey: string; strand: LearningStrand }
  | { kind: "speak_due"; itemKey: string; strand: LearningStrand }
  | { kind: "unit_activity"; unitId: string; activityId: string; strand: LearningStrand }
  | { kind: "new_word"; strand: LearningStrand }
  | { kind: "rest"; reason: "nothing_due_today" };

export type StrandBudget = Readonly<Record<LearningStrand, number>>;

/**
 * Nation's balance, applied at runtime rather than only checked in a schema.
 *
 * A course can be balanced on paper and lopsided in practice, because the
 * learner reaches for the same activity every day. When two candidate actions
 * are otherwise equal, the one whose strand has had least attention today wins.
 * That is the whole mechanism — no quotas, no blocking, just a tie-break that
 * pulls the day back toward balance.
 */
export function leastServedStrand(
  budget: StrandBudget,
  candidates: readonly LearningStrand[],
): LearningStrand | null {
  let best: LearningStrand | null = null;
  for (const strand of candidates) {
    if (best === null || budget[strand] < budget[best]) best = strand;
  }
  return best;
}

export type NextActionInput = {
  /** Item keys whose delayed review is due now. */
  readonly dueReviews: readonly string[];
  /** Item keys whose delayed speaking review is due now. */
  readonly dueSpeaking: readonly string[];
  /** Activities left in the unit the learner is on, in curriculum order. */
  readonly unitActivities: readonly {
    readonly unitId: string;
    readonly activityId: string;
    readonly strand: LearningStrand;
  }[];
  /** Whether the beginner path still has a word to introduce. */
  readonly newWordAvailable: boolean;
  /** How many actions of each strand the learner has already done today. */
  readonly servedToday: StrandBudget;
};

export function resolveNextLearningAction(
  input: NextActionInput,
): LearningAction {
  // A due review is not "one option among several". Skipping it does not delay
  // the item, it loses it.
  const [review] = input.dueReviews;
  if (review) {
    return { kind: "review_due", itemKey: review, strand: "language_focused" };
  }

  const [speaking] = input.dueSpeaking;
  if (speaking) {
    return {
      kind: "speak_due",
      itemKey: speaking,
      strand: "meaning_focused_output",
    };
  }

  if (input.unitActivities.length > 0) {
    // Among the activities still owed by this unit, take the one whose strand
    // has had least attention today. The unit decides what is owed; the balance
    // rule decides which of those comes now.
    const strands = input.unitActivities.map((activity) => activity.strand);
    const strand = leastServedStrand(input.servedToday, strands);
    const chosen =
      input.unitActivities.find((activity) => activity.strand === strand) ??
      input.unitActivities[0];
    return {
      kind: "unit_activity",
      unitId: chosen.unitId,
      activityId: chosen.activityId,
      strand: chosen.strand,
    };
  }

  if (input.newWordAvailable) {
    return { kind: "new_word", strand: "language_focused" };
  }

  // Nothing due and nothing owed. Saying so plainly is better than inventing
  // work: a product that always has something for you to do cannot tell you
  // when you are done, and a learner who is never done stops trusting it.
  return { kind: "rest", reason: "nothing_due_today" };
}
