import type {
  LessonBlueprintV2,
  LearningActivity,
} from "@/shared/contracts/lesson-v2";

/**
 * Resolves the exact English text a learner must read for a lexical-in-context
 * activity. The model chooses only evidence references; the server owns the
 * actual source text.
 */
export function deriveCanonicalReadingContext(
  blueprint: LessonBlueprintV2,
  activity: Extract<LearningActivity, { activityType: "meaning_in_context" }>,
): string | null {
  const citedIds = new Set(
    activity.evidence.flatMap((range) => range.sourceSegmentIds),
  );
  if (citedIds.size === 0) return null;

  const cited = blueprint.evidenceCatalog
    .filter((evidence) => citedIds.has(evidence.segmentId))
    .sort((left, right) => left.startMs - right.startMs);
  if (cited.length !== citedIds.size) return null;

  const text = cited.map((evidence) => evidence.text.trim()).join(" ").trim();
  // A lexical-in-context check is a short reading stimulus. Refuse an oversized
  // context instead of truncating away the phrase and still claiming reading.
  if (!text || text.length > 1_800) return null;
  return text;
}
