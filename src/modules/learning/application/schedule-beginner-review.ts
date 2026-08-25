import {
  recordReview,
  type ReviewOutcome,
  type ReviewState,
} from "./review-scheduler";

/**
 * Puts a word the learner just met back on the calendar.
 *
 * FSRS has been in this codebase, tested and reachable, since the video-lesson
 * path was built — and the beginner track never called it. A learner produced a
 * word at `/start`, the evidence was banked, and `next_review_at` stayed null,
 * so the word never entered any review queue and never came back. Every
 * retention claim this product makes assumes 8-12 spaced reviews per item;
 * on the path the learner actually uses there were none.
 *
 * The outcome is derived from what the server already decided, never from the
 * learner grading themselves: an attempt that was checked and correct, with no
 * support open, is the only thing that counts as a clean recall.
 */
export function beginnerReviewOutcome(input: {
  readonly successful: boolean;
  readonly independent: boolean;
}): ReviewOutcome {
  if (!input.successful) return "again";
  // Succeeded, but only with the text open. It comes back sooner than a clean
  // recall would, because reading it is not remembering it.
  return input.independent ? "good" : "hard";
}

export function scheduleBeginnerReview(input: {
  readonly previous: ReviewState | null;
  readonly successful: boolean;
  readonly independent: boolean;
  readonly now: Date;
}): ReviewState {
  return recordReview(
    input.previous,
    beginnerReviewOutcome({
      successful: input.successful,
      independent: input.independent,
    }),
    input.now,
  );
}
