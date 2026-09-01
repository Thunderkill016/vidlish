# Tasks — Gemini capability registry

- [x] Add `src/platform/ai/gemini-model-registry.ts` with dated provider metadata and product-oriented capabilities.
- [x] Add unit tests for registered authoring/free-tier/live/TTS/embedding metadata and unknown model behavior.
- [x] Integrate a compatibility check into server configuration without adding automatic model routing.
- [x] Add server-config tests for a registered incompatible model and an explicit unknown future model.
- [x] Align `.env.example` with the runtime default model.
- [x] Run the repository full verification gate before merge.

## Verification evidence

Implementation head `802c90b5daec995b77dff5614446eec4b9cd71e2` passed CI #498 / run `32631940099`:

- typecheck + lint: success;
- unit tests: success;
- production build: success;
- Supabase migration + RLS/pgTAP: success;
- Chromium product journeys: success;
- durable Supabase-backed Golden Session learning journey: success;
- aggregate CI gate: success.

This convergence commit changes feature documentation only. The pull request must still pass the repository gate again on the latest exact head before merge.
