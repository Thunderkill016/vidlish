import { checkComprehensibleInput } from "@/modules/learning/application/check-comprehensible-input";
import type { FoundationUnit } from "@/shared/contracts/curriculum";

/**
 * Which of a unit's activities the learner can actually attempt yet.
 *
 * A Pre-A1 chunk is still several words. `my name is` is three, and to someone
 * who knows nothing it is three unknown words arriving together — which is the
 * i+1 rule broken by the curriculum rather than by the sentence generator. The
 * gate does not stop applying because the language came from a syllabus.
 *
 * So the same rule decides: a chunk is reachable when at most one of its words
 * is new. Until then the beginner word path keeps working, and the unit takes
 * over the moment its language is within reach. That ordering is not a
 * compromise between two systems — it is what lets a curriculum exist at all
 * for someone starting from zero.
 */
export function reachableActivities(
  unit: FoundationUnit,
  known: ReadonlySet<string>,
): FoundationUnit["activities"] {
  return unit.activities.filter((activity) =>
    activity.targets.every((target) => {
      const verdict = checkComprehensibleInput({
        sentence: target,
        known,
        // One unknown word inside the chunk, the same budget a sentence gets.
        maxNewWords: 1,
      });
      return verdict.kind !== "too_hard";
    }),
  );
}
