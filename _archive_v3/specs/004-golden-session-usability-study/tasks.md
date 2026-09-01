# Tasks: Golden Session usability study gate

## Slice A — Lock the study contract

- [x] A1 Re-read the Golden Session validation thresholds and measurement map.
- [x] A2 Separate durable measurement facts from moderator-only observations.
- [x] A3 Define fail-closed interpretation for missing elapsed time and unscored after-listen evidence.

## Slice B — Add privacy-safe study input

- [x] B1 Add strict participant/moderator Zod schemas with bounded enums only.
- [x] B2 Require exactly five unique participant codes and unique session IDs.
- [x] B3 Add schema tests for duplicates, malformed input and privacy boundary.

## Slice C — Evaluate predeclared Gate 5 thresholds

- [x] C1 Add pure deterministic evaluator with one result per threshold.
- [x] C2 Require durable completion plus no-instruction observation for completion threshold.
- [x] C3 Derive changed-context attempt only from durable transfer attempts.
- [x] C4 Compute recognition improvement only from bounded moderator before/after levels.
- [x] C5 Compute five-session median elapsed time and fail closed on missing timing.
- [x] C6 Add pass/fail unit tests including independent threshold failures.

## Slice D — Make the real study runnable

- [x] D1 Add moderator runbook for recruitment, collection and interpretation plus a protected in-browser evaluator page.
- [x] D2 Document exactly how owner-scoped measurement summaries are captured per participant.
- [x] D3 Keep qualitative notes outside the automated evaluator and warn against unnecessary PII.

## Slice E — Converge previous measurement artifact

- [x] E1 Mark feature 003 local/database/full-CI/merge tasks complete using PR #126 exact-head evidence.

## Slice F — Verification and merge gate

- [x] F1 Adversarial review for PII, raw content, threshold drift and misleading learning/payment claims.
- [x] F2 Run typecheck, lint, unit tests and build; rely on full repository PR CI for final gate. PR #127 exact head `5c6c82e720bad95e0cfd25fbf2958a77c06068c9` passed CI run #469, including typecheck/lint, unit, production build, database/RLS, Chromium and durable Supabase learning journey.
- [x] F3 Open PR and merge only the exact reviewed head after every required job is green. PR #127 was squash-merged as `333bc47a288093b2be225fe1c97c0ef45b980eec` after CI #469 succeeded on that exact reviewed head.

## Explicitly deferred

- recruiting the five real participants;
- entering fabricated/synthetic participants as if they were real evidence;
- declaring Gate 5 passed before real participant records exist;
- the 20–50 learner cohort;
- Gemini model benchmark/routing;
- payment/retention/legal validation.
