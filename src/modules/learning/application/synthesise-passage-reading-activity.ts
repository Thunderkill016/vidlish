import type { LearningAuthoringDraftV2 } from "@/shared/contracts/learning-authoring-draft-v2";
import type { LearningAuthoringBrief } from "@/shared/contracts/learning-generation-v2";
import type { LearningActivity } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

const MIN_PASSAGE_WORDS = 8;
const MAX_PASSAGE_CHARS = 4_000;

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase("vi").replace(/\s+/g, " ");
}

/**
 * Build one passage-reading gist without another authoring-model decision.
 *
 * The authoring brief already contains selected source windows and their gist.
 * We therefore let the server choose a second window, hydrate its exact English
 * source text, and turn its gated gist into the answer key. The model never
 * writes the passage and cannot cite a window the deterministic gate rejected.
 *
 * One-window lessons simply do not get a passage-reading task. Shipping no
 * reading observation is better than relabelling the initial listen as reading.
 */
export function synthesisePassageReadingActivity(input: {
  brief: LearningAuthoringBrief;
  draft: LearningAuthoringDraftV2;
  transcript: CanonicalTranscript;
  blueprintId: string;
}): LearningActivity | null {
  const listeningGist = input.draft.activities.find(
    (activity) =>
      activity.activityType === "gist_choice" &&
      activity.captionPolicy === "hidden_first",
  );
  if (!listeningGist || input.brief.windows.length < 2) return null;

  const segmentById = new Map(
    input.transcript.segments.map((segment) => [segment.id, segment] as const),
  );
  const listeningWindowIds = new Set(listeningGist.evidenceWindowIds);
  const listeningSegmentIds = new Set(
    input.brief.windows
      .filter((window) => listeningWindowIds.has(window.id))
      .flatMap((window) => window.sourceSegmentIds),
  );

  const candidates = input.brief.windows
    .filter((window) => !listeningWindowIds.has(window.id))
    .flatMap((window) => {
      const segments = window.sourceSegmentIds.flatMap((segmentId) => {
        const segment = segmentById.get(segmentId);
        return segment ? [segment] : [];
      });
      if (segments.length !== window.sourceSegmentIds.length) return [];

      const text = segments
        .sort((left, right) => left.startMs - right.startMs)
        .map((segment) => segment.text.trim())
        .join(" ")
        .trim();
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (
        wordCount < MIN_PASSAGE_WORDS ||
        text.length > MAX_PASSAGE_CHARS
      ) {
        return [];
      }

      const overlapsListening = window.sourceSegmentIds.some((segmentId) =>
        listeningSegmentIds.has(segmentId),
      );
      return [{ window, segments, overlapsListening }];
    })
    // Prefer genuinely unseen text. If selected windows overlap, retaining a
    // reading task is still useful, but the capability projector will
    // conservatively mark that observation as supported.
    .sort(
      (left, right) =>
        Number(left.overlapsListening) - Number(right.overlapsListening),
    );

  const selected = candidates[0];
  if (!selected) return null;

  const distractorWindow = input.brief.windows.find(
    (window) =>
      window.id !== selected.window.id &&
      normalize(window.gistVi) !== normalize(selected.window.gistVi),
  );
  if (!distractorWindow) return null;

  const outcome = input.brief.outcomes[0];
  if (!outcome) return null;

  const usedIds = new Set(input.draft.activities.map((activity) => activity.id));
  let activityId = "activity_passage_reading";
  let suffix = 2;
  while (usedIds.has(activityId)) {
    activityId = `activity_passage_reading_${suffix}`;
    suffix += 1;
  }

  const correct = {
    id: "option_reading_main",
    textVi: selected.window.gistVi,
  };
  const distractor = {
    id: "option_reading_other",
    textVi: distractorWindow.gistVi,
  };
  const lastHex = input.blueprintId.replace(/-/g, "").slice(-1);
  const correctFirst = Number.parseInt(lastHex || "0", 16) % 2 === 0;
  const startMs = Math.min(...selected.segments.map((segment) => segment.startMs));
  const endMs = Math.max(...selected.segments.map((segment) => segment.endMs));

  return {
    id: activityId,
    phase: "gist",
    activityType: "gist_choice",
    outcomeIds: [outcome.id],
    instructionVi: "Đọc đoạn tiếng Anh thật rồi chọn ý chính phù hợp nhất.",
    evidence: [
      {
        sourceSegmentIds: selected.window.sourceSegmentIds,
        startMs,
        endMs,
        captionPolicy: "shown",
        replayAllowed: true,
      },
    ],
    estimatedSeconds: 45,
    promptVi: "Theo đoạn đọc, ý chính phù hợp nhất là gì?",
    options: correctFirst ? [correct, distractor] : [distractor, correct],
    evaluation: {
      kind: "single_choice",
      correctOptionId: correct.id,
    },
    feedback: {
      goalVi: "Nắm ý chính bằng cách đọc chính đoạn tiếng Anh trong nguồn.",
      correctEvidenceVi: `Đúng: ${selected.window.gistVi}`,
      incorrectEvidenceVi: "Lựa chọn đó mô tả một đoạn khác trong video.",
      nextStepVi: "Đọc lại đoạn nguồn và đối chiếu ý chính trước khi tiếp tục.",
    },
  };
}
