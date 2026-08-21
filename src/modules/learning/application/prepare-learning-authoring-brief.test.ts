import { describe, expect, it } from "vitest";

import {
  assembleLearningGenerationContext,
  diagnoseLearningVideo,
  prepareLearningAuthoringBrief,
  selectOfferedWindows,
} from "@/modules/learning/application/prepare-learning-authoring-brief";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";
import type {
  CandidateLanguageProposal,
  ConstrainedDiagnosisProposal,
} from "@/shared/contracts/learning-generation-v2";
import {
  MAX_EVIDENCE_SEGMENTS,
  type LearnerContextSnapshot,
} from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

const segA = `seg_${"a".repeat(32)}`;
const segB = `seg_${"b".repeat(32)}`;
const segC = `seg_${"c".repeat(32)}`;
const segD = `seg_${"d".repeat(32)}`;

function createTranscript(): CanonicalTranscript {
  return {
    videoId: "M7lc1UVf-VE",
    strategyId: "supadata-native-caption",
    provider: "supadata",
    sourceType: "native_caption",
    declaredLanguage: "en",
    availableLanguages: ["en"],
    trackKind: "manual",
    translationStatus: "original",
    normalizedHash: "f".repeat(64),
    normalizationVersion: "transcript-normalization:v1",
    durationMs: 60_000,
    segments: [
      {
        id: segA,
        position: 0,
        startMs: 0,
        endMs: 10_000,
        text: "I'm a member of the Developer Relations team.",
        confidence: 0.99,
        detectedLanguage: "en",
      },
      {
        id: segB,
        position: 1,
        startMs: 10_000,
        endMs: 20_000,
        text: "Today we'll explore different ways of customizing the YouTube-embedded player.",
        confidence: 0.99,
        detectedLanguage: "en",
      },
      {
        id: segC,
        position: 2,
        startMs: 23_000,
        endMs: 33_000,
        text: "First, let's look at the player parameters and browser options.",
        confidence: 0.97,
        detectedLanguage: "en",
      },
      {
        id: segD,
        position: 3,
        startMs: 45_000,
        endMs: 52_000,
        text: "The Acme Platform launched in 2020.",
        confidence: 0.95,
        detectedLanguage: "en",
      },
    ],
  };
}

function createEligibility(
  permittedSegmentIds = [segA, segB, segC, segD],
): LanguageEligibilityReport {
  return {
    transcriptHash: "f".repeat(64),
    detectorId: "franc-min",
    detectorVersion: "franc-min:6.2.0",
    policyVersion: "original-english:v1",
    status: "eligible",
    reason: "SUFFICIENT_ORIGINAL_ENGLISH",
    englishShare: 1,
    reliableCoverage: 1,
    coherentEnglishDurationMs: 37_000,
    reliableEnglishWordCount: 42,
    reliableAnalyzedWordCount: 42,
    confidenceBand: "high",
    detectedLanguages: ["en"],
    windowEvidence: [
      {
        windowId: `win_${"1".repeat(24)}`,
        segmentIds: [segA, segB, segC, segD],
        startMs: 0,
        endMs: 52_000,
        wordCount: 42,
        characterCount: 260,
        detectorCode: "eng",
        detectedLanguage: "en",
        reliability: "high",
        rawBestScore: 0.99,
        rawSecondScore: 0.2,
      },
    ],
    englishSegmentIds: [segA, segB, segC, segD],
    permittedSegmentIds,
    excludedSegmentIds: [segA, segB, segC, segD].filter(
      (segmentId) => !permittedSegmentIds.includes(segmentId),
    ),
  };
}

