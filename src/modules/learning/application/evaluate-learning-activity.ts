import {
  activityEvaluationSchema,
  activityResponseSchema,
  learningActivitySchema,
  type ActivityEvaluation,
  type ActivityResponse,
  type LearningActivity,
} from "@/shared/contracts/lesson-v2";

export class LearningActivityEvaluationError extends Error {
  readonly name = "LearningActivityEvaluationError";
}

function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[“”"'`’.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assertResponseKind(
  response: ActivityResponse,
  expected: ActivityResponse["kind"],
): void {
  if (response.kind !== expected) {
    throw new LearningActivityEvaluationError(
      `Activity requires a ${expected} response, received ${response.kind}.`,
    );
  }
}

export function evaluateLearningActivity(
  rawActivity: LearningActivity,
  rawResponse: ActivityResponse,
): ActivityEvaluation {
  const activity = learningActivitySchema.parse(rawActivity);
  const response = activityResponseSchema.parse(rawResponse);

  if (
    activity.activityType === "gist_choice" ||
    activity.activityType === "meaning_in_context"
  ) {
    assertResponseKind(response, "choice");
    if (response.kind !== "choice") {
      throw new LearningActivityEvaluationError("Choice response required.");
    }

    const correct = response.optionId === activity.evaluation.correctOptionId;
    return activityEvaluationSchema.parse({
      verdict: correct ? "correct" : "incorrect",
      goalVi: activity.feedback.goalVi,
      evidenceVi: correct
        ? activity.feedback.correctEvidenceVi
        : activity.feedback.incorrectEvidenceVi,
      nextStepVi: activity.feedback.nextStepVi,
      evidenceRefs: activity.evidence,
      reveal: {
        answer: activity.options.find(
          (option) => option.id === activity.evaluation.correctOptionId,
        )?.textVi,
      },
    });
  }

  if (activity.activityType === "chunk_recall") {
    assertResponseKind(response, "text");
    if (response.kind !== "text") {
      throw new LearningActivityEvaluationError("Text response required.");
    }

    const normalized = normalizeAnswer(response.text);
    const correct = activity.evaluation.accepted.some(
      (answer) => normalizeAnswer(answer) === normalized,
    );

    return activityEvaluationSchema.parse({
      verdict: correct ? "correct" : "incorrect",
      goalVi: activity.feedback.goalVi,
      evidenceVi: correct
        ? activity.feedback.correctEvidenceVi
        : activity.feedback.incorrectEvidenceVi,
      nextStepVi: activity.feedback.nextStepVi,
      evidenceRefs: activity.evidence,
      reveal: {
        answer: activity.reveal.answer,
        explanationVi: activity.reveal.explanationVi,
      },
    });
  }

  if (activity.activityType === "guided_transfer") {
    assertResponseKind(response, "self_check");
    if (response.kind !== "self_check") {
      throw new LearningActivityEvaluationError("Self-check response required.");
    }

    const validCriteria = new Set(
      activity.evaluation.criteriaVi.map((_, index) => index),
    );
    const checkedCriteria = [...new Set(response.checkedCriteria)];
    if (checkedCriteria.some((index) => !validCriteria.has(index))) {
      throw new LearningActivityEvaluationError(
        "The response refers to an unknown self-check criterion.",
      );
    }

    return activityEvaluationSchema.parse({
      verdict: "self_check",
      goalVi: activity.feedback.goalVi,
      evidenceVi:
        "Đây là câu trả lời mở. Vidlish không gắn nhãn đúng hoặc sai; hãy đối chiếu với tiêu chí sau khi bạn đã tự viết.",
      nextStepVi: activity.feedback.nextStepVi,
      evidenceRefs: activity.evidence,
      checkedCriteria,
      exemplarAfterAttempt: activity.evaluation.exemplarAfterAttempt,
    });
  }

  assertResponseKind(response, "reflection");
  return activityEvaluationSchema.parse({
    verdict: "unscored",
    goalVi: activity.feedback.goalVi,
    evidenceVi:
      "Phản hồi này được lưu như tự đánh giá của người học, không phải điểm năng lực khách quan.",
    nextStepVi: activity.feedback.nextStepVi,
    evidenceRefs: activity.evidence,
  });
}
