import type {
  LessonBlueprintV2,
  LearningActivity,
} from "@/shared/contracts/lesson-v2";

const MAX_LEXICAL_READING_CHARS = 1_800;
const MAX_PASSAGE_READING_CHARS = 4_000;
const MIN_PASSAGE_READING_WORDS = 8;

type ReadingActivity = Extract<
  LearningActivity,
  { activityType: "meaning_in_context" | "gist_choice" }
>;

/**
 * Resolves the exact English text a learner must read from canonical source
 * evidence. The model chooses only evidence references; the server owns the
 * actual source text.
 *
 * A shown `gist_choice` is a passage-reading task, so it has a larger ceiling
 * but also a minimum size. A tiny phrase is not passage comprehension. Other
 * gist choices are listening tasks and must not gain a reading stimulus here.
 */
export function deriveCanonicalReadingContext(
  blueprint: LessonBlueprintV2,
  activity: ReadingActivity,
): string | null {
  if (
    activity.activityType === "gist_choice" &&
    (activity.evidence.length === 0 ||
      !activity.evidence.every((range) => range.captionPolicy === "shown"))
  ) {
    return null;
  }

  const citedIds = new Set(
    activity.evidence.flatMap((range) => range.sourceSegmentIds),
  );
  if (citedIds.size === 0) return null;

  const cited = blueprint.evidenceCatalog
    .filter((evidence) => citedIds.has(evidence.segmentId))
    .sort((left, right) => left.startMs - right.startMs);
  if (cited.length !== citedIds.size) return null;

  const text = cited.map((evidence) => evidence.text.trim()).join(" ").trim();
  if (!text) return null;

  if (activity.activityType === "gist_choice") {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (
      wordCount < MIN_PASSAGE_READING_WORDS ||
      text.length > MAX_PASSAGE_READING_CHARS
    ) {
      return null;
    }
    return text;
  }

  // A lexical-in-context check is a short reading stimulus. Refuse an oversized
  // context instead of truncating away the phrase and still claiming reading.
  if (text.length > MAX_LEXICAL_READING_CHARS) return null;
  return text;
}