function createLearnerSnapshot(): LearnerContextSnapshot {
  return {
    targetCefr: "B1",
    goals: ["listening", "conversation"],
    timeBudgetMinutes: 5,
    supportPreference: "balanced",
    knownItemKeys: ["player"],
    weakItemKeys: ["a-member-of"],
    // Four spaced recalls, not one. A single correct answer on a brand-new item
    // means "come back in ten minutes", not "known" — a genuinely known item is
    // one the learner has held onto across widening gaps.
    recentReviewOutcomes: [
      {
        itemKey: "player",
        outcome: "good",
        occurredAt: "2026-06-01T09:00:00+00:00",
      },
      {
        itemKey: "player",
        outcome: "good",
        occurredAt: "2026-06-02T09:00:00+00:00",
      },
      {
        itemKey: "player",
        outcome: "good",
        occurredAt: "2026-06-20T09:00:00+00:00",
      },
      {
        itemKey: "player",
        outcome: "good",
        occurredAt: "2026-08-06T09:00:00+00:00",
      },
    ],
  };
}

type CandidateInput = Pick<
  CandidateLanguageProposal,
  "id" | "key" | "surfaceForm" | "sourceSegmentIds" | "outcomeIds"
> &
  Partial<
    Omit<
      CandidateLanguageProposal,
      "id" | "key" | "surfaceForm" | "sourceSegmentIds" | "outcomeIds"
    >
  >;

function createCandidate(input: CandidateInput): CandidateLanguageProposal {
  return {
    id: input.id,
    key: input.key,
    surfaceForm: input.surfaceForm,
    normalizedForm:
      input.normalizedForm ?? input.surfaceForm.toLocaleLowerCase("en-US"),
    sourceSegmentIds: input.sourceSegmentIds,
    outcomeIds: input.outcomeIds,
    kind: input.kind ?? "chunk",
    contextualMeaningVi:
      input.contextualMeaningVi ?? "ý nghĩa theo ngữ cảnh của đoạn nguồn",
    communicativeFunctionVi:
      input.communicativeFunctionVi ?? "thực hiện một chức năng giao tiếp rõ ràng",
    register: input.register ?? "neutral",
    corpusFrequencyBand: input.corpusFrequencyBand ?? "mid",
    evidenceConfidence: input.evidenceConfidence ?? 0.95,
    properNounOrTrivia: input.properNounOrTrivia ?? false,
    generatedScenarioPossible: input.generatedScenarioPossible ?? true,
    scoringHints: input.scoringHints ?? {
      outcomeRelevance: 0.85,
      transferValue: 0.8,
      contextualClarity: 0.95,
      pragmaticRegisterValue: 0.65,
      acousticTeachability: 0.55,
    },
    rationaleVi:
      input.rationaleVi ??
      "Candidate có nguồn rõ, chức năng giao tiếp rõ và có thể chuyển giao.",
  };
}

