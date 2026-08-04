import {
  LANGUAGE_DETECTOR_ID,
  LANGUAGE_DETECTOR_VERSION,
  languageEligibilityReportSchema,
  type LanguageAnalysisResult,
  type LanguageEligibilityPolicy,
  type LanguageEligibilityReport,
  type LanguageWindowResult,
} from "@/shared/contracts/language-eligibility";

function duration(window: LanguageWindowResult): number {
  return window.endMs - window.startMs;
}

function longestCoherentEnglishDuration(
  englishWindows: LanguageWindowResult[],
  maxGapMs: number,
): number {
  const sorted = [...englishWindows].sort(
    (left, right) => left.startMs - right.startMs,
  );
  let longest = 0;
  let runStart: number | undefined;
  let runEnd: number | undefined;

  for (const window of sorted) {
    if (
      runStart === undefined ||
      runEnd === undefined ||
      window.startMs - runEnd > maxGapMs
    ) {
      runStart = window.startMs;
      runEnd = window.endMs;
    } else {
      runEnd = Math.max(runEnd, window.endMs);
    }
    longest = Math.max(longest, runEnd - runStart);
  }
  return longest;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function evaluateLanguageEligibility(input: {
  transcriptHash: string;
  allSegmentIds: string[];
  analysis: LanguageAnalysisResult;
  policy: LanguageEligibilityPolicy;
}): LanguageEligibilityReport {
  const { analysis, policy } = input;
  if (
    analysis.detectorId !== LANGUAGE_DETECTOR_ID ||
    analysis.detectorVersion !== LANGUAGE_DETECTOR_VERSION
  ) {
    throw new Error("Unexpected language detector contract.");
  }

  const totalDurationMs = analysis.windows.reduce(
    (total, window) => total + duration(window),
    0,
  );
  const reliableWindows = analysis.windows.filter(
    (window) =>
      window.reliability !== "low" && window.detectedLanguage !== "und",
  );
  const reliableDurationMs = reliableWindows.reduce(
    (total, window) => total + duration(window),
    0,
  );
  const reliableAnalyzedWordCount = reliableWindows.reduce(
    (total, window) => total + window.wordCount,
    0,
  );
  const englishWindows = reliableWindows.filter(
    (window) => window.detectedLanguage === "en",
  );
  const englishDurationMs = englishWindows.reduce(
    (total, window) => total + duration(window),
    0,
  );
  const reliableEnglishWordCount = englishWindows.reduce(
    (total, window) => total + window.wordCount,
    0,
  );
  const englishShare =
    reliableDurationMs > 0 ? englishDurationMs / reliableDurationMs : 0;
  const reliableCoverage =
    totalDurationMs > 0 ? reliableDurationMs / totalDurationMs : 0;
  const coherentEnglishDurationMs = longestCoherentEnglishDuration(
    englishWindows,
    policy.maxWindowGapMs,
  );
  const evidenceIsReliable =
    reliableCoverage >= policy.evidenceMinReliableCoverage &&
    reliableAnalyzedWordCount >= policy.evidenceMinReliableWords &&
    reliableWindows.length >= policy.evidenceMinWindows;

  const mainPath =
    evidenceIsReliable &&
    englishShare >= policy.mainMinEnglishShare &&
    coherentEnglishDurationMs >= policy.mainMinCoherentDurationMs &&
    reliableEnglishWordCount >= policy.mainMinEnglishWords;
  const mixedPath =
    evidenceIsReliable &&
    englishShare >= policy.mixedMinEnglishShare &&
    coherentEnglishDurationMs >= policy.mixedMinCoherentDurationMs &&
    reliableEnglishWordCount >= policy.mixedMinEnglishWords;

  const status = !evidenceIsReliable
    ? "insufficient_evidence"
    : mainPath || mixedPath
      ? "eligible"
      : "ineligible";
  const reason = !evidenceIsReliable
    ? "TRANSCRIPT_EVIDENCE_TOO_WEAK"
    : mainPath
      ? "SUFFICIENT_ORIGINAL_ENGLISH"
      : mixedPath
        ? "SUFFICIENT_MIXED_LANGUAGE_ENGLISH_PORTION"
        : "INSUFFICIENT_ORIGINAL_ENGLISH";

  const englishSegmentIds = uniqueSorted(
    englishWindows.flatMap((window) => window.segmentIds),
  );
  const permittedSegmentIds = status === "eligible" ? englishSegmentIds : [];
  const permitted = new Set(permittedSegmentIds);
  const excludedSegmentIds = uniqueSorted(
    input.allSegmentIds.filter((segmentId) => !permitted.has(segmentId)),
  );
  const detectedLanguages = uniqueSorted(
    reliableWindows.map((window) => window.detectedLanguage),
  );
  const confidenceBand = !evidenceIsReliable
    ? "low"
    : reliableCoverage >= 0.75 &&
        reliableAnalyzedWordCount >= policy.evidenceMinReliableWords * 2
      ? "high"
      : "medium";

  return languageEligibilityReportSchema.parse({
    transcriptHash: input.transcriptHash,
    detectorId: analysis.detectorId,
    detectorVersion: analysis.detectorVersion,
    policyVersion: policy.policyVersion,
    status,
    reason,
    englishShare,
    reliableCoverage,
    coherentEnglishDurationMs,
    reliableEnglishWordCount,
    reliableAnalyzedWordCount,
    confidenceBand,
    detectedLanguages,
    windowEvidence: analysis.windows,
    englishSegmentIds,
    permittedSegmentIds,
    excludedSegmentIds,
  });
}
