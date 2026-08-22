# Feature 007: Invalidate stale Golden participant records

## Problem

The Golden Session capture page builds a participant JSON record from the current durable measurement plus moderator observations. After that record is built, the moderator can still change an observation field while the already-built JSON remains visible and copyable.

That creates an evidence-integrity mismatch: the form can display one observation state while the copied participant record still contains an older state. With a five-participant Gate 5 study, one stale record can contaminate the bounded dataset.

## Acceptance boundary

- Building a valid participant record continues to produce schema-valid JSON from the current measurement and current moderator observations.
- If any moderator observation changes after a participant record has been built, that built record is immediately invalidated and is no longer visible/copyable until the moderator explicitly builds again.
- The newly rebuilt record must contain the changed observation.
- Clearing only the Golden browser-state key after a record is built continues to keep the already-built record available for copying, because that reset is an explicit post-capture action in the study protocol rather than an observation change.
- Reloading durable measurement continues to invalidate an already-built record.

## Invariants / non-goals

- Do not persist participant JSON to the server or browser storage.
- Do not change the Gate 5 evaluator, participant schema, thresholds, participant count, or uniqueness rules.
- Do not infer moderator observations from telemetry.
- Do not change the local Supabase reset protocol or Golden Session learning runtime.
- Do not call production Supabase or paid providers.

## Proof

Chromium coverage must demonstrate:

1. a valid record can be built;
2. changing one observation removes the stale record;
3. rebuilding produces JSON carrying the changed value;
4. the scoped browser-state reset still preserves the freshly built record as before.

Full repository CI on the exact PR head remains the merge gate.