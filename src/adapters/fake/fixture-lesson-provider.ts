import "server-only";

import type {
  LessonGenerationInput,
  LessonGenerationProvider,
  LessonGenerationResult,
} from "@/modules/lesson/ports/lesson-generation-provider";
import { lessonDraftSchema } from "@/shared/contracts/lesson";

type GroundedText = Readonly<{
  text: string;
  segmentId: string;
}>;

function sourceWords(input: LessonGenerationInput): GroundedText[] {
  const seen = new Set<string>();
  const words: GroundedText[] = [];

  for (const segment of input.permittedSegments) {
    const matches = segment.text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? [];
    for (const word of matches) {
      const key = word.normalize("NFKC").toLowerCase().replace(/’/g, "'");
      if (seen.has(key)) continue;
      seen.add(key);
      words.push({ text: word, segmentId: segment.id });
    }
  }

  return words;
}

function sourcePhrases(input: LessonGenerationInput): GroundedText[] {
  const seen = new Set<string>();
  const phrases: GroundedText[] = [];

  for (const segment of input.permittedSegments) {
    const words = segment.text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? [];
    for (let index = 0; index + 1 < words.length; index += 1) {
      const phrase = `${words[index]} ${words[index + 1]}`;
      const key = phrase.normalize("NFKC").toLowerCase().replace(/’/g, "'");
      if (seen.has(key)) continue;
      seen.add(key);
      phrases.push({ text: phrase, segmentId: segment.id });
    }
  }

  return phrases;
}

/**
 * Deterministic stand-in for the model. It derives every teachable item from
 * the permitted transcript so fixture-backed journeys exercise the same
 * grounding and quality gates as a real provider instead of bypassing them.
 */
export class FixtureLessonProvider implements LessonGenerationProvider {
  async generate(
    input: LessonGenerationInput,
  ): Promise<LessonGenerationResult> {
    const first = input.permittedSegments[0];
    if (!first) throw new Error("Fixture lesson provider needs a segment.");

    const words = sourceWords(input);
    const phrases = sourcePhrases(input);
    if (words.length < 6 || phrases.length < 3) {
      throw new Error(
        "Fixture lesson provider needs enough permitted English text for six words and three phrases.",
      );
    }

    const firstWords = first.text.match(/[A-Za-z]+(?:['’][A-Za-z]+)?/g) ?? [];
    const answer = firstWords[1] ?? firstWords[0];
    if (!answer) {
      throw new Error("Fixture lesson provider needs a cloze answer.");
    }

    const questionSegments = input.permittedSegments.length
      ? input.permittedSegments
      : [first];

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
        vocabulary: words.slice(0, 6).map((item, index) => ({
          term: item.text,
          partOfSpeech: "word",
          meaningVi: `Từ nguồn số ${index + 1}`,
          definitionEn: "A grounded fixture word selected from the source transcript.",
          exampleEn: `I practiced using ${item.text} in a new sentence today.`,
          sourceSegmentIds: [item.segmentId],
        })),
        phrases: phrases.slice(0, 3).map((item, index) => ({
          phrase: item.text,
          kind: "expression",
          meaningVi: `Cụm từ nguồn số ${index + 1}`,
          usageNoteVi: "Fixture giữ cụm từ gắn với đúng đoạn transcript nguồn.",
          sourceSegmentIds: [item.segmentId],
        })),
        grammarPoints: [
          {
            titleVi: "Mẫu câu trong ngữ cảnh",
            explanationVi:
              "Fixture dùng một ví dụ mới để kiểm tra đường publish mà không chép nguyên câu nguồn.",
            pattern: "S + V + context",
            exampleEn: "She reviews a useful expression after every listening session.",
            sourceSegmentIds: [first.id],
          },
        ],
        comprehensionQuestions: Array.from({ length: 3 }, (_, index) => ({
          questionVi: `Câu hỏi ${index + 1} về nội dung video?`,
          options: ["Đáp án đúng", "Phương án B", "Phương án C", "Phương án D"],
          correctIndex: 0,
          explanationVi: "Người nói đề cập trực tiếp trong đoạn được trích.",
          sourceSegmentIds: [questionSegments[index % questionSegments.length].id],
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
