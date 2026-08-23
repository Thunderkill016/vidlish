# Feature 010 — Gemini capability registry

## Problem

Vidlish currently treats `LESSON_MODEL_ID` as an opaque string. That is useful for adopting a newer model without a code change, but it also means the code cannot distinguish a lesson-authoring model from Live, TTS, translation or embedding endpoints. As more free-tier Gemini capabilities become useful, blindly routing by model name would create correctness, privacy and operability risks.

The current product authority still requires one enabled production authoring provider/model/key and defers authoring-model comparison to Gate 7. This feature must create the metadata/policy foundation without introducing automatic multi-model production fallback or claiming that free-tier processing is private.

## User / operator outcome

An operator can explicitly select a production lesson model as before. The application knows the capabilities and lifecycle of registered Gemini models, rejects a registered model that is known not to support lesson authoring, and remains forward-compatible with an explicit future model ID that has not yet been added to the registry.

## Acceptance criteria

1. A versioned Gemini model registry records, for each registered model, its model ID, lifecycle, learning-relevant capabilities, free-tier evidence state and review date.
2. The registry includes the current learning-relevant Gemini families: Flash/Flash-Lite authoring candidates, Live conversation, Live translation, TTS and Embedding 2.
3. Free-tier metadata distinguishes `documented_free` from `verify_at_enable`; it must not infer free availability where the current official documentation is ambiguous.
4. Free-tier data handling is explicit: content sent through the free Gemini Developer API tier may be used to improve Google products; the registry must not describe it as a private learner-data path.
5. `LESSON_MODEL_ID` remains one explicitly configured model. No round-robin, quota cycling or automatic production fallback is introduced.
6. When Gemini lesson/learning authoring is enabled, a registered model that lacks `lesson_authoring` is rejected at configuration load.
7. An unregistered future model ID remains allowed as an explicit override, preserving the existing no-code migration path, but the registry returns no free-tier/capability claims for it.
8. `.env.example` and the runtime default agree on the lesson model ID.
9. Unit tests cover registry metadata, known incompatible-model rejection, explicit future-model allowance and the current default.

## Non-goals

- changing the production model;
- invoking Gemini during tests;
- adding Live/TTS/embedding learner features;
- sending learner speech or writing to a free tier;
- automatic multi-model routing/fallback;
- claiming Gate 5 or Gate 7 has passed.

## Invariants

- Model output is never learner-evidence authority.
- Grounding/reveal/ownership boundaries remain unchanged.
- Unknown model IDs may be explicitly selected, but they receive no inferred capability/free-tier metadata.
- Preview capabilities remain distinguishable from stable ones.
- Provider metadata is a dated operational snapshot and must be revalidated before enabling a new capability.
