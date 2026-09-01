# Tasks: Golden Session local study harness

## Slice A — Lock operator and safety boundary

- [x] A1 Audit the measurement endpoint, fake identity, durable fixture and ownership constraints.
- [x] A2 Decide on one real participant per clean local DB/browser cycle instead of weakening owner-bound fixture semantics.
- [x] A3 Define provider/environment fail-closed requirements and non-goals.

## Slice B — Build local durable harness

- [x] B1 Add pure helpers for parsing local Supabase status and constructing a sanitized child runtime environment.
- [x] B2 Add unit tests proving inherited production/provider credentials are removed and local fixture selectors are forced.
- [x] B3 Add `study:golden` package command that resets local Supabase, loads the existing durable Golden fixture and launches the app.
- [x] B4 Print exact operator URLs, fixture sign-in details and fresh-reset warning without printing secrets.

## Slice C — Capture one participant without DevTools

- [x] C1 Add protected `/learning-lab/v2/usability/capture` page.
- [x] C2 Resolve the current Golden session only from the existing versioned localStorage record.
- [x] C3 Fetch and validate owner-scoped `LearningMeasurementSummary`; fail closed on missing/malformed/non-owned state.
- [x] C4 Collect every moderator-only observation with bounded, initially-unset controls.
- [x] C5 Build and display one schema-valid `GoldenSessionUsabilityParticipant` JSON without persisting it.
- [x] C6 Add narrowly-scoped Golden browser-state reset after capture.

## Slice D — Durable ownership/browser proof

- [x] D1 Add a second fake identity to the isolated durable test allowlist only for cross-owner measurement rejection.
- [x] D2 Add durable Chromium coverage for automatic session capture, unset moderator fields, participant JSON generation and scoped reset.
- [x] D3 Prove a second owner cannot read the first owner's measurement.
- [x] D4 Wire the focused capture journey into the existing isolated durable Supabase CI job.

## Slice E — Converge operator documentation

- [x] E1 Update the Gate 5 runbook with the local harness and one-participant-per-reset procedure.
- [x] E2 Document how participant JSON is copied before reset and combined only after five genuine sessions exist.
- [x] E3 Mark feature 004 F2/F3 complete using PR #127, CI #469 and merge commit evidence.

## Slice F — Verification and merge

- [x] F1 Run focused unit/durable browser checks where available. PR #128 exact head `51c4ff44bb85fca8cee4f8b39a7e90297fe43d69` passed the focused harness/unit coverage and durable Supabase browser journey in CI #474.
- [x] F2 Adversarial review for credential leakage, ownership bypass, raw content, fabricated observation and broad browser reset.
- [x] F3 Open draft PR and run full required CI on the exact reviewed head. PR #128 CI #474 / run `32571811299` passed typecheck/lint, unit tests, production build, Supabase migration/RLS, Chromium product journeys, durable Supabase learning journey and the aggregate CI gate on exact head `51c4ff44bb85fca8cee4f8b39a7e90297fe43d69`.
- [x] F4 Merge only after every required exact-head job is green. PR #128 was squash-merged to `main` as `fdbee37bd3b1eca473b3c25f65eece772251d987` after CI #474 succeeded on that exact reviewed head.

## Explicitly deferred

- recruiting the five real participants;
- fabricating five study records;
- declaring Gate 5 passed;
- simultaneous multi-owner fixture lessons;
- changing Golden Session learning behavior;
- the 20–50 learner cohort;
- paid providers, production Supabase or model benchmarking;
- payment, retention, legal, billing or rollout work.
