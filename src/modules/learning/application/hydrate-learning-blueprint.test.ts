import { describe, expect, it } from "vitest";

import { hydrateLearningBlueprint } from "./hydrate-learning-blueprint";
import type { HydrateLearningBlueprintInput } from "./hydrate-learning-blueprint";

import type { LearningAuthoringDraftV2 } from "@/shared/contracts/learning-authoring-draft-v2";
import type {
  LearningAuthoringBrief,
  VideoLearningProfileV2,
} from "@/shared/contracts/learning-generation-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

const SEG_A = `seg_${"a".repeat(32)}`;
const SEG_B = `seg_${"b".repeat(32)}`;
const HASH = "f".repeat(64);
const WINDOW_ID = "window_aaaaaaaa_bbbbbbbb";

function transcript(): CanonicalTranscript {
  return {
    videoId: "M7lc1UVf-VE",
    strategyId: "supadata-native-caption",
    provider: "supadata",
    sourceType: "native_caption",
    declaredLanguage: "en",
    availableLanguages: ["en"],
    trackKind: "manual",
    translationStatus: "original",
    normalizedHash: HASH,
    normalizationVersion: "transcript-normalization:v1",
    durationMs: 60_000,
    segments: [
      {
        id: SEG_A,
        position: 0,
        startMs: 0,
        endMs: 10_000,
        text: "I'm a member of the Developer Relations team.",
        confidence: 0.99,
        detectedLanguage: "en",
      },
      {
        id: SEG_B,
        position: 1,
        startMs: 10_000,
        endMs: 20_000,
        text: "Today we'll explore the embedded player.",
        confidence: 0.99,
        detectedLanguage: "en",
      },
    ],
  };
}

function brief(): LearningAuthoringBrief {
  return {
    briefVersion: "learning-authoring-brief:v2",
    jobId: "22222222-2222-4222-8222-222222222222",
    videoId: "M7lc1UVf-VE",
    transcriptHash: HASH,
    learner: {
      targetCefr: "B1",
      goals: ["listening"],
      timeBudgetMinutes: 5,
      supportPreference: "balanced",
    },
    diagnosis: {
      speechDensity: "medium",
      estimatedSpeechRateWpm: 140,
      topicShiftCount: 0,
      register: ["neutral"],
      audioChallenge: ["none"],
      lexicalCoverageEstimate: 0.93,
      backgroundKnowledgeDependency: "low",
    },
    windows: [
      {
        id: WINDOW_ID,
        sourceSegmentIds: [SEG_A, SEG_B],
        gistVi: "Người nói giới thiệu vai trò và chủ đề của video.",
        discourseFunctionVi: "giới thiệu và báo trước chủ đề",
        evidenceConfidence: 0.95,
      },
    ],
    outcomes: [
      {
        id: "outcome_affiliation",
        canDoVi: "Dùng a member of để giới thiệu mình thuộc một nhóm.",
        successEvidenceVi: "Tạo được một câu mới trong tình huống giới thiệu.",
      },
    ],
    targetItems: [
      {
        id: "candidate_member",
        key: "a-member-of",
        surfaceForm: "a member of",
        normalizedForm: "a member of",
        sourceSegmentIds: [SEG_A],
        outcomeIds: ["outcome_affiliation"],
        kind: "chunk",
        contextualMeaningVi: "thuộc về một nhóm hoặc tổ chức",
        communicativeFunctionVi: "giới thiệu mình thuộc một nhóm",
        register: "neutral",
        corpusFrequencyBand: "mid",
        evidenceConfidence: 0.95,
        properNounOrTrivia: false,
        generatedScenarioPossible: true,
        scoringHints: {
          outcomeRelevance: 0.85,
          transferValue: 0.8,
          contextualClarity: 0.95,
          pragmaticRegisterValue: 0.65,
          acousticTeachability: 0.55,
        },
        rationaleVi: "Cụm có nguồn rõ và chuyển giao được.",
        windowId: WINDOW_ID,
        recurrenceCount: 1,
        score: {
          learnerGap: 1,
          outcomeRelevance: 0.85,
          transferValue: 0.8,
          contextualClarity: 0.95,
          recurrenceOrFrequency: 0.5,
          pragmaticRegisterValue: 0.65,
          acousticTeachability: 0.55,
          evidenceConfidence: 0.95,
          redundancyPenalty: 0,
          cognitiveCostPenalty: 0,
          properNounOrTriviaPenalty: 0,
          total: 0.8,
        },
      },
    ],
    authoringPermissions: ["instruction_vi"],
    forbiddenFields: ["source_quote"],
  } as LearningAuthoringBrief;
}