function createProposal(): ConstrainedDiagnosisProposal {
  return {
    proposalVersion: "learning-diagnosis-proposal:v2",
    abstainReason: null,
    windows: [
      {
        windowId: "window_aaaaaaaa_bbbbbbbb",
        gistVi:
          "Người nói giới thiệu vai trò của mình và chủ đề về trình phát YouTube nhúng.",
        discourseFunctionVi: "giới thiệu người nói và báo trước chủ đề",
        outcomeCandidates: [
          {
            id: "outcome_main_topic",
            canDoVi: "Xác định được chủ đề chính trong phần mở đầu ngắn.",
            successEvidenceVi:
              "Chọn đúng chủ đề trước khi xem transcript đầy đủ.",
            confidence: 0.95,
          },
          {
            id: "outcome_affiliation",
            canDoVi:
              "Dùng a member of để giới thiệu mình thuộc một nhóm hoặc tổ chức.",
            successEvidenceVi:
              "Tạo được một câu mới phù hợp với tình huống giới thiệu.",
            confidence: 0.96,
          },
        ],
        itemCandidates: [
          createCandidate({
            id: "candidate_member_of",
            key: "a-member-of",
            surfaceForm: "a member of",
            sourceSegmentIds: [segA],
            outcomeIds: ["outcome_affiliation"],
            corpusFrequencyBand: "high",
            scoringHints: {
              outcomeRelevance: 0.98,
              transferValue: 0.95,
              contextualClarity: 0.98,
              pragmaticRegisterValue: 0.8,
              acousticTeachability: 0.7,
            },
          }),
          createCandidate({
            id: "candidate_different_ways",
            key: "different-ways-of",
            surfaceForm: "different ways of",
            sourceSegmentIds: [segB],
            outcomeIds: ["outcome_main_topic"],
          }),
          createCandidate({
            id: "candidate_invented",
            key: "invented-phrase",
            surfaceForm: "invented phrase",
            sourceSegmentIds: [segB],
            outcomeIds: ["outcome_main_topic"],
          }),
          createCandidate({
            id: "candidate_player",
            key: "player",
            surfaceForm: "player",
            sourceSegmentIds: [segB],
            outcomeIds: ["outcome_main_topic"],
            kind: "word",
          }),
        ],
      },
      {
        windowId: "window_cccccccc_cccccccc",
        gistVi: "Người nói chuyển sang các tham số và lựa chọn trong trình duyệt.",
        discourseFunctionVi: "bắt đầu phần giải thích kỹ thuật",
        outcomeCandidates: [
          {
            id: "outcome_parameters",
            canDoVi: "Nhận ra người nói đang chuyển sang phần tham số kỹ thuật.",
            successEvidenceVi:
              "Xác định đúng cụm báo hiệu nội dung tham số của trình phát.",
            confidence: 0.9,
          },
        ],
        itemCandidates: [
          createCandidate({
            id: "candidate_player_parameters",
            key: "player-parameters",
            surfaceForm: "player parameters",
            sourceSegmentIds: [segC],
            outcomeIds: ["outcome_parameters"],
            register: "technical",
            corpusFrequencyBand: "low",
          }),
        ],
      },
      {
        windowId: "window_dddddddd_dddddddd",
        gistVi: "Một câu riêng nhắc tới tên nền tảng và thời điểm ra mắt.",
        discourseFunctionVi: "cung cấp chi tiết nền",
        outcomeCandidates: [
          {
            id: "outcome_background_detail",
            canDoVi: "Nhận ra một chi tiết nền không phải trọng tâm bài học.",
            successEvidenceVi:
              "Phân biệt được chi tiết tên riêng với mục tiêu giao tiếp chính.",
            confidence: 0.8,
          },
        ],
        itemCandidates: [
          createCandidate({
            id: "candidate_acme_platform",
            key: "acme-platform",
            surfaceForm: "Acme Platform",
            normalizedForm: "acme platform",
            sourceSegmentIds: [segD],
            outcomeIds: ["outcome_background_detail"],
            register: "technical",
            corpusFrequencyBand: "low",
            properNounOrTrivia: true,
            generatedScenarioPossible: false,
          }),
        ],
      },
    ],
  };
}

function createInput() {
  return {
    jobId: "22222222-2222-4222-8222-222222222222",
    videoTitle: "Embedded player customization",
    channelName: "Fixture channel",
    transcript: createTranscript(),
    eligibility: createEligibility(),
    learnerSnapshot: createLearnerSnapshot(),
    diagnosisProposal: createProposal(),
    // Pinned one day after the fixture's only review. Without a fixed clock
    // these assertions would quietly change meaning as the calendar moves.
    now: new Date("2026-08-07T09:00:00+00:00"),
  };
}

/**
 * A 20-minute transcript that changes subject once, halfway through. Long
 * enough that breath-group counting and topic counting give visibly different
 * answers, which is the whole point of the field.
 */
function createLongTranscript(): CanonicalTranscript {
  const line = (index: number, text: string) => ({
    id: `seg_${String(index).padStart(32, "0")}`,
    position: index,
    startMs: index * 10_000,
    endMs: index * 10_000 + 10_000,
    text,
    confidence: 0.99,
    detectedLanguage: "en" as const,
  });
  const segments = [
    ...Array.from({ length: 60 }, (_, index) =>
      line(index, "we sear the salmon and reduce the butter sauce in the pan"),
    ),
    ...Array.from({ length: 60 }, (_, index) =>
      line(
        index + 60,
        "the telescope resolves distant galaxies beyond the nebula cluster",
      ),
    ),
  ];
  return { ...createTranscript(), durationMs: 1_200_000, segments };
}

