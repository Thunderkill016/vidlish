import type { LearningSupportCopyByActivity } from "@/adapters/fake/fixture-learning-runtime-policy";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

/**
 * Writes the support text a generated lesson offers when a learner asks for help.
 *
 * The fixture lesson carries hand-written hints, which cannot exist for a lesson
 * nobody wrote by hand. Everything here is derived from Vietnamese the blueprint
 * already contains, so no new claim is introduced and nothing has to be authored
 * twice.
 *
 * Only `context_hint` is filled. The other steps either need no words — replay,
 * captions — or could only be filled with the answer itself, and a hint that
 * hands over the answer is not a hint.
 */
export function deriveLearningSupportCopy(
  blueprint: LessonBlueprintV2,
): LearningSupportCopyByActivity {
  const outcomeById = new Map(
    blueprint.outcomes.map((outcome) => [outcome.id, outcome] as const),
  );

  const copy: LearningSupportCopyByActivity = {};
  for (const activity of blueprint.activities) {
    const outcome = outcomeById.get(activity.outcomeIds[0] ?? "");
    if (!outcome) continue;
    // What the learner is trying to be able to do. It points at the task
    // without naming the phrase, which is exactly what a first hint should do.
    copy[activity.id] = { context_hint: outcome.canDoVi };
  }
  return copy;
}
