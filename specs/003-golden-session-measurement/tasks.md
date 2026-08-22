# Tasks: Golden Session measurement

## Slice A — Lock measurement semantics

- [x] A1 Trace Golden Session UI/API/application/port/adapter/database path.
- [x] A2 Map protocol events to existing durable truth vs genuinely missing client-observable facts.
- [x] A3 Confirm existing `playback` fires at play start and must not be relabeled as completed listen.
- [x] A4 Review current Supabase RLS/grant/function guidance before schema design.
- [x] A5 Specify bounded event/error enums and explicit privacy exclusions.

## Slice B — Add the bounded measurement contract and application service

- [x] B1 Add shared request/persisted event schemas with strict Zod validation.
- [x] B2 Add a separate `LearningProductEventRepository` record/list boundary so product telemetry does not become learning evidence.
- [x] B3 Implement `RecordLearningProductEvent` ownership/activity/evidence checks.
- [x] B4 Add focused unit tests proving invalid/free-form payloads are rejected and measurement does not change learning evidence.

## Slice C — Persist measurement with Supabase safely

- [x] C1 Add additive migration for `learning_product_events` plus indexes, RLS, grants and service-only RPC.
- [x] C2 Add pgTAP coverage for RLS, grants, ownership, event shape and idempotency.
- [x] C3 Implement fake repository support.
- [x] C4 Implement Supabase repository support and strict result mapping.
- [ ] C5 Run local schema verification where available, then database CI.

## Slice D — Add authenticated API

- [x] D1 Add `POST /api/learning-lab/v2/product-events` using existing same-origin/auth/blueprint resolution patterns.
- [x] D2 Add contract/application/browser coverage for ownership, malformed payload, bounded error categories and the real POST route.

## Slice E — Instrument confirmed UI facts

- [x] E1 Add YouTube `onEnded` callback without changing existing `onPlay`/replay semantics.
- [x] E2 Add bounded player error callbacks with no raw provider error text.
- [x] E3 Emit `source_play_completed` from confirmed `PlayerState.ENDED`.
- [x] E4 Emit `correction_shown` once per incorrect persisted attempt after the result panel is rendered.
- [x] E5 Emit bounded request/player runtime errors where useful for moderated diagnosis without turning measurement failures into learning outcomes.

## Slice F — Make the five-person evidence inspectable

- [x] F1 Add a privacy-safe session measurement summary/projection using existing session/attempt/support truth plus bounded product events.
- [x] F2 Expose it through an owner-scoped internal API suitable for the moderated operator.
- [x] F3 Document exact mapping from Golden protocol metrics to persisted fields and what remains operator-observed.
- [x] F4 Add a desktop/mobile browser journey proving play-start vs confirmed-end, rendered correction measurement and product-event payload privacy.

## Slice G — Adversarial review and merge gate

- [x] G1 Review for answer leakage, raw text/audio/transcript/PII, arbitrary JSON, ownership drift and service-role exposure.
- [x] G2 Review that measurement events never update capability/mastery state.
- [x] G3 Review that `playback` and `source_play_completed` remain distinct semantics.
- [ ] G4 Run typecheck, lint, unit, build, pgTAP, Chromium and durable Supabase journey.
- [ ] G5 Open draft PR; merge only exact reviewed head after all required jobs are green.

## Explicitly deferred

- actually recruiting/running the five-person moderated study;
- 20–50 learner cohort;
- third-party analytics;
- Gemini model benchmark/routing;
- pronunciation/speaking scoring;
- marketing/device attribution.
