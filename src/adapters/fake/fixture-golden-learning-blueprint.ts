import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import {
  lessonBlueprintV2Schema,
  type LessonBlueprintV2,
} from "@/shared/contracts/lesson-v2";

/**
 * Product-validation variant of the grounded fixture. It keeps the same
 * canonical source and answer contracts, but makes the final reflection an
 * after-listen check: the learner hears the original range again with captions
 * hidden and recalls what now sounds clearer. The open response is evaluated as
 * self-report and is never persisted by the lab runtime.
 */
export function createGoldenSessionLearningBlueprint(): LessonBlueprintV2 {
  const blueprint = structuredClone(createFixtureLearningBlueprint());
  const gist = blueprint.activities.find(
    (activity) => activity.id === "activity_gist",
  );
  const exit = blueprint.activities.find(
    (activity) => activity.id === "activity_exit",
  );

  if (!gist?.evidence[0] || !exit || exit.activityType !== "exit_ticket") {
    throw new Error("Golden fixture is missing its source or exit activity.");
  }

  exit.evidence = [
    {
      ...gist.evidence[0],
      captionPolicy: "hidden_first",
    },
  ];
  exit.instructionVi =
    "Nghe lại đoạn gốc không phụ đề và kiểm tra điều bạn nghe rõ hơn.";
  exit.promptVi =
    "Không nhìn câu mẫu: bạn nghe được cách nói nào để giới thiệu người nói thuộc một nhóm?";
  exit.feedback = {
    goalVi: "So sánh khả năng nhận ra câu nguồn trước và sau vòng học.",
    nextStepVi:
      "Vidlish sẽ đưa cụm này trở lại trong một input hoặc bối cảnh khác để kiểm tra trí nhớ sau thời gian trì hoãn.",
  };

  return lessonBlueprintV2Schema.parse(blueprint);
}
