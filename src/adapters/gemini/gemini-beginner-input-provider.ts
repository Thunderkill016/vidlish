import "server-only";

import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import type {
  BeginnerInputProvider,
  BeginnerInputResult,
  DraftBeginnerInputRequest,
} from "@/modules/learning/ports/beginner-input-provider";
import { LearningAuthoringFailure } from "@/modules/learning/ports/learning-authoring-provider";

import { stripCodeFence } from "./gemini-lesson-provider";

/**
 * Sentences for the words a corpus cannot reach.
 *
 * Measured against the catalogue order, a learner with 25 known words has
 * almost no human-written sentence available to them. So this is not a fallback
 * for rare cases: it is the only thing that can carry roughly the first fifty
 * words, and it stops being load-bearing once retrieval takes over.
 *
 * The prompt is small on purpose, and it gets smaller in importance the more
 * the server checks. Every sentence returned here is re-checked against the
 * permitted vocabulary by `composeBeginnerInput`, so a model that ignores the
 * word list produces waste, not a bad lesson. That is the same division as the
 * video path — the model proposes, the server decides — and it is why the
 * prompt can afford to be a description rather than a contract.
 */

export const BEGINNER_INPUT_PROMPT_VERSION = "beginner-input-prompt:v1" as const;

const MAX_OUTPUT_TOKENS = 2_000;
const CALL_TIMEOUT_MS = 45_000;

/**
 * Sentences requested per usable sentence needed.
 *
 * Over-asking is what makes discarding cheap. The server throws away anything
 * that reaches for a word outside the list, and at the very start the list is
 * only a few dozen words long, so a meaningful share of drafts will miss.
 */
const OVERSUPPLY = 3;

/** `minItems` is one of the keywords Gemini refuses, so the count is prose. */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    sentences: { type: "array", items: { type: "string" } },
  },
  required: ["sentences"],
} as const;

const SYSTEM_INSTRUCTION = `Bạn viết câu tiếng Anh cho một người Việt mới học, đang ở mức gần như chưa biết gì.

Bạn được cho một DANH SÁCH TỪ ĐƯỢC PHÉP và MỘT TỪ MỚI. Mỗi câu chỉ được dùng những từ trong danh sách, cộng đúng một từ mới đó.

Luật cứng:
- Không dùng bất kỳ từ nào ngoài danh sách và từ mới. Kể cả từ rất thông dụng như "and", "very", "my" — nếu nó không có trong danh sách thì không được dùng.
- Dạng biến đổi của một từ trong danh sách vẫn là từ khác: danh sách có "go" không cho phép "goes" hay "going". Có "cat" không cho phép "cats".
- Mỗi câu phải chứa TỪ MỚI. Một câu không có từ mới thì vô dụng ở đây.
- Câu ngắn: 3 đến 7 từ. Người mới không giữ nổi câu dài.
- Câu phải là thứ một người thật sẽ nói. Đúng ngữ pháp mà chẳng ai nói bao giờ thì tệ hơn là không có câu nào — đó chính là lỗi khiến bài học trước không học nổi.
- Mỗi câu đặt từ mới vào một tình huống KHÁC nhau. Lặp lại cùng một khuôn với một danh từ khác không dạy thêm gì.
- Chỉ viết câu tiếng Anh. Không dịch, không giải thích, không phiên âm, không đánh số.

Một bộ luật xác định sẽ kiểm lại từng câu và vứt câu nào dùng từ ngoài danh sách. Bạn không lách được nó, và đừng cố đoán nó muốn gì — cứ viết đúng luật trên.`;

export function buildBeginnerInputPrompt(
  request: DraftBeginnerInputRequest,
): string {
  const permitted = [...request.known].sort();
  return [
    `TỪ MỚI cần dạy: ${request.target}`,
    "",
    `DANH SÁCH TỪ ĐƯỢC PHÉP (${permitted.length} từ):`,
    permitted.length > 0 ? permitted.join(", ") : "(chưa có từ nào)",
    "",
    `Viết ${request.count} câu khác nhau.`,
  ].join("\n");
}

/**
 * The model is asked for a shape, not trusted to return one. A response that is
 * the right JSON but the wrong type is the failure that reaches production,
 * because it survives `JSON.parse` and only breaks later, somewhere else.
 */
export function readSentences(parsed: unknown): string[] {
  if (parsed === null || typeof parsed !== "object") return [];
  const sentences = (parsed as { sentences?: unknown }).sentences;
  if (!Array.isArray(sentences)) return [];
  return sentences.filter(
    (sentence): sentence is string =>
      typeof sentence === "string" && sentence.trim().length > 0,
  );
}

export type GeminiBeginnerInputOptions = {
  apiKey: string;
  modelId: string;
};

export class GeminiBeginnerInputProvider implements BeginnerInputProvider {
  private readonly client: GoogleGenAI;

  constructor(private readonly options: GeminiBeginnerInputOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
  }

  async draft(request: DraftBeginnerInputRequest): Promise<BeginnerInputResult> {
    const asked = { ...request, count: request.count * OVERSUPPLY };

    let response;
    try {
      response = await this.client.models.generateContent({
        model: this.options.modelId,
        contents: buildBeginnerInputPrompt(asked),
        config: {
          abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          // Matching the one setting this codebase has actually measured, on
          // the authoring call, where MINIMAL produced work that looked
          // complete and taught nothing. Whether a closed word list needs the
          // same level here is unmeasured, and saying so is cheaper than
          // guessing low and shipping sentences nobody would say.
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      const permanent = /\b(400|401|403|404)\b/.test(message);
      throw new LearningAuthoringFailure(
        `Beginner input request failed: ${message}`,
        !permanent,
        { cause: error },
      );
    }

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      throw new LearningAuthoringFailure(
        "Beginner input output was truncated.",
        true,
      );
    }
    if (finishReason && finishReason !== "STOP") {
      throw new LearningAuthoringFailure(
        "Beginner input was declined by the provider.",
        false,
      );
    }

    const text = response.text;
    if (!text) {
      throw new LearningAuthoringFailure(
        "Beginner input returned no text.",
        true,
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(text));
    } catch {
      throw new LearningAuthoringFailure(
        "Beginner input output was not valid JSON.",
        true,
      );
    }

    return {
      sentences: readSentences(parsed),
      modelId: response.modelVersion ?? this.options.modelId,
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
