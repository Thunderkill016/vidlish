import { describe, expect, it } from "vitest";

import {
  GEMINI_FREE_TIER_CONTENT_USE,
  GEMINI_MODEL_REGISTRY_REVIEWED_AT,
  getRegisteredGeminiModel,
  registeredGeminiModelSupports,
} from "./gemini-model-registry";

describe("Gemini model registry", () => {
  it("is a dated operational snapshot rather than an undated pricing claim", () => {
    expect(GEMINI_MODEL_REGISTRY_REVIEWED_AT).toBe("2026-08-23");
    expect(GEMINI_FREE_TIER_CONTENT_USE).toBe(
      "may_be_used_to_improve_google_products",
    );
  });

  it("records the current production authoring default without inventing free-tier evidence", () => {
    const model = getRegisteredGeminiModel("gemini-3.7-flash");

    expect(model).toMatchObject({
      lifecycle: "stable",
      freeTierEvidence: "verify_at_enable",
    });
    expect(model?.capabilities).toContain("lesson_authoring");
  });

  it("records explicitly documented free-tier Flash and Flash-Lite candidates", () => {
    for (const modelId of [
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-flash-lite",
    ]) {
      const model = getRegisteredGeminiModel(modelId);
      expect(model?.freeTierEvidence).toBe("documented_free");
      expect(model?.capabilities).toContain("lesson_authoring");
    }
  });

  it("keeps Live, translation, TTS and embedding endpoints out of lesson authoring", () => {
    for (const modelId of [
      "gemini-3.1-flash-live-preview",
      "gemini-3.5-live-translate-preview",
      "gemini-3.1-flash-tts-preview",
      "gemini-embedding-2",
    ]) {
      expect(registeredGeminiModelSupports(modelId, "lesson_authoring")).toBe(
        false,
      );
    }
  });

  it("does not make capability or free-tier claims for an explicit future model", () => {
    expect(getRegisteredGeminiModel("gemini-4.0-flash")).toBeUndefined();
    expect(
      registeredGeminiModelSupports("gemini-4.0-flash", "lesson_authoring"),
    ).toBeUndefined();
  });
});
