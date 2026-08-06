import {
  lessonBlueprintV2Schema,
  type LessonBlueprintV2,
} from "@/shared/contracts/lesson-v2";

const segA = `seg_${"a".repeat(32)}`;
const segB = `seg_${"b".repeat(32)}`;

export function createFixtureLearningBlueprint(): LessonBlueprintV2 {
  return lessonBlueprintV2Schema.parse({
    schemaVersion: "lesson:v2",
    pipelineVersion: "learning-pipeline:v2",
    blueprintId: "11111111-1111-4111-8111-111111111111",
    source: {
      jobId: "22222222-2222-4222-8222-222222222222",
      videoId: "dQw4w9WgXcQ",
      videoTitle: "Learning from real speech",
      channelName: "Fixture channel",
      transcriptHash: "f".repeat(64),
    },
    learnerSnapshot: {
      targetCefr: "B1",
      goals: ["listening", "conversation"],
      timeBudgetMinutes: 5,
      supportPreference: "balanced",
      knownItemKeys: [],
      weakItemKeys: ["pay-attention-to"],
      recentReviewOutcomes: [],
    },
    videoProfile: {
      durationMs: 40_000,
      challengeSummaryVi:
        "Người nói trình bày lời khuyên liên tục với tốc độ vừa phải.",
      challengeDimensions: ["reduction"],
      lexicalCoverageEstimate: 0.94,
    },
    outcomes: [
      {
        id: "outcome_main_idea",
        canDoVi: "Xác định được lời khuyên chính của đoạn nghe ngắn.",
        successEvidenceVi:
          "Chọn đúng ý chính trước khi xem toàn bộ lời thoại.",
      },
      {
        id: "outcome_reuse_chunk",
        canDoVi:
          "Dùng cụm pay attention to để đưa ra một lời khuyên mới.",
        successEvidenceVi:
          "Tự viết một câu phù hợp và đối chiếu bằng tiêu chí.",
      },
    ],
    targetItems: [
      {
        id: "item_pay_attention",
        itemKey: "pay-attention-to",
        surfaceForm: "pay attention to",
        kind: "chunk",
        contextualMeaningVi: "chú ý có chủ đích đến một điều cụ thể",
        communicativeFunctionVi:
          "hướng sự tập trung của người nghe vào điều quan trọng",
        register: "neutral",
        pronunciationNoteVi:
          "Trong lời nói nhanh, attention thường mang trọng âm chính.",
        sourceSegmentIds: [segB],
      },
    ],
    evidenceCatalog: [
      {
        origin: "source_quote",
        segmentId: segA,
        startMs: 0,
        endMs: 19_500,
        text: "A useful study routine begins with the whole message. Listen once without pausing, write a short summary, and then return to the exact moments where your understanding became uncertain or incomplete.",
      },
      {
        origin: "source_quote",
        segmentId: segB,
        startMs: 20_000,
        endMs: 39_500,
        text: "On the second pass, pay attention to phrases rather than isolated words. Speakers often rely on familiar groups of words, and those groups carry meaning more naturally than a list of separate definitions.",
      },
    ],
    activities: [
      {
        id: "activity_gist",
        phase: "gist",
        activityType: "gist_choice",
        outcomeIds: ["outcome_main_idea"],
        instructionVi: "Nghe đoạn đầu và chọn lời khuyên chính.",
        evidence: [
          {
            sourceSegmentIds: [segA],
            startMs: 0,
            endMs: 19_500,
            captionPolicy: "hidden_first",
            replayAllowed: true,
          },
        ],
        estimatedSeconds: 45,
        promptVi: "Người nói khuyên bạn bắt đầu lần nghe đầu như thế nào?",
        options: [
          {
            id: "option_whole_message",
            textVi: "Nghe toàn bộ thông điệp trước",
          },
          { id: "option_word_list", textVi: "Tra từng từ trước khi nghe" },
          { id: "option_skip_audio", textVi: "Chỉ đọc transcript" },
        ],
        evaluation: {
          kind: "single_choice",
          correctOptionId: "option_whole_message",
        },
        feedback: {
          goalVi: "Xác định ý chính trước khi dựa vào transcript.",
          correctEvidenceVi:
            "Đúng: người nói bắt đầu bằng toàn bộ thông điệp.",
          incorrectEvidenceVi:
            "Đoạn này chưa yêu cầu tra từng từ hay bỏ phần nghe.",
          nextStepVi: "Nghe lại đoạn được đánh dấu rồi tiếp tục.",
        },
      },
      {
        id: "activity_meaning",
        phase: "practice",
        activityType: "meaning_in_context",
        outcomeIds: ["outcome_reuse_chunk"],
        instructionVi: "Chọn chức năng của cụm trong câu thật.",
        evidence: [
          {
            sourceSegmentIds: [segB],
            startMs: 20_000,
            endMs: 39_500,
            captionPolicy: "toggle",
            replayAllowed: true,
          },
        ],
        estimatedSeconds: 60,
        targetItemId: "item_pay_attention",
        promptVi: "Trong đoạn này, pay attention to dùng để làm gì?",
        options: [
          {
            id: "option_focus",
            textVi: "Hướng sự tập trung vào các cụm từ",
          },
          { id: "option_ignore", textVi: "Bỏ qua các cụm từ" },
          {
            id: "option_translate",
            textVi: "Dịch mọi từ sang tiếng Việt",
          },
        ],
        evaluation: {
          kind: "single_choice",
          correctOptionId: "option_focus",
        },
        feedback: {
          goalVi: "Nhận ra chức năng giao tiếp của một language chunk.",
          correctEvidenceVi:
            "Đúng: cụm này hướng người nghe tập trung vào phrases.",
          incorrectEvidenceVi:
            "Câu thật đối lập phrases với isolated words, không nói bỏ qua hay dịch hết.",
          nextStepVi: "Đọc phần giải thích ngắn rồi thử nhớ lại cụm.",
        },
      },
      {
        id: "activity_recall",
        phase: "retrieve",
        activityType: "chunk_recall",
        outcomeIds: ["outcome_reuse_chunk"],
        instructionVi: "Không nhìn câu gốc, hãy nhớ lại cụm còn thiếu.",
        evidence: [
          {
            sourceSegmentIds: [segB],
            startMs: 20_000,
            endMs: 39_500,
            captionPolicy: "hidden_first",
            replayAllowed: true,
          },
        ],
        estimatedSeconds: 55,
        targetItemId: "item_pay_attention",
        promptVi: "Complete: On the second pass, ___ phrases.",
        hintVi: "Cụm ba từ mang nghĩa chú ý đến",
        evaluation: {
          kind: "normalized_text_set",
          accepted: ["pay attention to"],
        },
        reveal: {
          answer: "pay attention to",
          explanationVi:
            "Cụm này thường đi với danh từ hoặc V-ing sau giới từ to.",
        },
        feedback: {
          goalVi: "Tự nhớ lại language chunk trước khi xem đáp án.",
          correctEvidenceVi: "Bạn đã nhớ lại đúng toàn bộ cụm.",
          incorrectEvidenceVi:
            "Câu trả lời chưa khớp toàn bộ chunk ba từ trong đoạn nghe.",
          nextStepVi:
            "Đối chiếu câu thật rồi dùng cụm trong tình huống mới.",
        },
      },
      {
        id: "activity_transfer",
        phase: "transfer",
        activityType: "guided_transfer",
        outcomeIds: ["outcome_reuse_chunk"],
        instructionVi: "Viết một lời khuyên mới cho tình huống khác.",
        evidence: [],
        estimatedSeconds: 90,
        targetItemIds: ["item_pay_attention"],
        scenarioVi:
          "Một người bạn thường bỏ sót ý chính khi xem video hướng dẫn nấu ăn.",
        promptVi: "Viết một câu khuyên bạn ấy bằng pay attention to.",
        evaluation: {
          kind: "self_check",
          criteriaVi: [
            "Có dùng nguyên cụm pay attention to",
            "Sau to là điều cụ thể cần chú ý",
            "Câu phù hợp với tình huống mới",
          ],
          exemplarAfterAttempt:
            "Pay attention to the order of the steps before you start cooking.",
        },
        feedback: {
          goalVi: "Vận dụng chunk vào một context mới.",
          nextStepVi: "Đối chiếu tiêu chí và chỉnh lại câu nếu cần.",
        },
      },
      {
        id: "activity_exit",
        phase: "reflect",
        activityType: "exit_ticket",
        outcomeIds: ["outcome_main_idea", "outcome_reuse_chunk"],
        instructionVi: "Ghi lại điều bạn còn muốn luyện thêm.",
        evidence: [],
        estimatedSeconds: 30,
        promptVi: "Bạn cần nghe lại ý chính hay luyện dùng chunk thêm?",
        evaluation: { kind: "unscored_reflection" },
        feedback: {
          goalVi: "Chọn bước ôn lại dựa trên trải nghiệm vừa học.",
          nextStepVi:
            "Vidlish sẽ dùng lựa chọn này cho lượt ôn tiếp theo.",
        },
      },
    ],
    provenance: {
      diagnosisVersion: "video-diagnosis:fixture-v2",
      authoringVersion: "learning-authoring:fixture-v2",
      modelId: "fixture-learning-model",
      createdAt: "2026-08-06T09:00:00+00:00",
    },
  });
}
