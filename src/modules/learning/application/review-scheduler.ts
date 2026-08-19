import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  type Card,
  type Grade,
} from "ts-fsrs";

/**
 * Decides what the learner studies today.
 *
 * Two findings drive this, and they pull in opposite directions:
 *
 * Every item needs 8–12 spaced reviews over the following month to stick, so
 * reviews must not be rationed — a review that is due and skipped is the whole
 * mechanism failing. Reviews also cost nothing to schedule: this is arithmetic,
 * not a model call, so a learner who reviews more does not cost more.
 *
 * But new material has a ceiling. Roughly 7–10 new items a day is the highest
 * intake that still holds a long-term retention curve above 80%; past that the
 * learner accumulates a review debt they will not repay. So new items are
 * capped and reviews are not.
 *
 * Scheduling uses FSRS, which models difficulty, stability and retrievability
 * per item rather than one fixed ease factor, and reaches the same retention as
 * SM-2 with roughly 20–30% fewer reviews. For someone studying daily, that
 * difference is the gap between keeping the habit and abandoning it.
 */

/** Research puts the sustainable intake at 7–10 per day; 8 sits in the middle. */
export const DEFAULT_NEW_ITEMS_PER_DAY = 8;

/**
 * How the learner did on a recall attempt. Deliberately the vocabulary the v2
 * design already uses, so nothing upstream has to learn FSRS's own names.
 * `easy` is the one addition — FSRS distinguishes it from `good`, and folding
 * the two together would throw away a signal the scheduler can use.
 */
export type ReviewOutcome = "again" | "hard" | "good" | "easy";

const OUTCOME_TO_RATING: Record<ReviewOutcome, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

/**
 * An item's scheduling state, stored per learner. Serialisable on purpose: this
 * is what a repository persists, so it must survive a round trip through JSON
 * without needing FSRS types.
 */
export type ReviewState = {
  readonly due: string;
  readonly stability: number;
  readonly difficulty: number;
  readonly elapsedDays: number;
  readonly scheduledDays: number;
  readonly reps: number;
  readonly lapses: number;
  readonly learningSteps: number;
  readonly state: number;
  readonly lastReview: string | null;
};

export type ReviewItem = {
  readonly itemKey: string;
  /** Null for an item the learner has never been asked to recall. */
  readonly review: ReviewState | null;
};

export type TodayQueue = {
  /** Items whose scheduled time has arrived, oldest due first. */
  readonly due: readonly string[];
  /** Items introduced for the first time today, capped. */
  readonly fresh: readonly string[];
  /** Due items held back — always empty; kept so callers can assert on it. */
  readonly deferred: readonly string[];
};

// Fuzz randomises intervals to spread reviews out. It also makes the same
// inputs schedule differently on every call, which would make this impossible
// to test and impossible to reason about. Determinism is worth more here than
// spreading load for a single learner.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

function toCard(state: ReviewState): Card {
  return {
    due: new Date(state.due),
    stability: state.stability,
    difficulty: state.difficulty,
    elapsed_days: state.elapsedDays,
    scheduled_days: state.scheduledDays,
    reps: state.reps,
    lapses: state.lapses,
    learning_steps: state.learningSteps,
    state: state.state,
    last_review: state.lastReview ? new Date(state.lastReview) : undefined,
  } as Card;
}

function fromCard(card: Card): ReviewState {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    learningSteps: card.learning_steps,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** The state an item starts in, before the learner has recalled it even once. */
export function startReview(now: Date): ReviewState {
  return fromCard(createEmptyCard(now));
}

/**
 * Applies one recall attempt and returns the item's next state.
 *
 * An item with no prior state is treated as new rather than rejected: a learner
 * can meet an item and answer it in the same session, and refusing that would
 * force the caller to write the item twice.
 */
export function recordReview(
  state: ReviewState | null,
  outcome: ReviewOutcome,
  now: Date,
): ReviewState {
  const card = state ? toCard(state) : createEmptyCard(now);
  return fromCard(scheduler.next(card, now, OUTCOME_TO_RATING[outcome]).card);
}

/** Whether this item is waiting to be recalled at `now`. */
export function isDue(state: ReviewState | null, now: Date): boolean {
  if (state === null) return false;
  return new Date(state.due).getTime() <= now.getTime();
}

/**
 * Builds the session: everything due, then new items up to the daily cap.
 *
 * Due items are never trimmed. Capping them would defer exactly the items the
 * learner is closest to forgetting, which is the one thing spaced repetition
 * exists to prevent — so the cap applies only to fresh material.
 */
export function buildTodayQueue(
  items: readonly ReviewItem[],
  now: Date,
  newItemsPerDay: number = DEFAULT_NEW_ITEMS_PER_DAY,
): TodayQueue {
  const due = items
    .filter((item) => isDue(item.review, now))
    .sort(
      (left, right) =>
        new Date(left.review!.due).getTime() -
        new Date(right.review!.due).getTime(),
    )
    .map((item) => item.itemKey);

  const fresh = items
    .filter((item) => item.review === null)
    .slice(0, Math.max(0, newItemsPerDay))
    .map((item) => item.itemKey);

  return { due, fresh, deferred: [] };
}

/**
 * Days until this item comes back — what a learner is actually asking when they
 * want to know whether they are on top of things.
 */
export function daysUntilDue(state: ReviewState, now: Date): number {
  const ms = new Date(state.due).getTime() - now.getTime();
  return Math.ceil(ms / 86_400_000);
}
