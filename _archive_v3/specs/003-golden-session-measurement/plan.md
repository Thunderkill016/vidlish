# Implementation Plan: Golden Session measurement

## Scope

Add a narrow privacy-safe event channel for client-observable Golden Session facts that current durable learning rows cannot prove. Keep existing session/attempt/support persistence authoritative and derive all possible measurement from it.

No learner-evaluation rule, lesson progression rule, provider, or production configuration changes.

## Current-state trace

`LearningSessionLab` → `/api/learning-lab/v2/*` → learning application services → `LearningSessionRepository` → fake/Supabase adapters → Postgres.

Current durable evidence:

- `lesson_sessions`: start/current activity/status/completion timestamps;
- `activity_attempts`: bounded response evidence, server evaluation and attempt number;
- `learning_support_events`: playback ordinal and opened support step;
- review state: delayed scheduling/evidence, outside this feature.

Gap:

- `YouTubeEvidencePlayer.onPlay` currently records playback immediately after `loadVideoById`, while the player separately receives `PlayerState.ENDED`. Therefore existing playback rows cannot prove a completed source listen.
- the server can prove an incorrect attempt but cannot prove the learner UI rendered the correction/result;
- player/runtime failures are shown locally but are not inspectable after a moderated run.

## Design decisions

### 1. Do not build a generic analytics payload

Add a dedicated contract with a closed event enum and closed error-detail enum. Do not add `properties jsonb`, `metadata jsonb`, arbitrary strings, URL, user-agent, IP, transcript, caption, response or audio columns.

### 2. Keep measurement facts separate from learning evidence

New events are product-observation evidence. They must never update `learning_item_states`, FSRS, independent recall, transfer or mastery claims.

### 3. Persist server time, not client-reported elapsed time

Every event receives `occurred_at = now()` in Postgres. Moderated elapsed time can be calculated from `lesson_sessions.started_at`. The browser supplies no timestamp or duration that can drift/spoof.

### 4. Validate ownership and activity membership at the application and database boundaries

The application service verifies the owned session and activity in the immutable blueprint. Supabase persistence repeats the ownership/activity check in one database function before insert. Idempotency is resolved before current-activity validation so a retried request remains safe after the learner advances.

The function runs with caller privileges (service role from the server adapter); it does not need `SECURITY DEFINER` because service role already has the required table privileges. Function EXECUTE is explicitly revoked from `PUBLIC`, `anon`, and `authenticated`, then granted to `service_role`.

### 5. RLS is read-only for the learner

`learning_product_events` is in `public`, so RLS is enabled. `authenticated` gets only `SELECT` and an ownership policy. `anon` gets nothing. Browser code cannot forge rows directly; it calls the authenticated Next.js route, which resolves the current user and server repository.

### 6. Instrument only confirmed client facts

- `source_play_completed`: emitted from YouTube `PlayerState.ENDED`.
- `correction_shown`: emitted by an effect only when the rendered post-attempt result is an incorrect evaluation and the attempt is known.
- `runtime_error`: emitted from bounded failure callbacks/known request failure categories; no raw error message crosses the contract.

Playback-start evidence stays where it is. The new callback does not replace `onPlay`.

### 7. Avoid unload-based abandonment claims

`beforeunload/pagehide` is unreliable and can fire for reload, bfcache or transient navigation. The five-person operator should report an incomplete started session as abandoned/incomplete at its last durable activity when the moderated run ends. This feature does not mutate `lesson_sessions.status` from a browser unload guess.

## Data model

`public.learning_product_events`

- `id uuid primary key`
- `session_id uuid not null -> lesson_sessions(id) on delete cascade`
- `owner_user_id uuid not null -> auth.users(id) on delete cascade`
- `activity_id text not null`
- `idempotency_key uuid not null`
- `event_kind text not null`
- `detail_kind text null`
- `occurred_at timestamptz not null default now()`

Checks:

- activity ID grammar;
- event kind in the closed list;
- `runtime_error` requires a bounded detail kind;
- non-error events require `detail_kind is null`;
- unique `(owner_user_id, idempotency_key)`.

Indexes:

- `(owner_user_id, occurred_at desc)`;
- `(session_id, occurred_at)`.

## Application contract

Add `RecordLearningProductEvent` with an input discriminated by `eventKind`:

- `{ eventKind: "source_play_completed" }`
- `{ eventKind: "correction_shown" }`
- `{ eventKind: "runtime_error", detailKind: ... }`

It verifies:

- owned session exists;
- blueprint/session version relationship is already resolved by the route;
- activity belongs to the blueprint;
- source completion is allowed only for an activity with bounded evidence;
- correction shown is allowed only for an activity that can have an attempt; the route/service does not store correction copy.

The database still rejects invalid ownership/activity references if application logic regresses.

## API

`POST /api/learning-lab/v2/product-events`

Request:

- `sessionId`
- `activityId`
- `idempotencyKey`
- bounded event shape

Response:

- persisted event
- `created` boolean

Route follows existing same-origin/auth/real-or-fixture-blueprint resolution patterns.

## UI integration

### YouTube player

Add:

- `onEnded?: () => void`
- `onRuntimeError?: (kind: "youtube_api_load" | "youtube_player") => void`

The component calls `onEnded` only after the IFrame API reports `PlayerState.ENDED` and calls error callback using bounded category, never error text/code.

### LearningSessionLab

Add a small `sendProductEvent()` helper. Measurement failure is surfaced as a technical error only where losing the fact would make the moderated record incomplete; it does not mark a learning activity as failed/succeeded.

Correction events use a per-attempt ref/set so React rerenders do not create multiple events. Idempotency also protects network retry.

## Verification

### Unit/application

- product-event contract rejects arbitrary fields and free-form error detail;
- service rejects foreign activity and source-completion on activity without evidence;
- idempotent fake persistence;
- product event does not alter session progress/capability state.

### Adapter

- Supabase repository maps RPC result through Zod;
- exact bounded values only.

### Database / pgTAP

- table has RLS;
- authenticated user reads own rows only;
- authenticated/anon cannot insert directly;
- function is not executable by public/anon/authenticated;
- service-role function rejects foreign ownership/activity;
- idempotency returns existing event;
- invalid event/detail shape fails.

### Browser

Golden Chromium journey proves:

- source completion is sent only after player-ended test hook/event;
- incorrect retrieval causes one `correction_shown` event despite rerender;
- raw answer/correction text remains absent from local persistence and new event rows.

### Full gate

Run existing exact-head CI requirements before merge. No production Supabase/Gemini/Supadata call is authorized.

## Rollback

The table/function and route are additive. If client measurement causes a regression, stop emitting new events; existing learning persistence remains intact. Dropping historical measurement is not part of rollback because rows are bounded and harmless; removal, if needed, should be a separate additive migration.
