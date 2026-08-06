import { describe, expect, it } from "vitest";

import {
  assembleLearningGenerationContext,
  diagnoseLearningVideo,
  prepareLearningAuthoringBrief,
} from "@/modules/learning/application/prepare-learning-authoring-brief";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";
import type { ConstrainedDiagnosisProposal } from "@/shared/contracts/learning-generation-v2";
import type { LearnerContextSnapshot } from "@/shared/contracts/lesson-v2";
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
    recentReviewOutcomes: [
      {
        itemKey: "player",
        outcome: "good",
        occurredAt: "2026-08-06T09:00:00+00:00",
      },
    ],
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
          {
            id: "candidate_member_of",
            key: "a-member-of",
            surfaceForm: "a member of",
            normalizedForm: "a member of",
            sourceSegmentIds: [segA],
            outcomeIds: ["outcome_affiliation"],
            kind: "chunk",
            contextualMeaningVi: "một thành viên thuộc một nhóm hoặc tổ chức",
            communicativeFunctionVi:
              "giới thiệu mối liên hệ của người nói với một tập thể",
            register: "neutral",
            corpusFrequencyBand: "high",
            evidenceConfidence: 0.98,
            properNounOrTrivia: false,
            generatedScenarioPossible: true,
            scoringHints: {
              outcomeRelevance: 0.98,
              transferValue: 0.95,
              contextualClarity: 0.98,
              pragmaticRegisterValue: 0.8,
              acousticTeachability: 0.7,
            },
            rationaleVi:
              "Cụm ngắn, có chức năng giao tiếp rõ và learner đang đánh dấu là điểm yếu.",
          },
          {
            id: "candidate_different_ways",
            key: "different-ways-of",
            surfaceForm: "different ways of",
            normalizedForm: "different ways of",
            sourceSegmentIds: [segB],
            outcomeIds: ["outcome_main_topic"],
            kind: "chunk",
            contextualMeaningVi: "nhiều cách khác nhau để thực hiện một việc",
            communicativeFunctionVi:
              "mở ra một danh sách lựa chọn hoặc phương án",
            register: "neutral",
            corpusFrequencyBand: "mid",
            evidenceConfidence: 0.96,
            properNounOrTrivia: false,
            generatedScenarioPossible: true,
            scoringHints: {
              outcomeRelevance: 0.86,
              transferValue: 0.84,
              contextualClarity: 0.95,
              pragmaticRegisterValue: 0.68,
              acousticTeachability: 0.55,
            },
            rationaleVi:
              "Cụm có thể tái sử dụng khi trình bày nhiều lựa chọn trong context mới.",
          },
          {
            id: "candidate_invented",
            key: "invented-phrase",
            surfaceForm: "invented phrase",
            normalizedForm: "invented phrase",
            sourceSegmentIds: [segB],
            outcomeIds: ["outcome_main_topic"],
            kind: "chunk",
            contextualMeaningVi: "một cụm không tồn tại trong nguồn",
            communicativeFunctionVi: "không có chức năng nguồn đáng tin",
            register: "neutral",
            corpusFrequencyBand: "unknown",
            evidenceConfidence: 0.9,
            properNounOrTrivia: false,
            generatedScenarioPossible: true,
            scoringHints: {
              outcomeRelevance: 0.8,
              transferValue: 0.8,
              contextualClarity: 0.8,
              pragmaticRegisterValue: 0.5,
              acousticTeachability: 0.5,
            },
            rationaleVi:
              "Candidate này cố tình sai để kiểm tra deterministic grounding gate.",
          },
          {
            id: "candidate_player",
            key: "player",
            surfaceForm: "player",
            normalizedForm: "player",
            sourceSegmentIds: [segB],
            outcomeIds: ["outcome_main_topic"],
            kind: "word",
            contextualMeaningVi: "trình phát nội dung đa phương tiện",
            communicativeFunctionVi: "gọi tên thành phần đang được trình bày",
            register: "technical",
            corpusFrequencyBand: "high",
            evidenceConfidence: 0.95,
            properNounOrTrivia: false,
            generatedScenarioPossible: true,
            scoringHints: {
              outcomeRelevance: 0.8,
              transferValue: 0.7,
              contextualClarity: 0.95,
              pragmaticRegisterValue: 0.4,
              acousticTeachability: 0.4,
            },
            rationaleVi:
              "Từ có nguồn rõ nhưng learner vừa retrieve thành công nên chưa đến lượt ôn.",
          },
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
          {
            id: "candidate_player_parameters",
            key: "player-parameters",
            surfaceForm: "player parameters",
            normalizedForm: "player parameters",
            sourceSegmentIds: [segC],
            outcomeIds: ["outcome_parameters"],
            kind: "chunk",
            contextualMeaningVi: "các tham số điều khiển trình phát",
            communicativeFunctionVi:
              "chỉ nhóm thiết lập kỹ thuật sắp được giải thích",
            register: "technical",
            corpusFrequencyBand: "low",
            evidenceConfidence: 0.94,
            properNounOrTrivia: false,
            generatedScenarioPossible: true,
            scoringHints: {
              outcomeRelevance: 0.82,
              transferValue: 0.68,
              contextualClarity: 0.94,
              pragmaticRegisterValue: 0.45,
              acousticTeachability: 0.45,
            },
            rationaleVi:
              "Candidate grounded và rõ nhưng nằm ở window thứ hai ngoài budget 5 phút.",
          },
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
          {
            id: "candidate_acme_platform",
            key: "acme-platform",
            surfaceForm: "Acme Platform",
            normalizedForm: "acme platform",
            sourceSegmentIds: [segD],
            outcomeIds: ["outcome_background_detail"],
            kind: "chunk",
            contextualMeaningVi: "tên riêng của một nền tảng",
            communicativeFunctionVi: "gọi tên một sản phẩm cụ thể",
            register: "technical",
            corpusFrequencyBand: "low",
            evidenceConfidence: 0.9,
            properNounOrTrivia: true,
            generatedScenarioPossible: false,
            scoringHints: {
              outcomeRelevance: 0.2,
              transferValue: 0.1,
              contextualClarity: 0.9,
              pragmaticRegisterValue: 0.1,
              acousticTeachability: 0.2,
            },
            rationaleVi:
              "Tên riêng không phục vụ outcome giao tiếp và không đáng chiếm cognitive budget.",
          },
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
    expect(profile.topicShiftCount).toBe(2);
    expect(profile.speechDensity).toBe("medium");
    expect(profile.register).toContain("technical");
    expect(profile.audioChallenge).not.toContain("accent");
    expect(profile.audioChallenge).not.toContain("noise");
    expect(profile.lexicalCoverageEstimate).toBeNull();
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
          reason: "BUDGET_LIMIT",
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
