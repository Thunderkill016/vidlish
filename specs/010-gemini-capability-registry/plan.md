# Plan — Gemini capability registry

## Architecture

Add a side-effect-free provider metadata module under `src/platform/ai/`.

The registry records model ID, lifecycle, learning-relevant capabilities, free-tier evidence state, review date and source references. It does not instantiate a provider or choose a model automatically.

`src/platform/config/server.ts` will consult the registry for one compatibility check: when Gemini lesson authoring is enabled, a registered model that is known not to support `lesson_authoring` is rejected. An unknown future model ID remains an explicit override and receives no inferred registry claims.

`create-learning-authoring-runtime.ts` continues to pass the single configured `LESSON_MODEL_ID` to `GeminiLearningAuthoringProvider`.

## Capabilities

- `lesson_authoring`
- `lightweight_structured`
- `bounded_feedback`
- `realtime_speaking`
- `realtime_translation`
- `speech_synthesis`
- `embedding`

## Free-tier policy

`documented_free` means the official pricing documentation explicitly listed free input/output for the model at review time.

`verify_at_enable` means the registry intentionally makes no free-tier claim and a future feature must re-check current provider documentation.

The registry also records the current provider-wide free-tier content-use warning so future features do not infer a stronger privacy property than the provider documents.

## Reviewed sources

Reviewed 2026-08-23 against the official Gemini pricing, latest-model, deprecation and model-reference documentation.

## Data

No database changes.

## Verification

Focused tests cover the registry and server configuration. The normal full repository gate remains required before merge. No provider-real call is needed for this slice.