function profile(): VideoLearningProfileV2 {
  return {
    diagnosisVersion: "video-diagnosis:v2-deterministic-v1",
    durationMs: 60_000,
    speechDensity: "medium",
    estimatedSpeechRateWpm: 140,
    topicShiftCount: 0,
    register: ["neutral"],
    audioChallenge: ["none"],
    lexicalCoverageEstimate: 0.93,
    backgroundKnowledgeDependency: "low",
    candidateWindows: [
      {
        id: WINDOW_ID,
        sourceSegmentIds: [SEG_A, SEG_B],
        startMs: 0,
        endMs: 20_000,
        wordCount: 14,
        evidenceConfidence: 0.95,
      },
    ],
  } as VideoLearningProfileV2;
}

function draft(): LearningAuthoringDraftV2 {
  return {
    draftVersion: "learning-authoring-draft:v2",
    challengeSummaryVi: "Video nói tốc độ vừa, chủ đề công nghệ quen thuộc.",
    targetItemNotes: [
      {
        candidateId: "candidate_member",
        communicativeFunctionVi: "dùng khi giới thiệu mình thuộc một nhóm",
        pronunciationNoteVi: "nối âm giữa member và of",
      },
    ],
    activities: [
      {
        id: "activity_gist",
        phase: "gist",
        activityType: "gist_choice",
        outcomeIds: ["outcome_affiliation"],
        instructionVi: "Nghe một lượt rồi chọn ý chính.",
        evidenceWindowIds: [WINDOW_ID],
        captionPolicy: "hidden_first",
        estimatedSeconds: 60,
        promptVi: "Người nói đang làm gì trong đoạn này?",
        options: [
          { id: "option_intro", textVi: "Giới thiệu bản thân và chủ đề" },
          { id: "option_sell", textVi: "Bán một sản phẩm" },
        ],
        correctOptionId: "option_intro",
        feedback: {
          goalVi: "Nắm ý chính trước khi đọc chữ.",
          correctEvidenceVi: "Người nói nói mình thuộc nhóm nào rồi báo chủ đề.",
          incorrectEvidenceVi: "Không có chi tiết nào về việc bán hàng.",
          nextStepVi: "Nghe lại và chú ý cụm giới thiệu.",
        },
      },
      {
        id: "activity_recall",
        phase: "retrieve",
        activityType: "chunk_recall",
        outcomeIds: ["outcome_affiliation"],
        instructionVi: "Nhớ lại cụm người nói đã dùng.",
        evidenceWindowIds: [WINDOW_ID],
        captionPolicy: "toggle",
        estimatedSeconds: 90,
        candidateId: "candidate_member",
        promptVi: "Điền cụm còn thiếu để nói mình thuộc một nhóm.",
        hintVi: "Bắt đầu bằng mạo từ a.",
        accepted: ["a member of the"],
        revealAnswer: "part of",
        revealExplanationVi: "Cụm này dùng khi nói mình thuộc một tổ chức.",
        feedback: {
          goalVi: "Chủ động nhớ lại thay vì nhận ra.",
          correctEvidenceVi: "Đúng cụm người nói đã dùng.",
          incorrectEvidenceVi: "Chưa đúng cụm trong video.",
          nextStepVi: "Nghe lại đoạn rồi thử lại.",
        },
      },
      {
        id: "activity_exit",
        phase: "reflect",
        activityType: "exit_ticket",
        outcomeIds: ["outcome_affiliation"],
        instructionVi: "Tự đánh giá nhanh.",
        estimatedSeconds: 30,
        promptVi: "Bạn thấy phần nào khó nhất?",
        feedback: {
          goalVi: "Nhìn lại buổi học để lần sau nhắm đúng chỗ khó.",
          nextStepVi: "Hôm sau ôn lại cụm đã học khi tới hạn.",
        },
      },
    ],
  } as LearningAuthoringDraftV2;
}

