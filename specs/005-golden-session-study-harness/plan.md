# Implementation Plan: Golden Session local study harness

## Technical context

The current Gate 5 evaluator consumes `LearningMeasurementSummary`, and the
measurement route intentionally reads durable facts from Supabase. Ordinary
Playwright/dev runs use an in-memory learning repository, while the existing
`durable_learning` CI job already proves the Golden Session against a clean local
Supabase plus `supabase/fixtures/learning_model_v2_durable.sql`.

The fixture lesson version is owner-bound by database foreign keys. Rather than
loosening those ownership constraints or manufacturing five fixture-owned lesson
versions, this feature will reuse the durable fixture and isolate participants by
resetting the local database and Golden browser state between real participant
runs.

## Architecture decisions

### 1. Harness script owns environment safety

Add a Node script under `scripts/` and a package command. The script will:

1. start local Supabase if necessary;
2. reset the local database without ordinary seed data;
3. obtain local Supabase connection/API credentials from `supabase status`;
4. load only the existing durable Golden fixture;
5. construct a child environment from an allowlisted/sanitized base;
6. remove external provider credentials and override all runtime selectors needed
   for the Golden fixture/local Supabase path;
7. launch `next dev` through pnpm;
8. print the learner, capture and evaluator URLs plus reset instructions.

Environment construction/parsing will live in importable pure helpers so unit
tests can prove that production credentials are not inherited.

The script will not run pgTAP on every moderated participant cycle; database
schema/RLS correctness remains a CI gate. It will fail if required local CLI or
fixture setup fails.

### 2. Reuse durable fixture rather than create study-only database semantics

The harness uses:

- `learning-preview@example.com`;
- the existing fake deterministic identity;
- lesson version `77777777-7777-4777-8777-777777777777`;
- `supabase/fixtures/learning_model_v2_durable.sql`.

Each participant starts from a fresh local DB reset. This preserves the existing
structural owner constraints and avoids adding a weaker multi-owner exception for
a usability tool.

### 3. Capture page reads browser state, server still owns measurement

Add `/learning-lab/v2/usability/capture`.

The server page authenticates normally and passes only the Golden blueprint id to
a client component. The client component:

- reads the exact existing storage key for the Golden blueprint;
- extracts a UUID session id from version-4 stored state;
- fetches the current owner-scoped measurement endpoint;
- validates it using `learningMeasurementSummarySchema`;
- exposes no session-id text field or arbitrary URL override.

No new measurement endpoint or server write is needed.

### 4. Moderator observation remains explicit human input

The capture UI uses select/radio controls for the existing bounded moderator
schema. Every field starts unset. The page may display durable facts for context,
but it must not translate them into moderator answers.

When all fields are chosen, the component builds and validates one
`GoldenSessionUsabilityParticipant`. The JSON is rendered in-browser for copying.
No API call persists it.

### 5. Browser reset is narrowly scoped

After capture, a button removes only:

`vidlish:learning-lab:v4:<golden-blueprint-id>`

It does not clear all localStorage, auth cookies, or unrelated learner data. The
runbook requires restarting the harness before the next participant so both
browser and server learning state are fresh.

## Verification plan

### Unit

- local Supabase status parser accepts quoted shell-env output and rejects missing
  required values;
- child runtime environment replaces local Supabase credentials and strips
  Gemini/Supadata/YouTube credentials;
- runtime selectors are fixed to fake auth, local Supabase persistence and
  fixture external providers.

### Chromium / durable Supabase

Extend the existing isolated durable job with a focused capture journey:

1. sign in as the durable fixture owner;
2. start the Golden Session to create a server-owned session and browser state;
3. open capture page and prove it resolves that session automatically;
4. prove the returned measurement is schema-valid and the moderator controls do
   not have positive defaults;
5. create a bounded participant object and prove the rendered JSON is valid;
6. sign in as a second allowlisted fake identity and request the first session's
   measurement directly; expect rejection;
7. prove the browser reset removes only the Golden lab storage key.

The second identity does not need its own lesson version because it is used only
to prove measurement ownership, not to run a lesson.

### Full gate

After focused checks, require the repository PR CI: typecheck/lint, unit tests,
production build, Supabase migration/RLS tests, Chromium product journeys,
durable Supabase journey and final CI gate.

## Security/privacy review

Before merge, review specifically for:

- accidental propagation of production Supabase/provider keys;
- session id being accepted from moderator-controlled input;
- cross-owner measurement leakage through service-role reads;
- free-form moderator fields/raw learner content in generated JSON;
- auto-filled positive observations;
- broad localStorage deletion;
- any claim that the technical harness itself passes Gate 5.
