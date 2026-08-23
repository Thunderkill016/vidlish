# Plan — Feature 012

## Approach

Add a small shared capability contract and extend the existing capability-summary application module with a conservative beginner-evidence projection before changing learner routing or database shape again.

The model deliberately separates:

- `targetSkill`: the language capability the task is designed to measure;
- `responseMode`: how the learner supplied the answer;
- `support`: whether bounded help was opened;
- `outcome`: whether the measured attempt succeeded;
- `evidenceKind`: provenance without raw learner payload.

This prevents an integrated task from accidentally promoting every channel it touches. Dictation, for example, can require a written response while still being treated as listening evidence.

## Implementation

1. Add `src/shared/contracts/learning-capability.ts` with strict Zod schemas for the four skills, support level, response mode and observation shape.
2. Extend `summarise-capability-evidence.ts` with a beginner evidence projector so the new logic stays inside an already wired application boundary.
3. Map durable dictation to `targetSkill: listening`, `responseMode: writing`.
4. Keep existing productive retrieval visible as `unclassifiedProductiveRetrievals`; do not infer speaking or writing from it.
5. Add unit tests for independent/supported dictation, response-mode separation and fail-closed legacy evidence.

## Data strategy

No migration is required in this slice. Feature 011 already stores the dictation timestamps needed for a safe projection. Existing productive evidence lacks modality provenance, so modifying historical rows would fabricate learner history.

A later feature can add modality to new server-owned challenges and persist generic capability observations once the task authority actually records enough information.

## Verification

Run the repository's complete CI on the exact PR head: typecheck/lint, unit tests, production build, Chromium product journeys, Supabase migration/RLS tests and durable Supabase learning journey.