function createLongEligibility(
  transcript: CanonicalTranscript,
): LanguageEligibilityReport {
  const ids = transcript.segments.map((segment) => segment.id);
  return {
    ...createEligibility(),
    englishSegmentIds: ids,
    permittedSegmentIds: ids,
    excludedSegmentIds: [],
    windowEvidence: [
      {
        ...createEligibility().windowEvidence[0]!,
        segmentIds: ids,
        endMs: 1_200_000,
      },
    ],
  };
}

describe("prepareLearningAuthoringBrief", () => {
  it("assembles only canonical permitted English segments", () => {
    const input = createInput();
    const context = assembleLearningGenerationContext({
      ...input,
      eligibility: createEligibility([segB, segA]),
    });

    expect(context.permittedSegments.map((segment) => segment.id)).toEqual([
      segA,
      segB,
    ]);
    expect(context.permittedSegments.some((segment) => segment.id === segC)).toBe(
      false,
    );
  });

  it("fails closed when language evidence does not match the transcript", () => {
    const input = createInput();
    expect(() =>
      assembleLearningGenerationContext({
        ...input,
        eligibility: {
          ...input.eligibility,
          transcriptHash: "e".repeat(64),
        },
      }),
    ).toThrow(/does not match the canonical transcript/i);
  });

  it("creates conservative transcript-derived diagnostics without claiming accent or noise", () => {
    const input = createInput();
    const context = assembleLearningGenerationContext(input);
    const profile = diagnoseLearningVideo(context);

    expect(profile.candidateWindows.map((window) => window.id)).toEqual([
      "window_aaaaaaaa_bbbbbbbb",
      "window_cccccccc_cccccccc",
      "window_dddddddd_dddddddd",
    ]);
    // Zero, not two. The fixture is a single 60-second stretch on one subject;
    // the three windows are breath groups, and counting those as topic shifts
    // told the model an unbroken minute changed subject twice.
    expect(profile.topicShiftCount).toBe(0);
    expect(profile.speechDensity).toBe("medium");
    expect(profile.register).toContain("technical");
    expect(profile.audioChallenge).not.toContain("accent");
    expect(profile.audioChallenge).not.toContain("noise");
    // Was hardcoded to null while every other diagnostic was computed, so the
    // pipeline could never tell a teachable video from an impossible one.
    expect(profile.lexicalCoverageEstimate).not.toBeNull();
    expect(profile.lexicalCoverageEstimate).toBeGreaterThan(0);
    expect(profile.lexicalCoverageEstimate).toBeLessThanOrEqual(1);
  });

  it("grounds candidates, applies learner gap and respects the five-minute budget", () => {
    const prepared = prepareLearningAuthoringBrief(createInput());

    expect(prepared.selection.selectedWindowIds).toEqual([
      "window_aaaaaaaa_bbbbbbbb",
    ]);
    expect(prepared.selection.selectedItems.map((item) => item.id)).toEqual([
      "candidate_member_of",
      "candidate_different_ways",
    ]);
    expect(prepared.selection.selectedItems).toHaveLength(2);
    expect(prepared.selection.selectedItems[0].score.learnerGap).toBe(1);
    expect(prepared.selection.rejections).toEqual(
      expect.arrayContaining([
        {
          candidateId: "candidate_invented",
          reason: "SOURCE_FORM_NOT_FOUND",
        },
        {
          candidateId: "candidate_player",
          reason: "KNOWN_ITEM_NOT_DUE",
        },
        {
          candidateId: "candidate_acme_platform",
          reason: "PROPER_NOUN_OR_TRIVIA",
        },
        {
          candidateId: "candidate_player_parameters",
          reason: "DIVERSITY_LIMIT",
        },
      ]),
    );
  });

  it("gives the authoring model IDs and labels but never canonical quote text or timestamps", () => {
    const prepared = prepareLearningAuthoringBrief(createInput());
    const serialized = JSON.stringify(prepared.authoringBrief);

    expect(serialized).not.toContain("Developer Relations team");
    expect(serialized).not.toContain("YouTube-embedded player");
    expect(serialized).not.toContain('"startMs"');
    expect(serialized).not.toContain('"endMs"');
    expect(serialized).not.toContain('"text"');
    expect(prepared.authoringBrief.windows[0].sourceSegmentIds).toEqual([
      segA,
      segB,
    ]);
    expect(prepared.authoringBrief.forbiddenFields).toContain("source_quote");
    expect(prepared.authoringBrief.forbiddenFields).toContain(
      "segment_id_outside_allowlist",
    );
  });

  it("counts real topic shifts in a long video, not breath groups", () => {
    // Twenty minutes on two subjects. Breath groups would have reported this as
    // roughly forty topic shifts; the answer a learner would give is "one".
    const long = createLongTranscript();
    const context = assembleLearningGenerationContext({
      ...createInput(),
      transcript: long,
      eligibility: createLongEligibility(long),
    });
    const profile = diagnoseLearningVideo(context);

    expect(profile.topicShiftCount).toBeGreaterThan(0);
    expect(profile.topicShiftCount).toBeLessThan(10);
  });

  it("narrows a long video to one teachable stretch before building windows", () => {
    // Twenty minutes yields well over a hundred breath groups. Handing all of
    // them to the model means it picks three at random; the budget only ever
    // buys one stretch, so the choice of stretch is the decision that matters.
    const long = createLongTranscript();
    const context = assembleLearningGenerationContext({
      ...createInput(),
      transcript: long,
      eligibility: createLongEligibility(long),
    });
    const profile = diagnoseLearningVideo(context);

    const covered = new Set(
      profile.candidateWindows.flatMap((window) => window.sourceSegmentIds),
    );
    expect(covered.size).toBeGreaterThan(0);
    expect(covered.size).toBeLessThan(long.segments.length);

    // The chosen stretch is contiguous — a lesson assembled from scattered
    // minutes of a video is not a lesson about anything.
    const positions = long.segments
      .filter((segment) => covered.has(segment.id))
      .map((segment) => segment.position);
    expect(positions[positions.length - 1]! - positions[0]!).toBe(
      positions.length - 1,
    );
  });

  it("teaches a known item again once its review falls due", () => {
    // The fixture recalled "player" correctly on 2026-08-06 and that alone kept
    // it out of every lesson. A year later the learner has almost certainly
    // forgotten it, and being able to meet it again is the point of scheduling.
    const prepared = prepareLearningAuthoringBrief({
      ...createInput(),
      now: new Date("2027-08-07T09:00:00+00:00"),
    });

    expect(prepared.selection.rejections).not.toContainEqual({
      candidateId: "candidate_player",
      reason: "KNOWN_ITEM_NOT_DUE",
    });
  });

  it("stops before authoring when constrained diagnosis abstains", () => {
    const input = createInput();
    expect(() =>
      prepareLearningAuthoringBrief({
        ...input,
        diagnosisProposal: {
          proposalVersion: "learning-diagnosis-proposal:v2",
          windows: [],
          abstainReason: "Không đủ candidate có contextual meaning đáng tin.",
        },
      }),
    ).toThrow(/diagnosis abstained/i);
  });
});

