export const GEMINI_MODEL_REGISTRY_REVIEWED_AT = "2026-08-23" as const;

export const GEMINI_FREE_TIER_CONTENT_USE =
  "may_be_used_to_improve_google_products" as const;

export const GEMINI_PAID_TIER_CONTENT_USE =
  "not_used_to_improve_google_products" as const;

export type GeminiAiCapability =
  | "lesson_authoring"
  | "lightweight_structured"
  | "bounded_feedback"
  | "realtime_speaking"
  | "realtime_translation"
  | "speech_synthesis"
  | "embedding";

export type GeminiModelLifecycle = "stable" | "preview";
export type GeminiFreeTierEvidence = "documented_free" | "verify_at_enable";

export type GeminiModelDescriptor = Readonly<{
  modelId: string;
  lifecycle: GeminiModelLifecycle;
  capabilities: readonly GeminiAiCapability[];
  freeTierEvidence: GeminiFreeTierEvidence;
  shutdownDate?: string;
  replacementModelId?: string;
}>;

/**
 * Dated operational metadata, not a permanent pricing contract.
 *
 * Sources reviewed on 2026-08-23:
 * - Gemini Developer API pricing
 * - latest-model guidance
 * - deprecations
 * - individual model reference pages
 *
 * `documented_free` means the official pricing page explicitly listed free
 * input/output for the model at review time. `verify_at_enable` deliberately
 * avoids making a free-tier claim where current provider documentation was not
 * sufficiently clear. Every new learner-facing capability must re-check the
 * provider docs before it is enabled.
 */
export const GEMINI_MODEL_REGISTRY = [
  {
    modelId: "gemini-3.7-flash",
    lifecycle: "stable",
    capabilities: [
      "lesson_authoring",
      "lightweight_structured",
      "bounded_feedback",
    ],
    freeTierEvidence: "verify_at_enable",
  },
  {
    modelId: "gemini-3.6-flash",
    lifecycle: "stable",
    capabilities: [
      "lesson_authoring",
      "lightweight_structured",
      "bounded_feedback",
    ],
    freeTierEvidence: "documented_free",
  },
  {
    modelId: "gemini-3.5-flash",
    lifecycle: "stable",
    capabilities: [
      "lesson_authoring",
      "lightweight_structured",
      "bounded_feedback",
    ],
    freeTierEvidence: "documented_free",
  },
  {
    modelId: "gemini-3.5-flash-lite",
    lifecycle: "stable",
    capabilities: [
      "lesson_authoring",
      "lightweight_structured",
      "bounded_feedback",
    ],
    freeTierEvidence: "documented_free",
  },
  {
    modelId: "gemini-3.1-flash-lite",
    lifecycle: "stable",
    capabilities: [
      "lesson_authoring",
      "lightweight_structured",
      "bounded_feedback",
    ],
    freeTierEvidence: "documented_free",
    shutdownDate: "2027-05-07",
    replacementModelId: "gemini-3.5-flash-lite",
  },
  {
    modelId: "gemini-3.1-flash-live-preview",
    lifecycle: "preview",
    capabilities: ["realtime_speaking", "bounded_feedback"],
    freeTierEvidence: "documented_free",
  },
  {
    modelId: "gemini-3.5-live-translate-preview",
    lifecycle: "preview",
    capabilities: ["realtime_translation"],
    freeTierEvidence: "documented_free",
  },
  {
    modelId: "gemini-3.1-flash-tts-preview",
    lifecycle: "preview",
    capabilities: ["speech_synthesis"],
    freeTierEvidence: "documented_free",
  },
  {
    modelId: "gemini-embedding-2",
    lifecycle: "stable",
    capabilities: ["embedding"],
    freeTierEvidence: "documented_free",
  },
  {
    modelId: "gemini-embedding-001",
    lifecycle: "stable",
    capabilities: ["embedding"],
    freeTierEvidence: "documented_free",
    shutdownDate: "2028-05-14",
    replacementModelId: "gemini-embedding-2",
  },
] as const satisfies readonly GeminiModelDescriptor[];

const modelById = new Map<string, GeminiModelDescriptor>(
  GEMINI_MODEL_REGISTRY.map((model) => [model.modelId, model]),
);

export function getRegisteredGeminiModel(
  modelId: string,
): GeminiModelDescriptor | undefined {
  return modelById.get(modelId);
}

/**
 * `undefined` means the model is an explicit future/unregistered override.
 * Callers must not infer capability or free-tier properties for it, but keeping
 * this state distinct from `false` preserves the existing no-code migration
 * path for a newly released model ID.
 */
export function registeredGeminiModelSupports(
  modelId: string,
  capability: GeminiAiCapability,
): boolean | undefined {
  const registered = getRegisteredGeminiModel(modelId);
  if (!registered) return undefined;
  return registered.capabilities.includes(capability);
}
