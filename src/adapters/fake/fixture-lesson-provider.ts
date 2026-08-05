import "server-only";

import type {
  LessonGenerationInput,
  LessonGenerationProvider,
  LessonGenerationResult,
} from "@/modules/lesson/ports/lesson-generation-provider";
import { lessonDraftSchema } from "@/shared/contracts/lesson";

/**
 * Deterministic stand-in for the model. It cites only segments it was actually
 * given, so it exercises the grounding gate honestly rather than bypassing it.
 */
export class FixtureLessonProvider implements LessonGenerationProvider {
  async generate(
    input: LessonGenerationInput,
  ): Promise<LessonGenerationResult> {
    const first = input.permittedSegments[0];
    const second = input.permittedSegments[1] ?? first;
    if (!first) throw new Error("Fixture lesson provider needs a segment.");

    const blankSource = first.text.split(/\s+/);
    const answer = blankSource[1] ?? blankSource[0] ?? "word";

    return {
      draft: lessonDraftSchema.parse({
        titleVi: `Bài học từ: ${input.videoTitle}`,
        topicVi: "Thói quen học tập",
        summaryVi:
          "Video nói về cách xây dựng thói quen học tiếng Anh qua nội dung thật.",
        summaryEn:
          "The speaker explains how to build an English study habit from real content.",
        estimatedLevel: input.cefrLevel,
        difficultyReasonsVi: ["Tốc độ nói vừa phải", "Từ vựng phổ thông"],
        vocabulary: Array.from({ length: 6 }, (_, index) => ({
          term: `term${index + 1}`,
          partOfSpeech: "noun",
          meaningVi: `nghĩa của từ ${index + 1}`,
          definitionEn: `A fixture definition for term ${index + 1}.`,
          exampleEn: `I used term${index + 1} in a new sentence.`,
          sourceSegmentIds: [index % 2 === 0 ? first.id : second.id],
        })),
        phrases: Array.from({ length: 3 }, (_, index) => ({
          phrase: `phrase ${index + 1}`,
          kind: "expression",
          meaningVi: `nghĩa của cụm ${index + 1}`,
          usageNoteVi: "Dùng trong hội thoại thân mật.",
          sourceSegmentIds: [second.id],
        })),
        grammarPoints: [
          {
            titleVi: "Thì hiện tại đơn",
            explanationVi: "Dùng để nói về thói quen và sự thật hiển nhiên.",
            pattern: "S + V(s/es)",
            exampleEn: "She reviews her notes every evening.",
            sourceSegmentIds: [first.id],
          },
        ],
        comprehensionQuestions: Array.from({ length: 3 }, (_, index) => ({
          questionVi: `Câu hỏi ${index + 1} về nội dung video?`,
          options: ["Đáp án đúng", "Phương án B", "Phương án C", "Phương án D"],
          correctIndex: 0,
          explanationVi: "Người nói đề cập trực tiếp trong đoạn được trích.",
          sourceSegmentIds: [index % 2 === 0 ? first.id : second.id],
        })),
        clozeItems: [
          {
            sentence: first.text.replace(answer, "___"),
            answer,
            hintVi: "Từ xuất hiện trong câu gốc.",
            sourceSegmentIds: [first.id],
          },
        ],
      }),
      modelId: "fixture-lesson-model",
      promptVersion: "lesson-prompt:fixture",
      inputTokens: 1234,
      outputTokens: 2345,
    };
  }
}
