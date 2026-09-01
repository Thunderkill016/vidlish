# Feature Specification: Golden Session local study harness

**Feature branch:** `feature/golden-session-study-harness`  
**Status:** implementation  
**Authority:** `docs/product/learning-model-v2/golden-session-validation.md`

## Problem

Gate 5 now has a strict five-participant evaluator, but the operator path is still
fragile:

- the measurement endpoint reads durable evidence from Supabase, while ordinary
  local development uses an in-memory learning repository;
- the Golden Session browser stores its durable session id internally, but the
  moderator runbook currently asks the operator to supply that UUID manually;
- the existing durable Golden fixture is deliberately owner-bound, so creating
  several simultaneous fake identities would require broader fixture and routing
  changes unrelated to the learner study;
- a developer's shell may contain real provider credentials, which must not leak
  into a manual usability session that should run entirely on local fixtures.

This makes the five-person protocol reproducible in theory but unnecessarily easy
to execute incorrectly in practice.

## Goal

Provide a local, fixture-backed study harness that lets a moderator run **one real
participant at a time** against the already-proven durable Golden Session, capture
that participant's privacy-safe measurement without DevTools/database inspection,
and reset the local learner state before the next participant.

The harness is an operator aid. It does not create, simulate, score, recruit, or
replace real participants.

## Acceptance boundary

1. A single local command prepares the existing durable Golden Session fixture in
   local Supabase and starts Vidlish with fake authentication and fixture-only
   external providers.
2. The command explicitly removes inherited production/provider credentials and
   replaces Supabase credentials with those of the local Supabase instance.
3. The harness uses the existing owner-bound durable fixture and runs one real
   participant per fresh database/browser-state cycle; it does not add a fake
   multi-user production model merely for the study.
4. A protected capture page discovers the current Golden Session id from the
   Golden lab's local browser state, requests the existing owner-scoped
   measurement endpoint, validates the response, and never accepts a session id
   typed by the moderator.
5. The capture page asks only for the already-approved bounded moderator fields,
   builds exactly one `GoldenSessionUsabilityParticipant`, and keeps that record
   in the browser only.
6. The capture page must not infer completion-without-help, goal restatement,
   recognition gain, blockage, or severe defects from telemetry.
7. The operator can clear only the Golden Session browser state after copying the
   participant record; the next participant also requires a fresh local harness
   reset so server-side learning state cannot leak across participants.
8. Durable browser evidence proves that an authenticated owner can capture their
   own measurement and that another owner cannot read that session's measurement.
9. The existing five-person evaluator remains the only automated Gate 5 verdict;
   this feature must not declare Gate 5 passed.

## Privacy and evidence invariants

- Do not persist the assembled usability participant or moderator observation to
  Supabase.
- Do not add learner name, email, phone, IP, user agent, raw answer, transcript,
  raw audio, recognized speech, provider error text, or free-form notes to the
  capture contract.
- Measurement remains owner-scoped at the existing server endpoint.
- `afterListen.latestVerdict` remains unscored and never becomes recognition-gain
  evidence.
- Browser reset deletes only the Golden lab state key for the active blueprint.
- No product-learning state is promoted from client-local state to server
  authority.

## Provider and environment safety

The harness must fail closed around external services:

- local Supabase only;
- `AUTH_ADAPTER=fake`;
- lesson/transcript/video provider adapters remain fixtures for this operator
  flow;
- no Gemini, Supadata, or YouTube API credential is inherited by the child app;
- no production Supabase URL/key is inherited by the child app;
- no production deployment or paid-provider call is part of this feature.

## Non-goals

- recruiting five target learners;
- fabricating or auto-filling participant observations;
- running all five participants in one database at once;
- changing learning progression, support, retry, transfer, review, or mastery
  semantics;
- changing the Golden Session lesson content;
- adding analytics vendors;
- the 20–50 learner cohort;
- model benchmarking;
- payment, retention, legal, billing, or rollout validation.

## Acceptance criteria

1. The local harness command can prepare a clean durable Golden fixture without
   production/provider credentials.
2. Harness configuration is testable as pure code: credential sanitization and
   local runtime overrides are deterministic.
3. The capture page obtains `sessionId` from the current Golden browser state and
   successfully loads a schema-valid `LearningMeasurementSummary` from the
   owner-scoped endpoint.
4. Missing, malformed, not-yet-started, or non-owned session state fails closed
   with actionable operator copy instead of accepting manual identifiers.
5. Moderator fields use bounded controls and have no silent defaults that could
   manufacture positive evidence.
6. The generated participant JSON passes
   `goldenSessionUsabilityParticipantSchema` and is not posted or persisted by
   the capture page.
7. Clearing browser state removes only the Golden Session storage key and leaves
   the captured JSON visible long enough to copy it first.
8. A durable Supabase Chromium test proves own-session capture and cross-owner
   measurement rejection.
9. The runbook documents the full one-participant-at-a-time reset/capture flow
   and states that five genuine participant records are still required.
10. Full required CI passes on the exact reviewed PR head before merge.
