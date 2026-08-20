import {
  learningRuntimePolicyV2Schema,
  LEARNING_RUNTIME_POLICY_VERSION,
  type ActivityLearningPolicy,
  type LearningRuntimePolicyV2,
} from "@/shared/contracts/learning-policy-v2";
import type { LearningActivity, LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

/**
 * Derives the runtime rules for a lesson from the lesson itself.
 *
 * A runtime policy is pinned to one `blueprintId`, so the hand-written fixture
 * policy can only ever drive the fixture lesson. Every lesson a learner
 * generates needs its own, and nobody is going to write one per lesson.
 *
 * The rules encoded here are the product's, not the model's. The authoring
 * model decides what to teach and how to phrase it; how much support a learner
 * may open, when an answer may be revealed, and whether a wrong answer must be
 * retried are decisions that have to hold across every lesson, so they live in
 * code where they can be read and changed in one place.
 */

/**
 * Support is offered in increasing order of how much it gives away, and the
 * three that hand over the answer sit at the end. Which of them an activity
 * offers depends on what it asks for: a gist question is about the whole
 * passage, so a translation would end it, while a recall task is about one
 * phrase the learner has already met.
 */
/**
 * No `keyword_hint`. It would have to be filled with words from the passage,
 * and for a gist question those words are most of the answer. A support step
 * the product cannot fill honestly is worse than one it does not offer: the
 * learner opens it, gets "no further hint", and has spent a support level for
 * nothing.
 */
const LISTENING_SUPPORT = [
  "replay",
  "context_hint",
  "english_caption",
] as const;

const MEANING_SUPPORT = [
  "replay",
  "context_hint",
  "english_caption",
  "vietnamese_meaning",
] as const;

/**
 * Ordered by how much each step gives away, which the contract enforces. For a
 * recall task the caption *is* the answer, so it sits last and behind two
 * attempts.
 */
const RECALL_SUPPORT = [
  "replay",
  "context_hint",
  "english_caption",
] as const;

/**
 * One correction, then the learner tries again.
 *
 * Reading a correction is not completion — the retention research is explicit
 * that recognising an answer decays far faster than producing one, so an
 * activity the learner got wrong has to come back to them.
 */
const RETRY = {
  requiredAfterCorrection: true,
  retryScope: "same_item",
  maxCorrections: 1,
  maxAttemptsPerSession: 3,
} as const;

function policyForActivity(activity: LearningActivity): ActivityLearningPolicy {
  switch (activity.activityType) {
    case "gist_choice":
      return {
        activityId: activity.id,
        taskScope: "micro_item",
        support: {
          steps: [...LISTENING_SUPPORT],
          // The first attempt happens without the caption, deliberately. This
          // is the one moment in the lesson that measures listening rather than
          // reading, and it does not come back.
          minimumAttemptsBeforeFullReveal: 1,
        },
        retry: RETRY,
        transfer: null,
      };
    case "meaning_in_context":
      return {
        activityId: activity.id,
        taskScope: "micro_item",
        support: { steps: [...MEANING_SUPPORT], minimumAttemptsBeforeFullReveal: 1 },
        retry: RETRY,
        transfer: null,
      };
    case "chunk_recall":
      return {
        activityId: activity.id,
        taskScope: "micro_item",
        support: { steps: [...RECALL_SUPPORT], minimumAttemptsBeforeFullReveal: 2 },
        retry: RETRY,
        transfer: null,
      };
    case "guided_transfer":
      return {
        activityId: activity.id,
        // A capability task, so a correction sends the learner back through the
        // whole thing rather than letting them patch one phrase.
        taskScope: "capability",
        support: null,
        retry: { ...RETRY, retryScope: "full_task" },
        transfer: {
          // The situation changes, the language does not. Repeating the video's
          // own sentence back is not transfer.
          changedDimensions: ["relationship", "information"],
          answerExposure: "after_attempt",
          unseenInput: true,
        },
      };
    case "exit_ticket":
      return {
        activityId: activity.id,
        taskScope: "micro_item",
        support: null,
        // Nothing to get wrong: a reflection has no answer to correct.
        retry: {
          requiredAfterCorrection: false,
          retryScope: "same_item",
          maxCorrections: 1,
          maxAttemptsPerSession: 2,
        },
        transfer: null,
      };
  }
}

export function deriveLearningRuntimePolicy(
  blueprint: LessonBlueprintV2,
): LearningRuntimePolicyV2 {
  return learningRuntimePolicyV2Schema.parse({
    schemaVersion: LEARNING_RUNTIME_POLICY_VERSION,
    blueprintId: blueprint.blueprintId,
    activityPolicies: blueprint.activities.map(policyForActivity),
    capabilityPolicies: blueprint.outcomes.map((outcome) => ({
      outcomeId: outcome.id,
      kind: "language_item",
      // Comprehension first — the contract requires it, and rightly: producing
      // a phrase you do not understand is mimicry. Then producing it yourself,
      // and still being able to days later. Any one of the three alone is
      // weaker evidence than it looks.
      requiredForIndependent: [
        "comprehension",
        "productive_recall",
        "delayed_transfer",
      ],
    })),
  });
}
