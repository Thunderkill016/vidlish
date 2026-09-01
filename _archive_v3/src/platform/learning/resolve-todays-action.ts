import "server-only";

import { classifyLearningReviewQueue } from "@/modules/learning/application/classify-learning-review-queue";
import {
  resolveNextLearningAction,
  type LearningAction,
} from "@/modules/learning/application/resolve-next-learning-action";
import { pendingUnitActivities } from "@/modules/curriculum/application/pending-unit-activities";
import { reachableActivities } from "@/modules/curriculum/application/reachable-activities";
import { selectNextUnit } from "@/modules/curriculum/application/select-next-unit";
import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { createLearningSpeakingReviewQueueReader } from "@/platform/learning/create-learning-speaking-review-queue-reader";
import { resolveLearningReviewPlan } from "@/platform/learning/resolve-review-plan";

/**
 * Answers the only question the home page asks.
 *
 * Everything the learner could do is gathered here and reduced to one action.
 * The reduction rule lives in the application layer where it can be tested; this
 * file only supplies it with facts.
 */
export async function resolveTodaysAction(
  ownerUserId: string,
): Promise<LearningAction> {
  const [scheduled, knownItems, speakingQueue] = await Promise.all([
    createLearningReviewRepository().listScheduled(ownerUserId),
    (await createBeginnerProgressRepository()).knownWords(ownerUserId),
    createLearningSpeakingReviewQueueReader().read(ownerUserId),
  ]);

  // An item is actionable when something can actually serve it. A lesson item
  // needs its blueprint; a beginner word needs nothing but itself, and the
  // beginner path below serves it. Requiring a blueprint for both meant every
  // scheduled beginner word was silently dropped from the queue.
  const beginnerScheduled = new Set(
    scheduled
      .filter((item) => item.sourceLessonVersionId === null)
      .map((item) => item.itemKey),
  );
  const { due } = await classifyLearningReviewQueue(
    scheduled,
    async (itemKey) =>
      beginnerScheduled.has(itemKey) ||
      (await resolveLearningReviewPlan(ownerUserId, itemKey)) !== null,
  );

  // The same evidence set answers both questions: a chunk the learner can
  // produce unaided is a chunk the unit no longer needs to teach, and a word
  // they can produce unaided is one the beginner path no longer offers.
  const independent = new Set(knownItems);

  const nextUnit = selectNextUnit({
    units: FOUNDATION_UNITS,
    evidence: {
      independent,
      // Reuse in a changed context and recall after a delay are what the review
      // system measures, and it has its own queue above. Passing empty sets
      // here would be a lie about the learner; passing the same set would be a
      // lie about the evidence. The unit is finished for *today* once its
      // language can be produced unaided.
      changedContext: independent,
      delayed: independent,
    },
  });

  // Two filters, in this order. What the unit still owes, and what the learner
  // can actually attempt: a Pre-A1 chunk is several words, and to someone with
  // nothing it is several unknown words at once. The i+1 rule does not stop
  // applying because the language came from a syllabus, so the beginner word
  // path keeps working until the unit's language is within reach.
  const owed =
    nextUnit.kind === "study"
      ? pendingUnitActivities(nextUnit.unit, independent)
      : [];
  const reachable = new Set(
    nextUnit.kind === "study"
      ? reachableActivities(nextUnit.unit, independent).map(
          (activity) => activity.id,
        )
      : [],
  );
  const unitActivities = owed.filter((activity) =>
    reachable.has(activity.activityId),
  );

  return resolveNextLearningAction({
    dueReviews: due.map((item) => item.itemKey),
    // The speaking queue is keyed by the activity that produced it, not by a
    // vocabulary item, so the activity id is what identifies the work.
    dueSpeaking: speakingQueue.due.map((item) => item.activityId),
    unitActivities,
    // The beginner path always has a next word until the catalogue runs out,
    // and it is the last resort by design.
    newWordAvailable: true,
    servedToday: {
      meaning_focused_input: 0,
      meaning_focused_output: 0,
      language_focused: 0,
      fluency_development: 0,
    },
  });
}
