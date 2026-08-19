import type {
  LearningActivityDraftV2,
  LearningAuthoringDraftV2,
} from "@/shared/contracts/learning-authoring-draft-v2";

/**
 * Checks a model's draft before it becomes a lesson.
 *
 * The model is allowed to propose pedagogy; it is not allowed to weaken the
 * learning loop. These checks keep the minimum evidence-producing sequence
 * deterministic: first listen without captions, retrieve the target form from
 * memory, then use that same item in a changed context. Support can still be
 * opened later by the runtime policy.
 *
 * Everything here is deterministic. None of it costs a model call, and none of
 * it depends on the model being honest about its own output.
 *
 * Two kinds of finding are handled differently. A defect that can be repaired
 * without judgement is repaired. A defect that changes what the lesson can
 * measure is refused rather than silently turned into a weaker lesson.
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
  | "NO_UNAIDED_GIST"
  | "NO_FORM_RETRIEVAL"
  | "RETRIEVAL_ANSWER_EXPOSED"
  | "NO_CHANGED_CONTEXT_TRANSFER"
  | "NO_RETRIEVAL_TO_TRANSFER_BRIDGE"
  | "TRANSFER_BEFORE_RETRIEVAL"
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

type RecallActivity = Extract<
  LearningActivityDraftV2,
  { activityType: "chunk_recall" }
>;

type TransferActivity = Extract<
  LearningActivityDraftV2,
  { activityType: "guided_transfer" }
>;

function isChoiceActivity(
  activity: LearningActivityDraftV2,
): activity is ChoiceActivity {
  return (
    activity.activityType === "gist_choice" ||
    activity.activityType === "meaning_in_context"
  );
}

function isRecallActivity(
  activity: LearningActivityDraftV2,
): activity is RecallActivity {
  return activity.activityType === "chunk_recall";
}

function isTransferActivity(
  activity: LearningActivityDraftV2,
): activity is TransferActivity {
  return activity.activityType === "guided_transfer";
}

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase("vi").replace(/\s+/g, " ");
}

function enforceLearningSequence(draft: LearningAuthoringDraftV2): void {
  const first = draft.activities[0];
  if (
    !first ||
    first.activityType !== "gist_choice" ||
    first.captionPolicy !== "hidden_first"
  ) {
    throw new AuthoringQualityError(
      "The lesson must begin with a gist listen while captions are hidden.",
      "NO_UNAIDED_GIST",
    );
  }

  const recalls = draft.activities
    .map((activity, index) => ({ activity, index }))
    .filter(
      (entry): entry is { activity: RecallActivity; index: number } =>
        isRecallActivity(entry.activity),
    );
  if (recalls.length === 0) {
    throw new AuthoringQualityError(
      "The lesson has no form-retrieval activity.",
      "NO_FORM_RETRIEVAL",
    );
  }
  if (recalls.some(({ activity }) => activity.captionPolicy === "shown")) {
    throw new AuthoringQualityError(
      "A retrieval activity exposes captions before the learner retrieves the form.",
      "RETRIEVAL_ANSWER_EXPOSED",
    );
  }

  const transfers = draft.activities
    .map((activity, index) => ({ activity, index }))
    .filter(
      (entry): entry is { activity: TransferActivity; index: number } =>
        isTransferActivity(entry.activity),
    );
  if (transfers.length === 0) {
    throw new AuthoringQualityError(
      "The lesson has no changed-context transfer activity.",
      "NO_CHANGED_CONTEXT_TRANSFER",
    );
  }

  const bridgedPairs = recalls.flatMap((recall) =>
    transfers.flatMap((transfer) =>
      transfer.activity.candidateIds.includes(recall.activity.candidateId)
        ? [{ recall, transfer }]
        : [],
    ),
  );
  if (bridgedPairs.length === 0) {
    throw new AuthoringQualityError(
      "No target item is both retrieved and reused in changed-context transfer.",
      "NO_RETRIEVAL_TO_TRANSFER_BRIDGE",
    );
  }
  if (
    !bridgedPairs.some(
      ({ recall, transfer }) => recall.index < transfer.index,
    )
  ) {
    throw new AuthoringQualityError(
      "Changed-context transfer occurs before retrieval of the same target item.",
      "TRANSFER_BEFORE_RETRIEVAL",
    );
  }
}

export function reviewAuthoringDraft(
  draft: LearningAuthoringDraftV2,
): ReviewedAuthoringDraft {
  enforceLearningSequence(draft);

  const choices = draft.activities.filter(isChoiceActivity);

  for (const activity of choices) {
    const seen = new Set(activity.options.map((option) => normalize(option.textVi)));
    if (seen.size !== activity.options.length) {
      // Two options saying the same thing means the item cannot tell whether the
      // learner understood the evidence or merely selected an equivalent slot.
      throw new AuthoringQualityError(
        `Activity ${activity.id} offers the same option twice.`,
        "DUPLICATE_OPTIONS",
      );
    }
  }

  // A learner can score full marks by always picking the longest option without
  // understanding a word. One activity landing that way is chance; every
  // activity landing that way is a model habit and stops measuring comprehension.
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

  return rebalanceAnswerPositions(draft, choices);
}

/**
 * Spreads correct answers across option slots deterministically. A random
 * shuffle would make regeneration produce a different lesson and make failures
 * harder to reproduce.
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
