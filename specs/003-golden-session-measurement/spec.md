# Feature Specification: Make the Golden Session measurable for five-person usability

**Feature ID:** 003-golden-session-measurement  
**Status:** implementation  
**Created:** 2026-08-22

## Problem

The Golden Session is durable and browser-tested, but its own validation protocol is not yet fully observable for a moderated five-person run.

Vidlish already stores authoritative session state, attempts, evaluation outcomes and bounded support/replay evidence. Those rows can prove many protocol events without another analytics system. They cannot prove some client-observable facts: that a bounded source range actually finished playing, that a correction reached the learner's screen, or that the media/runtime failed.

Treating `playback` as `source play completed` would be false: the existing playback evidence is recorded when the learner starts playback, before the YouTube player reports `ENDED`.

The product must become measurable without collecting raw learner text/audio, transcript content, arbitrary event JSON, IP address, user agent, email or third-party analytics identifiers.

## Goal

Create the smallest privacy-safe measurement slice that makes the Golden Session protocol inspectable before the five-person usability gate.

Prefer deriving measurement from existing durable evidence. Persist a new event only when the fact cannot be reconstructed from session, attempt or support rows.

## User stories

### US1 — The operator can distinguish started playback from completed playback

When a learner starts a source clip, existing support evidence continues to record playback/replay semantics. When the YouTube player reaches the bounded range's `ENDED` state, Vidlish records a separate privacy-safe `source_play_completed` fact.

**Acceptance criteria**
- `playback` semantics and replay counting do not change.
- A source completion event is emitted only from the player's confirmed `ENDED` state, never from the play button.
- The event contains no video transcript, caption text or arbitrary provider error text.
- Duplicate network delivery is idempotent.

### US2 — Correction and runtime defects are inspectable without storing learner content

The moderated operator can tell whether an incorrect attempt was followed by a correction being rendered and whether a technical player/runtime failure occurred.

**Acceptance criteria**
- `correction_shown` can only refer to an owned session activity and contains no answer/correction copy.
- The UI uses the matching incorrect attempt row ID as the correction event's idempotency key; the production RPC verifies that ID belongs to the same owner/session/activity and has verdict `incorrect`.
- Runtime defects use a bounded error-kind enum; free-form exception/provider messages are never persisted.
- The system does not infer `correction_shown` merely because an incorrect attempt exists.
- Existing attempt rows remain the authority for the learner's response evidence and evaluation outcome.

### US3 — The measurement model does not duplicate facts already stored durably

A maintainer can map the Golden protocol to source-of-truth evidence without maintaining two competing analytics ledgers.

**Acceptance criteria**
- Session start/completion are derived from `lesson_sessions`.
- Gist/retrieval/transfer/after-listen attempts and outcomes are derived from `activity_attempts`.
- Support requests and replay are derived from `learning_support_events`.
- New measurement rows are restricted to bounded client-observable facts that existing tables cannot prove.
- The design documents how `session_viewed`, target-notice exposure and abandonment are interpreted without pretending to observe pixels or browser closure that the product cannot reliably prove.

### US4 — Measurement data preserves ownership and privacy boundaries

**Acceptance criteria**
- New public-schema table has RLS enabled.
- Authenticated clients may select only their own rows and cannot directly insert/update/delete measurement rows.
- Server-side persistence verifies session ownership and activity membership before inserting.
- `anon` has no table or function privilege.
- `service_role` is never exposed to the browser.
- No arbitrary JSON payload column exists.
- No production Supabase or paid provider call is required to implement or verify this feature.

## Event model

### Existing facts — derive, do not duplicate

- session started/resumed/completed → `lesson_sessions`;
- gist/retrieval/transfer/after-listen attempts and outcomes → `activity_attempts`;
- retry attempt number → `activity_attempts.attempt_number`;
- support requested/level → `learning_support_events.support_opened`;
- replay → `learning_support_events.playback` with `playback_ordinal >= 2`.

### New bounded client-observable facts

- `source_play_completed` — player confirmed the bounded clip ended;
- `correction_shown` — post-attempt correction/result panel was rendered for the exact incorrect attempt referenced by the event key;
- `runtime_error` — a bounded technical error category occurred in the learning runtime.

`session_viewed` is represented by successful session start/resume because the learner page must call that server boundary before the active lesson is shown. `target_notice_viewed` is conservatively represented by a persisted attempt on the target meaning/noticing activity rather than claiming pixel visibility. A started session that does not complete is reported as incomplete/abandoned-at-last-known-activity during moderated analysis; Vidlish does not use unreliable page-unload telemetry to mutate durable learning state.

## Bounded runtime error kinds

Initial allowed values:

- `youtube_api_load`
- `youtube_player`
- `session_request`
- `attempt_request`
- `support_request`

No provider code/message/string is stored.

## Non-goals

- General-purpose product analytics.
- Marketing attribution, funnels across anonymous visitors, device fingerprinting or third-party analytics SaaS.
- Recording raw open responses or audio.
- Persisting transcript/caption/source text in measurement rows.
- Changing learning evaluation, progression, retry, support or mastery semantics.
- Changing Gemini/provider models.
- Running the five-person study in this implementation PR.
- Cohort/retention analytics.

## Invariants

- Existing learning tables remain the authority for durable learning evidence.
- A measurement event must never strengthen a learning capability claim.
- Attempt/reveal/correction/retry boundaries remain server-owned.
- Completion != mastery.
- Scheduler state != capability.
- Source grounding remains unchanged.
- Measurement failure must not fabricate a successful learning action.

## Success criteria

1. The first Golden source range has separately inspectable `playback started` and `source play completed` facts.
2. An incorrect retrieval attempt can be followed by a distinct bounded `correction_shown` record bound to that incorrect attempt.
3. Player/runtime failures can be classified without free-form diagnostic content in learner measurement data.
4. Existing durable evidence plus the new bounded events cover the measurement needed to run the five-person protocol without an external analytics provider.
5. Full exact-head CI is green before merge.