function input(
  overrides: Partial<HydrateLearningBlueprintInput> = {},
): HydrateLearningBlueprintInput {
  return {
    brief: brief(),
    draft: draft(),
    profile: profile(),
    learnerSnapshot: {
      targetCefr: "B1",
      goals: ["listening"],
      timeBudgetMinutes: 5,
      supportPreference: "balanced",
      knownItemKeys: [],
      weakItemKeys: [],
      recentReviewOutcomes: [],
    },
    transcript: transcript(),
    videoTitle: "Embedded player customization",
    channelName: "Fixture channel",
    blueprintId: "33333333-3333-4333-8333-333333333333",
    modelId: "fixture-authoring-model",
    createdAt: "2026-08-19T09:00:00+00:00",
    ...overrides,
  };
}

describe("hydrateLearningBlueprint", () => {
  it("builds a blueprint the runtime accepts", () => {
    const blueprint = hydrateLearningBlueprint(input());
    expect(blueprint.schemaVersion).toBe("lesson:v2");
    expect(blueprint.activities).toHaveLength(3);
    expect(blueprint.evidenceCatalog).toHaveLength(2);
  });

  it("takes quote text and timestamps from the transcript, never from the model", () => {
    // The model is not allowed to write a single word a learner will hear. If
    // this ever reads from the draft, a fabricated sentence becomes evidence.
    const blueprint = hydrateLearningBlueprint(input());
    expect(blueprint.evidenceCatalog[0]).toEqual({
      origin: "source_quote",
      segmentId: SEG_A,
      startMs: 0,
      endMs: 10_000,
      text: "I'm a member of the Developer Relations team.",
    });
  });

  it("derives the playable range from the cited segments", () => {
    const blueprint = hydrateLearningBlueprint(input());
    const gist = blueprint.activities[0]!;
    expect(gist.evidence[0]).toMatchObject({
      sourceSegmentIds: [SEG_A, SEG_B],
      startMs: 0,
      endMs: 20_000,
      replayAllowed: true,
    });
  });

  it("shows the learner the phrase from the video, not the model's answer", () => {
    // The draft says the answer is "part of". Nobody said that. The gate has
    // already proved "a member of" appears in the source, so that is what the
    // reveal shows — otherwise the learner memorises something invented.
    const blueprint = hydrateLearningBlueprint(input());
    const recall = blueprint.activities[1]!;
    expect(recall.activityType).toBe("chunk_recall");
    if (recall.activityType !== "chunk_recall") return;
    expect(recall.reveal.answer).toBe("a member of");
    expect(recall.evaluation.accepted).toContain("a member of");
  });

  it("keeps the model's extra accepted spellings", () => {
    // Widening what counts as correct is safe; marking a learner wrong for a
    // contraction is not.
    const blueprint = hydrateLearningBlueprint(input());
    const recall = blueprint.activities[1]!;
    if (recall.activityType !== "chunk_recall") return;
    expect(recall.evaluation.accepted).toContain("a member of the");
  });

  it("refuses a window the brief never offered", () => {
    // This is the language gate's whole purpose: a lesson may only quote speech
    // the gate permitted.
    const rogue = draft();
    const gist = rogue.activities[0]!;
    if (gist.activityType === "gist_choice") {
      gist.evidenceWindowIds = ["window_deadbeef_deadbeef"];
    }
    expect(() => hydrateLearningBlueprint(input({ draft: rogue }))).toThrow(
      /window outside the authoring brief/i,
    );
  });

  it("refuses a candidate the deterministic gate rejected", () => {
    const rogue = draft();
    const recall = rogue.activities[1]!;
    if (recall.activityType === "chunk_recall") {
      recall.candidateId = "candidate_invented";
    }
    expect(() => hydrateLearningBlueprint(input({ draft: rogue }))).toThrow(
      /candidate the gate rejected/i,
    );
  });

  it("refuses a draft authored against another transcript", () => {
    // Segment IDs would still resolve, but to different speech.
    const other = { ...transcript(), normalizedHash: "e".repeat(64) };
    expect(() => hydrateLearningBlueprint(input({ transcript: other }))).toThrow(
      /different transcript/i,
    );
  });

  it("records which model wrote the draft", () => {
    // Without provenance there is no way to tell which model produced a lesson
    // that turned out to be wrong.
    const blueprint = hydrateLearningBlueprint(input());
    expect(blueprint.provenance).toMatchObject({
      modelId: "fixture-authoring-model",
      authoringVersion: "learning-authoring-draft:v2",
      diagnosisVersion: "video-diagnosis:v2-deterministic-v1",
    });
  });
});
