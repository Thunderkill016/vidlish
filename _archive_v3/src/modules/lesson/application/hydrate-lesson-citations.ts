import type { LessonCitation, LessonDraft } from "@/shared/contracts/lesson";

export type PermittedSegment = {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
};

export class LessonGroundingError extends Error {
  readonly name = "LessonGroundingError";
}

/** Every `sourceSegmentIds` array in the draft, in one flat list. */
function citedSegmentIds(draft: LessonDraft): string[] {
  return [
    ...draft.vocabulary,
    ...draft.phrases,
    ...draft.grammarPoints,
    ...draft.comprehensionQuestions,
    ...draft.clozeItems,
  ].flatMap((item) => item.sourceSegmentIds);
}

/**
 * Turns the model's segment IDs into real quotes, and rejects the draft if it
 * cited anything outside the permitted set.
 *
 * This is the grounding gate. The model never returns quote text, so a
 * fabricated quote cannot exist; what it *can* do is cite a segment that was
 * never permitted — a non-English one, or an ID it invented. Both fail here,
 * before anything is persisted or shown.
 */
export function hydrateLessonCitations(
  draft: LessonDraft,
  permitted: ReadonlyArray<PermittedSegment>,
): LessonCitation[] {
  const bySegmentId = new Map(permitted.map((segment) => [segment.id, segment]));
  const cited = citedSegmentIds(draft);

  const unknown = [...new Set(cited)].filter((id) => !bySegmentId.has(id));
  if (unknown.length > 0) {
    throw new LessonGroundingError(
      `Lesson cited ${unknown.length} segment(s) outside the permitted transcript.`,
    );
  }

  const cloze = draft.clozeItems.find(
    (item) => !item.sentence.includes("___"),
  );
  if (cloze) {
    throw new LessonGroundingError("Cloze item has no blank.");
  }

  return [...new Set(cited)]
    .map((id) => {
      const segment = bySegmentId.get(id);
      if (!segment) throw new LessonGroundingError("Unreachable: unknown segment.");
      return {
        segmentId: segment.id,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
      };
    })
    .sort((left, right) => left.startMs - right.startMs);
}
