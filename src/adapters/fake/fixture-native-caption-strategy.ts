import "server-only";

import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import {
  NATIVE_CAPTION_STRATEGY_ID,
  transcriptStrategyResultSchema,
  type TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

const englishChunks = [
  "Learning from real speech helps you notice how people connect ideas, soften opinions, and signal what matters. When you listen carefully, repeated patterns become easier to recognize and reuse in your own conversations.",
  "A useful study routine begins with the whole message. Listen once without pausing, write a short summary, and then return to the exact moments where your understanding became uncertain or incomplete.",
  "On the second pass, pay attention to phrases rather than isolated words. Speakers often rely on familiar groups of words, and those groups carry meaning more naturally than a list of separate definitions.",
  "You can pause after an important sentence, repeat it aloud, and compare your rhythm with the speaker. The goal is not to copy an accent, but to make stress and timing easier to control.",
  "After listening, test retrieval without looking at the transcript. Explain the main point, recall two supporting details, and use one useful phrase in a new situation that was not mentioned in the video.",
  "This final transfer step matters because recognition alone is not enough. When you adapt the language to your own example, you create a stronger memory and learn when the expression is genuinely appropriate.",
];

const vietnameseChunks = [
  "Việc học hiệu quả bắt đầu từ việc xác định mục tiêu rõ ràng và chia công việc thành những bước nhỏ có thể hoàn thành trong từng khoảng thời gian cụ thể.",
  "Khi gặp một khái niệm khó, người học nên tự giải thích bằng lời của mình, đưa ra ví dụ gần gũi và kiểm tra xem mình có thực sự hiểu mối liên hệ hay không.",
  "Một lịch học đều đặn thường hữu ích hơn những buổi học quá dài nhưng diễn ra thất thường, bởi vì trí nhớ cần nhiều lần tiếp xúc và khoảng nghỉ để củng cố thông tin.",
  "Trong quá trình luyện tập, sai sót không phải là dấu hiệu thất bại mà là dữ liệu giúp người học nhận ra phần kiến thức còn yếu và điều chỉnh phương pháp phù hợp hơn.",
  "Sau mỗi buổi học, việc tóm tắt ý chính, ghi lại câu hỏi còn bỏ ngỏ và lên kế hoạch cho lần tiếp theo sẽ giúp duy trì tiến độ một cách chủ động.",
  "Cuối cùng, người học cần áp dụng kiến thức vào tình huống mới, vì khả năng sử dụng linh hoạt mới cho thấy nội dung đã được hiểu sâu thay vì chỉ được ghi nhớ tạm thời.",
];

function timedChunks(texts: string[]) {
  return texts.map((text, index) => ({
    text,
    offsetMs: index * 20_000,
    durationMs: 19_500,
    language: "en",
  }));
}

export class FixtureNativeCaptionStrategy implements TranscriptStrategy {
  readonly id = NATIVE_CAPTION_STRATEGY_ID;
  readonly costBand = "none" as const;

  async acquire(input: { videoId: string }): Promise<TranscriptStrategyResult> {
    if (input.videoId === "nocaption01") {
      return transcriptStrategyResultSchema.parse({
        kind: "not_applicable",
        reason: "NO_USABLE_CAPTIONS",
      });
    }
    if (input.videoId === "translated1") {
      return transcriptStrategyResultSchema.parse({
        kind: "success",
        candidate: {
          strategyId: NATIVE_CAPTION_STRATEGY_ID,
          provider: "supadata",
          sourceType: "native_caption",
          videoId: input.videoId,
          declaredLanguage: "en",
          availableLanguages: ["en", "vi"],
          trackKind: "unknown",
          translationStatus: "translated",
          chunks: [
            {
              text: "Synthetic translated text.",
              offsetMs: 0,
              durationMs: 1500,
              language: "en",
            },
          ],
        },
      });
    }
    if (input.videoId === "captionrate") {
      return transcriptStrategyResultSchema.parse({
        kind: "retryable_failure",
        reason: "PROVIDER_RATE_LIMITED",
      });
    }

    const chunks =
      input.videoId === "vietsource1"
        ? timedChunks(vietnameseChunks)
        : input.videoId === "shorteng001"
          ? [
              {
                text: "Learning from real speech helps you notice patterns.",
                offsetMs: 0,
                durationMs: 3200,
                language: "en",
              },
              {
                text: "You can pause, listen again, and test your understanding.",
                offsetMs: 3400,
                durationMs: 4100,
                language: "en",
              },
            ]
          : timedChunks(englishChunks);

    return transcriptStrategyResultSchema.parse({
      kind: "success",
      candidate: {
        strategyId: NATIVE_CAPTION_STRATEGY_ID,
        provider: "supadata",
        sourceType: "native_caption",
        videoId: input.videoId,
        declaredLanguage: "en",
        availableLanguages: ["en"],
        trackKind: "unknown",
        translationStatus: "unknown",
        chunks,
      },
    });
  }
}
