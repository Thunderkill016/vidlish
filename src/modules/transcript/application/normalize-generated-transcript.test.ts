import { describe, expect, it } from "vitest";

import { normalizeTranscript } from "@/modules/transcript/application/normalize-transcript";
import type { TranscriptCandidate } from "@/shared/contracts/transcript";

function candidate(providerRequestId: string): TranscriptCandidate {
  return {
    strategyId: "supadata-generated-transcript",
    provider: "supadata",
    sourceType: "hosted_generated_transcript",
    videoId: "nocaption01",
    providerRequestId,
    declaredLanguage: "en",
    availableLanguages: ["en"],
    trackKind: "unknown",
    translationStatus: "original",
    chunks: [
      {
        text: "Generated transcription of original source speech.",
        offsetMs: 0,
        durationMs: 2500,
        language: "en",
      },
      {
        text: "The request identifier must not change canonical content identity.",
        offsetMs: 2700,
        durationMs: 3200,
        language: "en",
      },
    ],
  };
}

describe("generated transcript normalization", () => {
  it("preserves provenance but excludes request IDs from the content hash", () => {
    const first = normalizeTranscript(candidate("request-one"));
    const retry = normalizeTranscript(candidate("request-two"));

    expect(first).toMatchObject({
      strategyId: "supadata-generated-transcript",
      sourceType: "hosted_generated_transcript",
      providerRequestId: "request-one",
      translationStatus: "original",
    });
    expect(retry.providerRequestId).toBe("request-two");
    expect(retry.normalizedHash).toBe(first.normalizedHash);
    expect(retry.segments).toEqual(first.segments);
  });
});
