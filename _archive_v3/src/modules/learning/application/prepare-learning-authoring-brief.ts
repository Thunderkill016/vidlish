import { z } from "zod";
import { estimateLexicalCoverage, tokenizeEnglish } from "./lexical-coverage";
import { isDue, recordReview, type ReviewState } from "./review-scheduler";
import {
  segmentIntoTopicUnits,
  selectTeachableUnit,
} from "./topic-segmentation";

import {
  languageEligibilityReportSchema,
  type LanguageEligibilityReport,
} from "@/shared/contracts/language-eligibility";
import {
  constrainedDiagnosisProposalSchema,
  learningAuthoringBriefSchema,
  learningCandidateSelectionSchema,
  LEARNING_AUTHORING_BRIEF_VERSION,
  LEARNING_CANDIDATE_SELECTION_VERSION,
  LEARNING_DIAGNOSIS_VERSION,
  type CandidateLanguageProposal,
  type CandidateScoreComponents,
  type ConstrainedDiagnosisProposal,
  type LearningAuthoringBrief,
  type LearningCandidateRejectionReason,
  type LearningCandidateSelection,
  type LearningWindowCandidate,
  type SelectedLearningCandidate,
  type VideoLearningProfileV2,
  videoLearningProfileV2Schema,
} from "@/shared/contracts/learning-generation-v2";
import {
  MAX_EVIDENCE_SEGMENTS,
  learnerContextSnapshotSchema,
  type CanDoOutcome,
  type LearnerContextSnapshot,
} from "@/shared/contracts/lesson-v2";
import {
  canonicalTranscriptSchema,
  type CanonicalTranscript,
} from "@/shared/contracts/transcript";