describe("windows the blueprint can actually hold", () => {
  /**
   * A caption track of many short cues. Music videos look like this, and the
   * duration and word-count bounds never fire — thirteen segments fitted inside
   * thirty seconds, the model cited the window, and the hydrated blueprint was
   * rejected at `activities.0.evidence.0.sourceSegmentIds` after both model
   * calls had been paid for.
   */
  function denseWindows(count: number) {
    const segments = Array.from({ length: count }, (_, index) => ({
      // 32 hex characters, valid at any count — a two-digit prefix broke the
      // format at index 100 and the schema caught it.
      id: `seg_${index.toString(16).padStart(32, "0")}`,
      position: index,
      startMs: index * 900,
      endMs: index * 900 + 800,
      text: "oh",
    }));
    const transcript: CanonicalTranscript = {
      ...createTranscript(),
      segments,
      durationMs: segments[segments.length - 1]!.endMs,
    };
    const ids = segments.map((segment) => segment.id);
    const base = createEligibility(ids);
    const context = assembleLearningGenerationContext({
      ...createInput(),
      transcript,
      eligibility: {
        ...base,
        // The English evidence has to name the same segments, or the context
        // assembler refuses them — correctly, since a permitted segment with no
        // English evidence behind it is exactly what that guard is for.
        englishSegmentIds: ids,
        windowEvidence: [
          {
            ...base.windowEvidence[0]!,
            segmentIds: ids,
            endMs: segments[segments.length - 1]!.endMs,
          },
        ],
      },
    });
    return {
      windows: diagnoseLearningVideo(context).candidateWindows,
      segments,
    };
  }

  it("never offers a window wider than an evidence range accepts", () => {
    const { windows } = denseWindows(40);

    expect(windows.length).toBeGreaterThan(1);
    for (const window of windows) {
      expect(window.sourceSegmentIds.length).toBeLessThanOrEqual(
        MAX_EVIDENCE_SEGMENTS,
      );
    }
  });

  it("offers a bounded number of windows for a long video", () => {
    // A session is five to twelve minutes, so a lesson never needs every window
    // of an hour-long video. The profile schema accepts at most a hundred, and
    // a lecture broke that outright — `diagnose_failed`, before a single model
    // call. Bounding windows to eight segments each roughly doubled the count.
    const { windows } = denseWindows(2000);

    expect(windows.length).toBeLessThanOrEqual(24);
  });

  it("still covers every segment of a short video", () => {
    // Bounding the window must split the transcript, not drop part of it. Only
    // asserted below the offered-window cap, where nothing is sampled away.
    const { windows, segments } = denseWindows(40);
    const covered = windows.flatMap((window) => window.sourceSegmentIds);

    expect(covered).toEqual(segments.map((segment) => segment.id));
  });
});

