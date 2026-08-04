import { describe, expect, it } from "vitest";

import { FrancLanguageAnalysisAdapter } from "@/adapters/franc/franc-language-analysis-adapter";
import type { LanguageAnalysisWindow } from "@/shared/contracts/language-eligibility";

function window(
  idSuffix: string,
  text: string,
  wordCount: number,
): LanguageAnalysisWindow {
  return {
    id: `win_${idSuffix.repeat(24).slice(0, 24)}`,
    segmentIds: [`seg_${idSuffix.repeat(32).slice(0, 32)}`],
    startMs: 0,
    endMs: 30_000,
    text,
    wordCount,
  };
}

describe("FrancLanguageAnalysisAdapter", () => {
  const adapter = new FrancLanguageAnalysisAdapter({ minWindowWords: 8 });

  it("maps reliable English evidence to the canonical en code", async () => {
    const result = await adapter.analyze([
      window(
        "1",
        "Learning from complete ideas helps students notice recurring phrases, follow the speaker's reasoning, and reuse useful language in a new situation without copying the original example.",
        27,
      ),
    ]);

    expect(result.windows[0]).toMatchObject({
      detectorCode: "eng",
      detectedLanguage: "en",
    });
    expect(result.windows[0].reliability).not.toBe("low");
    expect(result.windows[0]).not.toHaveProperty("probability");
  });

  it("does not trust an English declaration when the analyzed text is Vietnamese", async () => {
    const result = await adapter.analyze([
      window(
        "2",
        "Việc học hiệu quả cần một mục tiêu rõ ràng, thời gian luyện tập đều đặn và khả năng tự giải thích kiến thức bằng những ví dụ gần gũi trong cuộc sống.",
        29,
      ),
    ]);

    expect(result.windows[0].detectedLanguage).not.toBe("en");
    expect(result.windows[0].reliability).not.toBe("low");
  });

  it("marks very short ambiguous text as low-reliability undetermined evidence", async () => {
    const result = await adapter.analyze([window("3", "Hello", 1)]);

    expect(result.windows[0]).toMatchObject({
      detectedLanguage: "und",
      reliability: "low",
    });
  });
});
