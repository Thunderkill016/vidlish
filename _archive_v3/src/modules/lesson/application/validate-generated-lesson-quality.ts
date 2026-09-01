import type { LessonDraft } from "@/shared/contracts/lesson";

export type PermittedLessonSegment = Readonly<{
  id: string;
  text: string;
}>;

export type LessonQualityIssueCode =
  | "DUPLICATE_VOCABULARY"
  | "DUPLICATE_PHRASE"
  | "DUPLICATE_QUESTION_OPTIONS"
  | "INVALID_CLOZE_BLANK"
  | "UNGROUNDED_VOCABULARY_TERM"
  | "UNGROUNDED_PHRASE"
  | "UNGROUNDED_CLOZE_ANSWER"
  | "COPIED_EXAMPLE";

export type LessonQualityIssue = Readonly<{
  code: LessonQualityIssueCode;
  path: string;
}>;

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function citationText(
  sourceSegmentIds: readonly string[],
  byId: ReadonlyMap<string, string>,
): string {
  return sourceSegmentIds
    .map((id) => byId.get(id) ?? "")
    .join(" ");
}

/**
 * How many neighbouring cues a cited phrase may run into.
 *
 * Caption cues are not sentences. On many YouTube videos they are five-word
 * fragments that break mid-phrase — "This is the deathnut" / "challenge." — so
 * a phrase the speaker plainly said does not fit inside any single cue.
 *
 * Measured on a real failing video: the model taught "at the same time" and
 * "winners", both spoken in the video, both spanning a cue boundary, and the
 * gate rejected the whole lesson. Every Gemini model failed the same way,
 * because no model can guess which neighbouring cue to cite as well.
 *
 * Two is enough for a fragment split across a boundary without turning the
 * check into "anywhere in the video", which is what would actually let a
 * hallucination through.
 */
const ADJACENT_CUE_REACH = 2;

/**
 * The speech a citation covers, plus the cues immediately after it.
 *
 * This does not widen what a lesson may quote: every cue here is already a
 * permitted segment, so the speech is still real and still inside the language
 * gate's allowlist. Only the citation's boundary is treated as approximate,
 * because cue boundaries are an artefact of captioning, not of speech.
 */
function groundingWindow(
  sourceSegmentIds: readonly string[],
  permittedSegments: ReadonlyArray<PermittedLessonSegment>,
  byId: ReadonlyMap<string, string>,
): string {
  const positions = sourceSegmentIds
    .map((id) => permittedSegments.findIndex((segment) => segment.id === id))
    .filter((index) => index >= 0);
  if (positions.length === 0) return citationText(sourceSegmentIds, byId);

  // Symmetric. Measured on the failing video, a rejected phrase sat three cues
  // *before* the cited one — a forward-only window missed it. Cue boundaries
  // are arbitrary in both directions, so reaching in only one was arbitrary too.
  const start = Math.max(0, Math.min(...positions) - ADJACENT_CUE_REACH);
  const end = Math.max(...positions) + ADJACENT_CUE_REACH;
  return permittedSegments
    .slice(start, end + 1)
    .map((segment) => segment.text)
    .join(" ");
}

function containsGroundedText(haystack: string, needle: string): boolean {
  const normalizedNeedle = normalize(needle);
  if (!normalizedNeedle) return false;
  return normalize(haystack).includes(normalizedNeedle);
}

/**
 * Deterministic post-model gate for constraints that JSON Schema cannot express.
 * It never scores learner ability and never repairs model output. A failed draft
 * is rejected so the provider/workflow can retry or surface a real defect.
 */
export function validateGeneratedLessonQuality(
  draft: LessonDraft,
  permittedSegments: ReadonlyArray<PermittedLessonSegment>,
): LessonQualityIssue[] {
  const issues: LessonQualityIssue[] = [];
  const byId = new Map(permittedSegments.map((segment) => [segment.id, segment.text]));
  const exactSourceSentences = new Set(
    permittedSegments.map((segment) => normalize(segment.text)).filter(Boolean),
  );

  const seenVocabulary = new Set<string>();
  draft.vocabulary.forEach((item, index) => {
    const normalizedTerm = normalize(item.term);
    if (seenVocabulary.has(normalizedTerm)) {
      issues.push({ code: "DUPLICATE_VOCABULARY", path: `vocabulary.${index}.term` });
    }
    seenVocabulary.add(normalizedTerm);

    const source = groundingWindow(item.sourceSegmentIds, permittedSegments, byId);
    if (!containsGroundedText(source, item.term)) {
      issues.push({ code: "UNGROUNDED_VOCABULARY_TERM", path: `vocabulary.${index}.term` });
    }
    if (exactSourceSentences.has(normalize(item.exampleEn))) {
      issues.push({ code: "COPIED_EXAMPLE", path: `vocabulary.${index}.exampleEn` });
    }
  });

  const seenPhrases = new Set<string>();
  draft.phrases.forEach((item, index) => {
    const normalizedPhrase = normalize(item.phrase);
    if (seenPhrases.has(normalizedPhrase)) {
      issues.push({ code: "DUPLICATE_PHRASE", path: `phrases.${index}.phrase` });
    }
    seenPhrases.add(normalizedPhrase);

    const source = groundingWindow(item.sourceSegmentIds, permittedSegments, byId);
    if (!containsGroundedText(source, item.phrase)) {
      issues.push({ code: "UNGROUNDED_PHRASE", path: `phrases.${index}.phrase` });
    }
  });

  draft.grammarPoints.forEach((item, index) => {
    if (exactSourceSentences.has(normalize(item.exampleEn))) {
      issues.push({ code: "COPIED_EXAMPLE", path: `grammarPoints.${index}.exampleEn` });
    }
  });

  draft.comprehensionQuestions.forEach((item, index) => {
    const normalizedOptions = item.options.map(normalize);
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      issues.push({
        code: "DUPLICATE_QUESTION_OPTIONS",
        path: `comprehensionQuestions.${index}.options`,
      });
    }
  });

  draft.clozeItems.forEach((item, index) => {
    const blankCount = item.sentence.split("___").length - 1;
    if (blankCount !== 1) {
      issues.push({ code: "INVALID_CLOZE_BLANK", path: `clozeItems.${index}.sentence` });
    }

    const source = citationText(item.sourceSegmentIds, byId);
    if (!containsGroundedText(source, item.answer)) {
      issues.push({ code: "UNGROUNDED_CLOZE_ANSWER", path: `clozeItems.${index}.answer` });
    }
  });

  return issues;
}