describe("selectOfferedWindows", () => {
  /** More windows than the cap, numbered so the sampling is readable. */
  const many = Array.from({ length: 250 }, (_, index) => ({
    id: `window_${index.toString(16).padStart(8, "0")}_x`,
    sourceSegmentIds: [`seg_${index.toString(16).padStart(32, "0")}`],
    startMs: index * 7_200,
    endMs: index * 7_200 + 7_000,
    wordCount: 40,
    evidenceConfidence: 0.9,
  }));

  it("keeps every window when there are few enough", () => {
    const few = many.slice(0, 10);
    expect(selectOfferedWindows(few)).toEqual(few);
  });

  it("caps what it offers", () => {
    expect(selectOfferedWindows(many).length).toBeLessThanOrEqual(24);
  });

  it("reaches the end of the video, not just its opening", () => {
    // Taking the first N would make every lesson from a long video come from
    // its first few minutes — a worse lesson, and a hidden one: nothing in the
    // output would say the rest was never considered.
    const offered = selectOfferedWindows(many);
    const last = offered[offered.length - 1]!;

    expect(last.startMs).toBeGreaterThan(many[many.length - 1]!.startMs * 0.9);
  });

  it("keeps them in order and never repeats one", () => {
    const offered = selectOfferedWindows(many);
    const ids = offered.map((window) => window.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect([...offered].sort((a, b) => a.startMs - b.startMs)).toEqual(offered);
  });
});
