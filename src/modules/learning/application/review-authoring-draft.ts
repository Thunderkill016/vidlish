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

function isChoiceActivity(
  activity: LearningActivityDraftV2,
): activity is ChoiceActivity {
  return (
    activity.activityType === "gist_choice" ||
    activity.activityType === "meaning_in_context"
  );
}

type RecallActivity = Extract<
  LearningActivityDraftV2,
  { activityType: "chunk_recall" }
>;

type TransferActivity = Extract<
  LearningActivityDraftV2,
  { activityType: "guided_transfer" }
>;

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

/**
 * Holds the lesson to a sequence that can actually produce evidence.
 *
 * VLR-007. Each rule below rejects a lesson that looks complete and measures
 * nothing:
 *
 * - an unaided gist first, because a learner who reads the answer before the
 *   first listen never demonstrates listening at all;
 * - a `chunk_recall`, because a `guided_transfer` alone lets a lesson claim
 *   retrieval while the target language stays on screen;
 * - that recall not starting with the answer in view, whether through captions
 *   or through the prompt itself;
 * - a `guided_transfer` reusing an item the learner has already retrieved, and
 *   coming after that retrieval — reuse before recall is copying.
 */
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
    // Deliberately stricter than "some activity produces language": a
    // `guided_transfer` on its own can be answered with the source sentence
    // still in front of the learner, so it cannot stand in for retrieval.
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

  // Captions are not the only way the answer leaks. A prompt or hint that
  // contains the phrase turns recall into copying, and the caption policy would
  // still read as correct.
  const leaking = recalls.find(({ activity }) => {
    const answer = normalize(activity.revealAnswer);
    return (
      normalize(activity.promptVi).includes(answer) ||
      (activity.hintVi !== null && normalize(activity.hintVi).includes(answer))
    );
  });
  if (leaking) {
    throw new AuthoringQualityError(
      `Activity ${leaking.activity.id} shows its own answer in the prompt or hint.`,
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
    // Retrieval and transfer of two unrelated items is two half lessons. The
    // claim the lesson makes is that one item was recalled and then reused.
    throw new AuthoringQualityError(
      "No target item is both retrieved and reused in changed-context transfer.",
      "NO_RETRIEVAL_TO_TRANSFER_BRIDGE",
    );
  }
  if (!bridgedPairs.some(({ recall, transfer }) => recall.index < transfer.index)) {
    throw new AuthoringQualityError(
      "Changed-context transfer occurs before retrieval of the same target item.",
      "TRANSFER_BEFORE_RETRIEVAL",
    );
  }
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

  // Recognition is not retrieval, and the order the activities come in decides
  // whether the lesson can produce evidence at all.
  enforceLearningSequence(draft);

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
