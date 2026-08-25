/**
 * What the learner does in the thirty minutes they actually have.
 *
 * This exists because the product became a menu. Every method with good
 * evidence behind it got its own door — reading, sentence building, ear
 * training, shadowing, review, the video path — and eighteen learner-facing
 * routes later the product owner said the site had turned into a jumble with no
 * clear product. He was right, and the cause is nameable: this repo had eight
 * documents of *principles* and no statement of *goals*, so nothing organised
 * the parts and each one organised itself.
 *
 * A session is the goal made concrete: one ordered run through the three things
 * that have to happen, in the order that makes each one work.
 *
 *   1. **Review what is due.** Spacing is the whole retention mechanism; a
 *      review that is due and skipped is that mechanism failing. It goes first
 *      because it is the part with a deadline.
 *   2. **Read.** Where new words and chunks are met at all, and the only step
 *      that scales past the fifteen hours of authored material.
 *   3. **Build sentences.** The blocked step for this learner, in his own
 *      words: knows the words, cannot assemble them. Last because it works on
 *      what the first two just supplied.
 *
 * Sized to thirty minutes because that is the figure he gave, and a session
 * that needs forty is a session that gets abandoned.
 */

/** The honest daily budget, from the learner. Everything is cut to fit it. */
export const SESSION_MINUTES = 30;

export type SessionStepKind = "review" | "read" | "build";

export type SessionStep = {
  readonly kind: SessionStepKind;
  readonly minutes: number;
  /** Why this step is here, in the learner's language. */
  readonly reasonVi: string;
  /** How much there is: words due, paragraphs, sentences. */
  readonly items: number;
};

export type DailySession = {
  readonly steps: readonly SessionStep[];
  readonly minutes: number;
};

/**
 * Minutes each step gets when it is present.
 *
 * Review is uncapped in principle — a due review skipped is the mechanism
 * failing — but it is bounded here so it cannot eat the whole session on a day
 * with a large backlog and leave no new input at all. A learner who only ever
 * clears a queue never meets anything.
 */
const BUDGET: Record<SessionStepKind, number> = { review: 10, read: 12, build: 8 };

export function planDailySession(input: {
  readonly wordsDue: number;
  readonly paragraphsAvailable: number;
  readonly sentencesAvailable: number;
}): DailySession {
  const steps: SessionStep[] = [];

  if (input.wordsDue > 0) {
    steps.push({
      kind: "review",
      minutes: BUDGET.review,
      items: input.wordsDue,
      reasonVi:
        "Có từ đến hạn ôn. Bỏ một lượt ôn đúng hạn là bỏ đúng cơ chế làm bạn nhớ được.",
    });
  }

  if (input.paragraphsAvailable > 0) {
    steps.push({
      kind: "read",
      minutes: BUDGET.read,
      items: input.paragraphsAvailable,
      reasonVi:
        "Đọc là chỗ bạn gặp từ mới thật sự. Ba mươi bài soạn tay chỉ đủ khoảng mười lăm giờ; phần còn lại phải đến từ chữ người ta viết cho người đọc.",
    });
  }

  if (input.sentencesAvailable > 0) {
    steps.push({
      kind: "build",
      minutes: BUDGET.build,
      items: input.sentencesAvailable,
      reasonVi:
        "Bạn nói mình biết từ mà chưa ghép thành câu. Phần này bắt bạn tự bật ra, không cho chọn đáp án.",
    });
  }

  return { steps, minutes: steps.reduce((sum, step) => sum + step.minutes, 0) };
}

/**
 * Whether there is a session to run at all.
 *
 * Distinguished from an empty one on purpose: "nothing to do today" and "we
 * could not work out what to do" are different things to tell a learner, and
 * only one of them is good news.
 */
export function hasWork(session: DailySession): boolean {
  return session.steps.length > 0;
}
