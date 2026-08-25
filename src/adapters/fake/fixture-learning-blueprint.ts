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
      videoId: "M7lc1UVf-VE",
      videoTitle:
        "YouTube Developers Live: Embedded Web Player Customization",
      channelName: "Google for Developers",
      transcriptHash: "f".repeat(64),
    },
    learnerSnapshot: {
      targetCefr: "B1",
      goals: ["listening", "conversation"],
      timeBudgetMinutes: 5,
      supportPreference: "balanced",
      knownItemKeys: [],
      weakItemKeys: ["a-member-of"],
      recentReviewOutcomes: [],
    },
    videoProfile: {
      durationMs: 1_344_000,
      challengeSummaryVi:
        "Giọng thuyết trình rõ và vừa phải, nhưng có tên đội và thuật ngữ web cần kiến thức nền.",
      challengeDimensions: ["background_knowledge"],
      lexicalCoverageEstimate: 0.94,
    },
    outcomes: [
      {
        id: "outcome_main_topic",
        canDoVi: "Xác định được chủ đề chính trong phần mở đầu ngắn của video.",
        successEvidenceVi:
          "Chọn đúng nội dung người nói sắp trình bày trước khi xem lời thoại.",
      },
      {
        id: "outcome_reuse_affiliation",
        canDoVi:
          "Dùng cụm a member of để giới thiệu mình thuộc một nhóm hoặc tổ chức.",
        successEvidenceVi:
          "Tự viết một câu phù hợp và đối chiếu bằng tiêu chí sau attempt.",
      },
    ],
    targetItems: [
      {
        id: "item_member_of",
        itemKey: "a-member-of",
        surfaceForm: "a member of",
        kind: "chunk",
        contextualMeaningVi: "một thành viên thuộc một nhóm hoặc tổ chức",
        communicativeFunctionVi:
          "giới thiệu vai trò hoặc mối liên hệ của người nói với một tập thể",
        register: "neutral",
        pronunciationNoteVi:
          "Trong lời nói liền mạch, member of thường được nối âm nhẹ giữa /r/ và /əv/.",
        sourceSegmentIds: [segA],
      },
    ],
    evidenceCatalog: [
      {
        origin: "source_quote",
        segmentId: segA,
        startMs: 16_000,
        endMs: 19_000,
        text: "I'm a member of the Developer Relations team.",
      },
      {
        origin: "source_quote",
        segmentId: segB,
        startMs: 21_000,
        endMs: 24_000,
        text: "different ways of customizing the YouTube-embedded player.",
      },
    ],
    activities: [
      {
        id: "activity_gist",
        phase: "gist",
        activityType: "gist_choice",
        outcomeIds: ["outcome_main_topic"],
        instructionVi: "Nghe phần mở đầu và chọn chủ đề người nói sắp trình bày.",
        evidence: [
          {
            sourceSegmentIds: [segA, segB],
            startMs: 16_000,
            endMs: 24_000,
            captionPolicy: "hidden_first",
            replayAllowed: true,
          },
        ],
        estimatedSeconds: 45,
        promptVi: "Video sắp tập trung vào chủ đề nào?",
        options: [
          {
            id: "option_embedded_player",
            textVi: "Các cách tùy chỉnh trình phát YouTube nhúng",
          },
          {
            id: "option_camera_hardware",
            textVi: "Cách chọn phần cứng quay video",
          },
          {
            id: "option_music_channel",
            textVi: "Cách xây dựng một kênh âm nhạc",
          },
        ],
        evaluation: {
          kind: "single_choice",
          correctOptionId: "option_embedded_player",
        },
        feedback: {
          goalVi: "Xác định chủ đề chính trước khi dựa vào transcript.",
          correctEvidenceVi:
            "Đúng: người nói giới thiệu nội dung về tùy chỉnh trình phát YouTube nhúng.",
          incorrectEvidenceVi:
            "Đoạn mở đầu không nói về phần cứng quay phim hoặc xây kênh âm nhạc.",
          nextStepVi: "Phát lại đoạn được đánh dấu rồi tiếp tục.",
        },
      },
      {
        id: "activity_meaning",
        phase: "practice",
        activityType: "meaning_in_context",
        outcomeIds: ["outcome_reuse_affiliation"],
        instructionVi: "Chọn chức năng của cụm trong câu thật.",
        evidence: [
          {
            sourceSegmentIds: [segA],
            startMs: 16_000,
            endMs: 19_000,
            captionPolicy: "toggle",
            replayAllowed: true,
          },
        ],
        estimatedSeconds: 60,
        targetItemId: "item_member_of",
        promptVi: "Trong đoạn này, a member of dùng để làm gì?",
        options: [
          {
            id: "option_affiliation",
            textVi: "Giới thiệu người nói thuộc một đội",
          },
          {
            id: "option_location",
            textVi: "Mô tả nơi người nói đang đứng",
          },
          {
            id: "option_duration",
            textVi: "Nói người nói đã làm việc bao lâu",
          },
        ],
        evaluation: {
          kind: "single_choice",
          correctOptionId: "option_affiliation",
        },
        feedback: {
          goalVi: "Nhận ra chức năng giao tiếp của một language chunk.",
          correctEvidenceVi:
            "Đúng: cụm này xác định Jeff thuộc Developer Relations team.",
          incorrectEvidenceVi:
            "Câu thật nói về tư cách thành viên, không phải địa điểm hoặc thời gian.",
          nextStepVi: "Đọc phần giải thích ngắn rồi thử nhớ lại cụm.",
        },
      },
      {
        id: "activity_recall",
        phase: "retrieve",
        activityType: "chunk_recall",
        outcomeIds: ["outcome_reuse_affiliation"],
        instructionVi: "Không nhìn câu gốc, hãy nhớ lại cụm còn thiếu.",
        evidence: [
          {
            sourceSegmentIds: [segA],
            startMs: 16_000,
            endMs: 19_000,
            captionPolicy: "hidden_first",
            replayAllowed: true,
          },
        ],
        estimatedSeconds: 55,
        targetItemId: "item_member_of",
        promptVi: "Complete: I'm ___ the Developer Relations team.",
        hintVi: "Cụm ba từ diễn tả tư cách thành viên",
        evaluation: {
          kind: "normalized_text_set",
          accepted: ["a member of"],
        },
        reveal: {
          answer: "a member of",
          explanationVi:
            "Sau cụm này là tên nhóm, đội hoặc tổ chức mà người nói thuộc về.",
        },
        feedback: {
          goalVi: "Tự nhớ lại language chunk trước khi xem đáp án.",
          correctEvidenceVi: "Bạn đã nhớ lại đúng toàn bộ cụm.",
          incorrectEvidenceVi:
            "Câu trả lời chưa khớp toàn bộ chunk ba từ trong đoạn nghe.",
          nextStepVi:
            "Đối chiếu câu thật rồi dùng cụm trong một tình huống mới.",
        },
      },
      {
        id: "activity_transfer",
        phase: "transfer",
        activityType: "guided_transfer",
        outcomeIds: ["outcome_reuse_affiliation"],
        instructionVi: "Giới thiệu vai trò của bạn trong một nhóm mới.",
        evidence: [],
        estimatedSeconds: 90,
        targetItemIds: ["item_member_of"],
        scenarioVi:
          "Bạn vừa tham gia một dự án và đang giới thiệu bản thân với cộng tác viên mới.",
        promptVi:
          "Viết một câu giới thiệu bạn là thành viên của nhóm bằng a member of.",
        evaluation: {
          kind: "self_check",
          criteriaVi: [
            "Có dùng nguyên cụm a member of",
            "Sau of là tên một nhóm hoặc tổ chức cụ thể",
            "Câu phù hợp với tình huống giới thiệu bản thân",
          ],
          exemplarAfterAttempt: "I'm a member of the product design team.",
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
        outcomeIds: ["outcome_main_topic", "outcome_reuse_affiliation"],
        instructionVi: "Ghi lại điều bạn còn muốn luyện thêm.",
        evidence: [],
        estimatedSeconds: 30,
        promptVi: "Bạn cần nghe lại ý chính hay luyện dùng chunk thêm?",
        evaluation: { kind: "unscored_reflection" },
        feedback: {
          goalVi: "Chọn bước ôn lại dựa trên trải nghiệm vừa học.",
          nextStepVi:
            "Nếp sẽ dùng lựa chọn này cho lượt ôn tiếp theo.",
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