const jobIdSchema = z.string().uuid();
const titleSchema = z.string().min(1).max(500);
const channelSchema = z.string().min(1).max(300);
const WORD_PATTERN = /[a-z]+(?:['’][a-z]+)*/gi;

const TECHNICAL_TERMS = new Set([
  "api",
  "algorithm",
  "browser",
  "client",
  "code",
  "database",
  "developer",
  "embedded",
  "framework",
  "hardware",
  "javascript",
  "model",
  "parameters",
  "player",
  "server",
  "software",
  "typescript",
  "web",
]);

const BUDGET_LIMITS = {
  5: { maxWindows: 1, maxItems: 2 },
  10: { maxWindows: 2, maxItems: 3 },
  15: { maxWindows: 2, maxItems: 4 },
  20: { maxWindows: 3, maxItems: 5 },
} as const;

const AUTHORING_PERMISSIONS = [
  "instruction_vi",
  "distractors_vi",
  "explanation_vi",
  "transfer_scenario_vi",
  "transfer_example_en",
  "self_check_criteria_vi",
] as const;

const FORBIDDEN_AUTHORING_FIELDS = [
  "source_quote",
  "source_timestamp",
  "canonical_evidence_text",
  "segment_id_outside_allowlist",
  "authoritative_runtime_evaluation",
] as const;

export type LearningGenerationContext = {
  jobId: string;
  videoTitle: string;
  channelName: string;
  transcript: CanonicalTranscript;
  eligibility: LanguageEligibilityReport;
  learnerSnapshot: LearnerContextSnapshot;
  permittedSegments: CanonicalTranscript["segments"];
};

export type PrepareLearningAuthoringBriefInput = {
  jobId: string;
  videoTitle: string;
  channelName: string;
  transcript: CanonicalTranscript;
  eligibility: LanguageEligibilityReport;
  learnerSnapshot: LearnerContextSnapshot;
  diagnosisProposal: ConstrainedDiagnosisProposal;
  
/** Injectable so a test can place the learner at a chosen point in time. */
  now?: Date;
};

export type PreparedLearningAuthoringBrief = {
  videoProfile: VideoLearningProfileV2;
  selection: LearningCandidateSelection;
  authoringBrief: LearningAuthoringBrief;
};

type ScoredCandidate = {
  candidate: SelectedLearningCandidate;
  outcomes: CanDoOutcome[];
};

function normalizeEnglish(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value: string): number {
  return value.match(WORD_PATTERN)?.length ?? 0;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function countWholePhrase(haystack: string, needle: string): number {
  const normalizedHaystack = normalizeEnglish(haystack);
  const normalizedNeedle = normalizeEnglish(needle);
  if (!normalizedHaystack || !normalizedNeedle) return 0;

  const paddedHaystack = ` ${normalizedHaystack} `;
  const paddedNeedle = ` ${normalizedNeedle} `;
  let count = 0;
  let cursor = 0;

  while (cursor <= paddedHaystack.length - paddedNeedle.length) {
    const index = paddedHaystack.indexOf(paddedNeedle, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + paddedNeedle.length - 1;
  }

  return count;
}

function mergeSpeechDurationMs(
  segments: CanonicalTranscript["segments"],
): number {
  const intervals = segments
    .map((segment) => [segment.startMs, segment.endMs] as const)
    .sort((left, right) => left[0] - right[0]);
  if (intervals.length === 0) return 0;

  let durationMs = 0;
  let currentStart = intervals[0][0];
  let currentEnd = intervals[0][1];

  for (const [startMs, endMs] of intervals.slice(1)) {
    if (startMs <= currentEnd) {
      currentEnd = Math.max(currentEnd, endMs);
      continue;
    }
    durationMs += currentEnd - currentStart;
    currentStart = startMs;
    currentEnd = endMs;
  }

  return durationMs + currentEnd - currentStart;
}

function confidenceFromReport(report: LanguageEligibilityReport): number {
  if (report.confidenceBand === "high") return 0.95;
  if (report.confidenceBand === "medium") return 0.8;
  return 0.65;
}

function createWindowId(
  firstSegmentId: string,
  lastSegmentId: string,
): string {
  return `window_${firstSegmentId.slice(4, 12)}_${lastSegmentId.slice(4, 12)}`;
}

/**
 * How many candidate windows a diagnosis is offered.
 *
 * A session is five to twelve minutes, so a lesson never needs every window of
 * a long video — and offering them all has a cost the product paid twice. The
 * profile schema accepts at most a hundred, and an hour-long lecture broke that
 * outright: `diagnose_failed`, before a single model call. Bounding the windows
 * to eight segments each (so a blueprint could hold them) roughly doubled the
 * count and made it worse.
 *
 * Every window also lands in the diagnosis prompt, so the count is prompt size
 * and cost as much as it is a schema limit.
 */
const MAX_OFFERED_WINDOWS = 24;

/**
 * Windows spread across the whole video, not just its opening.
 *
 * Taking the first N would make every lesson from a long video come from its
 * first few minutes, which is a worse lesson and a hidden one: nothing in the
 * output would say the rest of the video was never considered.
 *
 * Exported for its own test. Reaching it through `diagnoseLearningVideo` means
 * going through topic selection first, which narrows a long video to one unit
 * and can leave the sampler with nothing to do — a test that never runs the
 * code it claims to cover.
 */
export function selectOfferedWindows(
  windows: LearningWindowCandidate[],
): LearningWindowCandidate[] {
  // No early return for a short list: with fewer windows than the cap the step
  // is below one and the dedup below hands every window back in order. A branch
  // that cannot change the answer is a branch no test can hold.
  const step = windows.length / MAX_OFFERED_WINDOWS;
  const picked: LearningWindowCandidate[] = [];
  for (let index = 0; index < MAX_OFFERED_WINDOWS; index += 1) {
    const candidate = windows[Math.floor(index * step)];
    if (candidate && candidate !== picked[picked.length - 1]) picked.push(candidate);
  }
  return picked;
}

function buildLearningWindows(
  segments: CanonicalTranscript["segments"],
  evidenceConfidence: number,
): LearningWindowCandidate[] {
  const windows: LearningWindowCandidate[] = [];
  let current: CanonicalTranscript["segments"] = [];
  let currentWordCount = 0;

  const flush = () => {
    const first = current[0];
    const last = current[current.length - 1];
    if (!first || !last) return;

    windows.push({
      id: createWindowId(first.id, last.id),
      sourceSegmentIds: current.map((segment) => segment.id),
      startMs: first.startMs,
      endMs: last.endMs,
      wordCount: currentWordCount,
      evidenceConfidence,
    });
    current = [];
    currentWordCount = 0;
  };

  for (const segment of segments) {
    const first = current[0];
    const last = current[current.length - 1];
    const gapMs = last ? segment.startMs - last.endMs : 0;
    const projectedDurationMs = first ? segment.endMs - first.startMs : 0;

    if (
      current.length > 0 &&
      (gapMs > 3_500 ||
        projectedDurationMs > 30_000 ||
        currentWordCount >= 90 ||
        // A window the blueprint cannot hold is a window nobody can play. The
        // other bounds are about attention span; this one is about what the
        // contract downstream accepts, and it was missing — a caption track of
        // many short cues packed thirteen segments into thirty seconds.
        current.length >= MAX_EVIDENCE_SEGMENTS)
    ) {
      flush();
    }

    current.push(segment);
    currentWordCount += countWords(segment.text);
  }
  flush();

  return windows;
}

function latestReviewOutcome(
  snapshot: LearnerContextSnapshot,
  itemKey: string,
): "again" | "hard" | "good" | null {
  const latest = snapshot.recentReviewOutcomes
    .filter((review) => review.itemKey === itemKey)
    .sort(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    )[0];
  return latest?.outcome ?? null;
}

/**
 * Replays an item's recorded outcomes through the scheduler to find when it
 * next falls due.
 *
 * The snapshot stores the review log rather than a schedule, so the schedule is
 * derived here. Returns null for an item the learner has never been asked to
 * recall.
 */
function reviewStateFor(
  snapshot: LearnerContextSnapshot,
  itemKey: string,
): ReviewState | null {
  const history = snapshot.recentReviewOutcomes
    .filter((review) => review.itemKey === itemKey)
    .sort(
      (left, right) =>
        Date.parse(left.occurredAt) - Date.parse(right.occurredAt),
    );

  let state: ReviewState | null = null;
  for (const review of history) {
    state = recordReview(state, review.outcome, new Date(review.occurredAt));
  }
  return state;
}

function learnerGapScore(
  snapshot: LearnerContextSnapshot,
  itemKey: string,
): number {
  if (snapshot.weakItemKeys.includes(itemKey)) return 1;

  const latest = latestReviewOutcome(snapshot, itemKey);
  if (latest === "again") return 0.9;
  if (latest === "hard") return 0.75;
  if (latest === "good") return 0.15;
  if (snapshot.knownItemKeys.includes(itemKey)) return 0.25;
  return 0.65;
}

function recurrenceOrFrequencyScore(
  recurrenceCount: number,
  frequencyBand: CandidateLanguageProposal["corpusFrequencyBand"],
): number {
  const recurrence = Math.min(
    1,
    0.25 + Math.max(0, recurrenceCount - 1) * 0.2,
  );
  const frequency = {
    high: 0.8,
    mid: 0.6,
    low: 0.35,
    unknown: 0.2,
  }[frequencyBand];
  return clamp01(recurrence * 0.6 + frequency * 0.4);
}

function cognitiveCostPenalty(
  candidate: CandidateLanguageProposal,
  snapshot: LearnerContextSnapshot,
): number {
  const tokenCount = countWords(candidate.surfaceForm);
  let penalty = tokenCount <= 3 ? 0 : tokenCount === 4 ? 0.05 : 0.12;

  if (
    candidate.kind === "grammar_function" ||
    candidate.kind === "pronunciation_pattern"
  ) {
    penalty += 0.04;
  }
  if (snapshot.supportPreference === "more_support" && tokenCount >= 4) {
    penalty += 0.03;
  }

  return clamp01(penalty);
}

function looksLikeProperNounOrTrivia(
  candidate: CandidateLanguageProposal,
): boolean {
  if (candidate.properNounOrTrivia) return true;

  const words = candidate.surfaceForm.match(/[A-Za-z][A-Za-z0-9-]*/g) ?? [];
  return (
    words.length > 0 &&
    words.every((word) => /^[A-Z][A-Za-z0-9-]*$/.test(word))
  );
}

function scoreCandidate(
  candidate: CandidateLanguageProposal,
  snapshot: LearnerContextSnapshot,
  recurrenceCount: number,
): CandidateScoreComponents {
  const learnerGap = learnerGapScore(snapshot, candidate.key);
  const recurrenceOrFrequency = recurrenceOrFrequencyScore(
    recurrenceCount,
    candidate.corpusFrequencyBand,
  );
  const cognitiveCost = cognitiveCostPenalty(candidate, snapshot);
  const total =
    0.24 * learnerGap +
    0.2 * candidate.scoringHints.outcomeRelevance +
    0.16 * candidate.scoringHints.transferValue +
    0.12 * candidate.scoringHints.contextualClarity +
    0.1 * recurrenceOrFrequency +
    0.08 * candidate.scoringHints.pragmaticRegisterValue +
    0.06 * candidate.scoringHints.acousticTeachability +
    0.04 * candidate.evidenceConfidence -
    cognitiveCost;

  return {
    learnerGap: round(learnerGap),
    outcomeRelevance: round(candidate.scoringHints.outcomeRelevance),
    transferValue: round(candidate.scoringHints.transferValue),
    contextualClarity: round(candidate.scoringHints.contextualClarity),
    recurrenceOrFrequency: round(recurrenceOrFrequency),
    pragmaticRegisterValue: round(
      candidate.scoringHints.pragmaticRegisterValue,
    ),
    acousticTeachability: round(
      candidate.scoringHints.acousticTeachability,
    ),
    evidenceConfidence: round(candidate.evidenceConfidence),
    redundancyPenalty: 0,
    cognitiveCostPenalty: round(cognitiveCost),
    properNounOrTriviaPenalty: 0,
    total: round(total),
  };
}

export function assembleLearningGenerationContext(
  input: Omit<PrepareLearningAuthoringBriefInput, "diagnosisProposal">,
): LearningGenerationContext {
  const transcript = canonicalTranscriptSchema.parse(input.transcript);
  const eligibility = languageEligibilityReportSchema.parse(input.eligibility);
  const learnerSnapshot = learnerContextSnapshotSchema.parse(
    input.learnerSnapshot,
  );

  if (eligibility.status !== "eligible") {
    throw new Error("Learning v2 requires an eligible language report.");
  }
  if (transcript.normalizedHash !== eligibility.transcriptHash) {
    throw new Error("Language report does not match the canonical transcript.");
  }

  const segmentById = new Map(
    transcript.segments.map((segment) => [segment.id, segment] as const),
  );
  const englishIds = new Set(eligibility.englishSegmentIds);
  const permittedIds = new Set(eligibility.permittedSegmentIds);

  if (permittedIds.size === 0) {
    throw new Error("Learning v2 requires at least one permitted segment.");
  }
  if (permittedIds.size !== eligibility.permittedSegmentIds.length) {
    throw new Error("Permitted segment IDs must be unique.");
  }

  const permittedSegments = eligibility.permittedSegmentIds.map((segmentId) => {
    const segment = segmentById.get(segmentId);
    if (!segment) {
      throw new Error(`Permitted segment is not canonical: ${segmentId}`);
    }
    if (!englishIds.has(segmentId)) {
      throw new Error(`Permitted segment is not in English evidence: ${segmentId}`);
    }
    return segment;
  });
  permittedSegments.sort((left, right) => left.position - right.position);

  return {
    jobId: jobIdSchema.parse(input.jobId),
    videoTitle: titleSchema.parse(input.videoTitle),
    channelName: channelSchema.parse(input.channelName),
    transcript,
    eligibility,
    learnerSnapshot,
    permittedSegments,
  };
}

export function diagnoseLearningVideo(
  context: LearningGenerationContext,
): VideoLearningProfileV2 {
  const speechDurationMs = mergeSpeechDurationMs(context.permittedSegments);
  const wordCount = context.permittedSegments.reduce(
    (sum, segment) => sum + countWords(segment.text),
    0,
  );
  const density = speechDurationMs / context.transcript.durationMs;
  const speechDensity =
    density < 0.35 ? "low" : density > 0.75 ? "high" : "medium";
  const estimatedSpeechRateWpm =
    speechDurationMs > 0
      ? round(wordCount / (speechDurationMs / 60_000), 1)
      : null;
  const words = context.permittedSegments.flatMap((segment) =>
    normalizeEnglish(segment.text).split(" ").filter(Boolean),
  );
  const technicalCount = words.filter((word) =>
    TECHNICAL_TERMS.has(word),
  ).length;
  const technicalRatio = words.length > 0 ? technicalCount / words.length : 0;
  const register: VideoLearningProfileV2["register"] =
    technicalCount >= 2 ? ["neutral", "technical"] : ["neutral"];
  const backgroundKnowledgeDependency =
    technicalRatio >= 0.08
      ? "high"
      : technicalRatio >= 0.03
        ? "medium"
        : "low";
  const audioChallenge: VideoLearningProfileV2["audioChallenge"] =
    estimatedSpeechRateWpm !== null && estimatedSpeechRateWpm >= 180
      ? ["fast"]
      : ["none"];
  // Windows are breath groups — they flush on a 3.5s pause, 30 seconds, or 90
  // words — so counting them counts breaths, not topics: an hour of video would
  // report roughly 120 "topic shifts" and this number goes straight into the
  // brief the model reads. Topic units measure the thing the field is named
  // after, by looking at where the vocabulary actually turns over.
  const topicUnits = segmentIntoTopicUnits(context.permittedSegments, {
    cefrLevel: context.learnerSnapshot.targetCefr,
  });

  // A budget buys one stretch of video, so an hour-long source has to be
  // narrowed before windows are built — otherwise the model picks three breath
  // groups out of a hundred and twenty with nothing to go on. Coverage answers
  // "which stretch" better than position does; it never answers "whether".
  const teachableUnit =
    topicUnits.length > 1 ? selectTeachableUnit(topicUnits) : null;
  const teachableSegments = teachableUnit
    ? context.permittedSegments.filter((segment) =>
        teachableUnit.segmentIds.includes(segment.id),
      )
    : context.permittedSegments;

  const candidateWindows = selectOfferedWindows(
    buildLearningWindows(
      teachableSegments,
      confidenceFromReport(context.eligibility),
    ),
  );

  return videoLearningProfileV2Schema.parse({
    diagnosisVersion: LEARNING_DIAGNOSIS_VERSION,
    durationMs: context.transcript.durationMs,
    speechDensity,
    estimatedSpeechRateWpm,
    topicShiftCount: Math.max(0, topicUnits.length - 1),
    register,
    audioChallenge,
    lexicalCoverageEstimate: estimateLexicalCoverage(
      context.permittedSegments.flatMap((segment) => tokenizeEnglish(segment.text)),
      context.learnerSnapshot.targetCefr,
    ),
    backgroundKnowledgeDependency,
    candidateWindows,
  });
}

function reject(
  rejections: LearningCandidateSelection["rejections"],
  candidateId: string,
  reason: LearningCandidateRejectionReason,
): void {
  rejections.push({ candidateId, reason });
}

export function gateLearningCandidates(
  context: LearningGenerationContext,
  profile: VideoLearningProfileV2,
  rawProposal: ConstrainedDiagnosisProposal,
  now: Date = new Date(),
): LearningCandidateSelection {
  const proposal = constrainedDiagnosisProposalSchema.parse(rawProposal);
  if (proposal.abstainReason !== null) {
    throw new Error(`Diagnosis abstained: ${proposal.abstainReason}`);
  }

  const permittedIds = new Set(
    context.permittedSegments.map((segment) => segment.id),
  );
  const segmentById = new Map(
    context.permittedSegments.map((segment) => [segment.id, segment] as const),
  );
  const windowById = new Map(
    profile.candidateWindows.map((window) => [window.id, window] as const),
  );
  const transcriptText = context.permittedSegments
    .map((segment) => segment.text)
    .join(" ");
  const rejections: LearningCandidateSelection["rejections"] = [];
  const scored: ScoredCandidate[] = [];
  const seenCandidateIds = new Set<string>();

  for (const proposedWindow of proposal.windows) {
    const window = windowById.get(proposedWindow.windowId);
    if (!window) {
      for (const candidate of proposedWindow.itemCandidates) {
        reject(rejections, candidate.id, "WINDOW_NOT_FOUND");
      }
      continue;
    }

    const windowSegmentIds = new Set(window.sourceSegmentIds);
    const outcomeById = new Map(
      proposedWindow.outcomeCandidates
        .filter((outcome) => outcome.confidence >= 0.6)
        .map((outcome) => [outcome.id, outcome] as const),
    );

    for (const candidate of proposedWindow.itemCandidates) {
      if (seenCandidateIds.has(candidate.id)) {
        reject(rejections, candidate.id, "DUPLICATE_NORMALIZED_FORM");
        continue;
      }
      seenCandidateIds.add(candidate.id);

      if (candidate.sourceSegmentIds.some((id) => !permittedIds.has(id))) {
        reject(rejections, candidate.id, "SEGMENT_NOT_PERMITTED");
        continue;
      }
      if (candidate.sourceSegmentIds.some((id) => !windowSegmentIds.has(id))) {
        reject(rejections, candidate.id, "SEGMENT_OUTSIDE_WINDOW");
        continue;
      }
      if (candidate.outcomeIds.some((id) => !outcomeById.has(id))) {
        reject(rejections, candidate.id, "OUTCOME_NOT_FOUND");
        continue;
      }

      const normalizedForm = normalizeEnglish(candidate.surfaceForm);
      if (normalizedForm !== normalizeEnglish(candidate.normalizedForm)) {
        reject(rejections, candidate.id, "NORMALIZED_FORM_MISMATCH");
        continue;
      }

      const sourceText = candidate.sourceSegmentIds
        .map((segmentId) => segmentById.get(segmentId)?.text ?? "")
        .join(" ");
      if (countWholePhrase(sourceText, normalizedForm) === 0) {
        reject(rejections, candidate.id, "SOURCE_FORM_NOT_FOUND");
        continue;
      }
      // The rejection is named NOT_DUE, so ask whether it is due. The previous
      // test — last outcome was "good" — has no clock in it, so an item recalled
      // once six months ago stayed permanently ineligible and the learner never
      // met it again. Forgetting is what makes it teachable again.
      const reviewState = reviewStateFor(context.learnerSnapshot, candidate.key);
      if (
        context.learnerSnapshot.knownItemKeys.includes(candidate.key) &&
        !context.learnerSnapshot.weakItemKeys.includes(candidate.key) &&
        reviewState !== null &&
        !isDue(reviewState, now)
      ) {
        reject(rejections, candidate.id, "KNOWN_ITEM_NOT_DUE");
        continue;
      }
      if (looksLikeProperNounOrTrivia(candidate)) {
        reject(rejections, candidate.id, "PROPER_NOUN_OR_TRIVIA");
        continue;
      }
      if (!candidate.generatedScenarioPossible) {
        reject(rejections, candidate.id, "NO_TRANSFER_SCENARIO");
        continue;
      }
      if (candidate.scoringHints.contextualClarity < 0.35) {
        reject(rejections, candidate.id, "CONTEXT_TOO_UNCLEAR");
        continue;
      }
      if (candidate.evidenceConfidence < 0.6) {
        reject(rejections, candidate.id, "EVIDENCE_CONFIDENCE_TOO_LOW");
        continue;
      }

      const recurrenceCount = Math.max(
        1,
        countWholePhrase(transcriptText, normalizedForm),
      );
      const outcomes = candidate.outcomeIds.map((outcomeId) => {
        const outcome = outcomeById.get(outcomeId);
        if (!outcome) {
          throw new Error(`Selected candidate lost outcome: ${outcomeId}`);
        }
        return {
          id: outcome.id,
          canDoVi: outcome.canDoVi,
          successEvidenceVi: outcome.successEvidenceVi,
        };
      });

      scored.push({
        candidate: {
          ...candidate,
          normalizedForm,
          windowId: window.id,
          recurrenceCount,
          score: scoreCandidate(
            candidate,
            context.learnerSnapshot,
            recurrenceCount,
          ),
        },
        outcomes,
      });
    }
  }

  scored.sort(
    (left, right) =>
      right.candidate.score.total - left.candidate.score.total ||
      left.candidate.id.localeCompare(right.candidate.id),
  );

  const limits = BUDGET_LIMITS[context.learnerSnapshot.timeBudgetMinutes];
  const selected: ScoredCandidate[] = [];
  const selectedForms = new Set<string>();
  const selectedWindows = new Set<string>();
  const selectedOutcomes = new Set<string>();
  const kindCounts = new Map<CandidateLanguageProposal["kind"], number>();

  for (const item of scored) {
    if (selectedForms.has(item.candidate.normalizedForm)) {
      reject(rejections, item.candidate.id, "DUPLICATE_NORMALIZED_FORM");
      continue;
    }
    if ((kindCounts.get(item.candidate.kind) ?? 0) >= 2) {
      reject(rejections, item.candidate.id, "DIVERSITY_LIMIT");
      continue;
    }

    const addsWindow = !selectedWindows.has(item.candidate.windowId);
    if (
      selected.length >= limits.maxItems ||
      (addsWindow && selectedWindows.size >= limits.maxWindows)
    ) {
      reject(rejections, item.candidate.id, "BUDGET_LIMIT");
      continue;
    }

    const prospectiveOutcomes = new Set(selectedOutcomes);
    for (const outcome of item.outcomes) prospectiveOutcomes.add(outcome.id);
    if (prospectiveOutcomes.size > 4) {
      reject(rejections, item.candidate.id, "BUDGET_LIMIT");
      continue;
    }

    selected.push(item);
    selectedForms.add(item.candidate.normalizedForm);
    selectedWindows.add(item.candidate.windowId);
    for (const outcome of item.outcomes) selectedOutcomes.add(outcome.id);
    kindCounts.set(
      item.candidate.kind,
      (kindCounts.get(item.candidate.kind) ?? 0) + 1,
    );
  }

  if (selected.length === 0) {
    // Say *why*. Without the reasons this failure cannot be read: a model that
    // invents phrases and a gate that is too strict look identical from the
    // outside, and the first is a provider problem while the second is ours.
    const counts = new Map<string, number>();
    for (const rejection of rejections) {
      counts.set(rejection.reason, (counts.get(rejection.reason) ?? 0) + 1);
    }
    const summary =
      [...counts.entries()]
        .sort((left, right) => right[1] - left[1])
        .map(([reason, count]) => `${reason}×${count}`)
        .join(", ") || "no candidates proposed";
    throw new Error(
      `No teachable candidate survived the deterministic gate — ${summary}`,
    );
  }

  const windowOrder = new Map(
    profile.candidateWindows.map((window, index) => [window.id, index] as const),
  );
  const selectedWindowIds = [...selectedWindows].sort(
    (left, right) =>
      (windowOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (windowOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );

  return learningCandidateSelectionSchema.parse({
    selectionVersion: LEARNING_CANDIDATE_SELECTION_VERSION,
    selectedWindowIds,
    selectedOutcomeIds: [...selectedOutcomes],
    selectedItems: selected.map((item) => item.candidate),
    rejections,
  });
}

export function buildLearningAuthoringBrief(
  context: LearningGenerationContext,
  profile: VideoLearningProfileV2,
  rawProposal: ConstrainedDiagnosisProposal,
  selection: LearningCandidateSelection,
): LearningAuthoringBrief {
  const proposal = constrainedDiagnosisProposalSchema.parse(rawProposal);
  const proposalWindowById = new Map(
    proposal.windows.map((window) => [window.windowId, window] as const),
  );
  const profileWindowById = new Map(
    profile.candidateWindows.map((window) => [window.id, window] as const),
  );
  const outcomeById = new Map<string, CanDoOutcome>();

  for (const window of proposal.windows) {
    for (const outcome of window.outcomeCandidates) {
      outcomeById.set(outcome.id, {
        id: outcome.id,
        canDoVi: outcome.canDoVi,
        successEvidenceVi: outcome.successEvidenceVi,
      });
    }
  }

  const windows = selection.selectedWindowIds.map((windowId) => {
    const proposed = proposalWindowById.get(windowId);
    const diagnosed = profileWindowById.get(windowId);
    if (!proposed || !diagnosed) {
      throw new Error(`Authoring window is not grounded: ${windowId}`);
    }
    return {
      id: windowId,
      sourceSegmentIds: diagnosed.sourceSegmentIds,
      gistVi: proposed.gistVi,
      discourseFunctionVi: proposed.discourseFunctionVi,
      evidenceConfidence: diagnosed.evidenceConfidence,
    };
  });

  const outcomes = selection.selectedOutcomeIds.map((outcomeId) => {
    const outcome = outcomeById.get(outcomeId);
    if (!outcome) {
      throw new Error(`Authoring outcome is not grounded: ${outcomeId}`);
    }
    return outcome;
  });

  return learningAuthoringBriefSchema.parse({
    briefVersion: LEARNING_AUTHORING_BRIEF_VERSION,
    jobId: context.jobId,
    videoId: context.transcript.videoId,
    transcriptHash: context.transcript.normalizedHash,
    learner: {
      targetCefr: context.learnerSnapshot.targetCefr,
      goals: context.learnerSnapshot.goals,
      timeBudgetMinutes: context.learnerSnapshot.timeBudgetMinutes,
      supportPreference: context.learnerSnapshot.supportPreference,
    },
    diagnosis: {
      speechDensity: profile.speechDensity,
      estimatedSpeechRateWpm: profile.estimatedSpeechRateWpm,
      topicShiftCount: profile.topicShiftCount,
      register: profile.register,
      audioChallenge: profile.audioChallenge,
      lexicalCoverageEstimate: profile.lexicalCoverageEstimate,
      backgroundKnowledgeDependency: profile.backgroundKnowledgeDependency,
    },
    windows,
    outcomes,
    targetItems: selection.selectedItems,
    authoringPermissions: AUTHORING_PERMISSIONS,
    forbiddenFields: FORBIDDEN_AUTHORING_FIELDS,
  });
}

export function prepareLearningAuthoringBrief(
  input: PrepareLearningAuthoringBriefInput,
): PreparedLearningAuthoringBrief {
  const context = assembleLearningGenerationContext(input);
  const videoProfile = diagnoseLearningVideo(context);
  const selection = gateLearningCandidates(
    context,
    videoProfile,
    input.diagnosisProposal,
    input.now ?? new Date(),
  );
  const authoringBrief = buildLearningAuthoringBrief(
    context,
    videoProfile,
    input.diagnosisProposal,
    selection,
  );

  return { videoProfile, selection, authoringBrief };
}
