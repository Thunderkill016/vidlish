import type {
  LearningActivityDraftV2,
  LearningAuthoringDraftV2,
} from "@/shared/contracts/learning-authoring-draft-v2";

/**
 * Checks a model's draft before it becomes a lesson.
 *
 * Research on automatically generated test items keeps finding the same
 * systematic defects — answer-position bias above all — and the standard
 * response is a quality-control pass between generation and use. Vidlish had a
 * deterministic gate *before* authoring and nothing after it: whatever the model
 * wrote went straight to hydration and then to a learner.
 *
 * Everything here is deterministic. None of it costs a model call, and none of
 * it depends on the model being honest about its own output.
 *
 * Two kinds of finding, deliberately handled differently. A defect that can be
 * repaired without judgement is repaired — refusing a whole lesson because the
 * correct answer sat in the same slot twice would waste a good lesson. A defect
 * that means the lesson does not teach is refused, because shipping it is worse
 * than failing the job.
 */

export class AuthoringQualityError extends Error {
  readonly name = "AuthoringQualityError";
  constructor(
    message: string,
    readonly reason: AuthoringQualityRejection,
  ) {
    super(message);
  }
}

export type AuthoringQualityRejection =
  | "NO_RETRIEVAL_ACTIVITY"
  | "DUPLICATE_OPTIONS"
  | "CORRECT_OPTION_ALWAYS_LONGEST";

export type AuthoringQualityRepair =
  | "REBALANCED_ANSWER_POSITIONS"
  | "NONE";

export type ReviewedAuthoringDraft = {
  readonly draft: LearningAuthoringDraftV2;
  readonly repairs: readonly AuthoringQualityRepair[];
};

type ChoiceActivity = Extract<
  LearningActivityDraftV2,
  { options: readonly { id: string; textVi: string }[] }
>;

function isChoiceActivity(
  activity: LearningActivityDraftV2,
): activity is ChoiceActivity {
  return (
    activity.activityType === "gist_choice" ||
    activity.activityType === "meaning_in_context"
  );
}

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase("vi").replace(/\s+/g, " ");
}

export function reviewAuthoringDraft(
  draft: LearningAuthoringDraftV2,
): ReviewedAuthoringDraft {
  const choices = draft.activities.filter(isChoiceActivity);

  for (const activity of choices) {
    const seen = new Set(activity.options.map((option) => normalize(option.textVi)));
    if (seen.size !== activity.options.length) {
      // Two options saying the same thing means the question has two correct
      // answers or one dead slot. Either way the learner is being graded on
      // something the item cannot measure.
      throw new AuthoringQualityError(
        `Activity ${activity.id} offers the same option twice.`,
        "DUPLICATE_OPTIONS",
      );
    }
  }

  // A learner can score full marks by always picking the longest option without
  // understanding a word. One activity landing that way is chance; every
  // activity landing that way is the model's habit, and the lesson stops
  // measuring comprehension.
  if (choices.length >= 2) {
    const alwaysLongest = choices.every((activity) => {
      const correct = activity.options.find(
        (option) => option.id === activity.correctOptionId,
      );
      if (!correct) return false;
      return activity.options.every(
        (option) =>
          option.id === correct.id ||
          correct.textVi.length > option.textVi.length,
      );
    });
    if (alwaysLongest) {
      throw new AuthoringQualityError(
        "The correct option is the longest one in every choice activity.",
        "CORRECT_OPTION_ALWAYS_LONGEST",
      );
    }
  }

  // Recognition is not retrieval. A lesson with no activity asking the learner
  // to produce the language from memory teaches them to recognise it and
  // nothing more, which is the single most common way a generated lesson looks
  // complete and does not work.
  const hasRetrieval = draft.activities.some(
    (activity) =>
      activity.activityType === "chunk_recall" ||
      activity.activityType === "guided_transfer",
  );
  if (!hasRetrieval) {
    throw new AuthoringQualityError(
      "Draft has no activity that asks the learner to produce language.",
      "NO_RETRIEVAL_ACTIVITY",
    );
  }

  return rebalanceAnswerPositions(draft, choices);
}

/**
 * Spreads correct answers across option slots.
 *
 * Models put the right answer in the same position far more often than chance,
 * and a learner who notices spends the lesson pattern-matching. Rotating is a
 * repair rather than a refusal: the item is fine, only its layout gives the
 * game away.
 *
 * The rotation is by activity index, so the same draft always produces the same
 * lesson — a random shuffle would make every regeneration a different lesson
 * and nothing here testable.
 */
function rebalanceAnswerPositions(
  draft: LearningAuthoringDraftV2,
  choices: readonly ChoiceActivity[],
): ReviewedAuthoringDraft {
  if (choices.length < 2) return { draft, repairs: ["NONE"] };

  const positions = choices.map((activity) =>
    activity.options.findIndex((option) => option.id === activity.correctOptionId),
  );
  const biased = positions.every((position) => position === positions[0]);
  if (!biased) return { draft, repairs: ["NONE"] };

  let choiceIndex = -1;
  const activities = draft.activities.map((activity) => {
    if (!isChoiceActivity(activity)) return activity;
    choiceIndex += 1;

    const rotateBy = choiceIndex % activity.options.length;
    if (rotateBy === 0) return activity;

    const rotated = [
      ...activity.options.slice(rotateBy),
      ...activity.options.slice(0, rotateBy),
    ];
    return { ...activity, options: rotated };
  });

  return {
    draft: { ...draft, activities } as LearningAuthoringDraftV2,
    repairs: ["REBALANCED_ANSWER_POSITIONS"],
  };
}
