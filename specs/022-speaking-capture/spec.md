# Feature 022 — Speaking capture without false scoring

## Problem

Vidlish has no trustworthy speaking runtime evidence. Typed transfer and lexical retrieval must not be relabeled as speaking, but leaving speaking at zero forever also prevents the core loop from reaching real oral production.

## Goal

Add a real microphone production step tied to a completed lesson while preserving the evidence boundary: a recording + replay + learner confirmation is speaking self-check evidence, not objective pronunciation, intelligibility, correctness, CEFR, or mastery evidence.

## Requirements

1. The learner can open a speaking practice task derived from a `guided_transfer` activity in an owned completed lesson.
2. The browser records microphone audio, allows local replay, and requires a full replay plus explicit confirmation that audible English speech was present before saving.
3. Raw audio is request-scoped only. It must not be stored in Supabase, localStorage, capability progress, transcript fields, or sent to an AI provider.
4. Durable evidence stores only bounded receipt metadata: session/activity identity, duration, byte count, MIME type, replay confirmation, audible-speech self-check, idempotency key, timestamp.
5. The server and database both bind the receipt to an owned completed lesson session and a real `guided_transfer` activity from that immutable lesson blueprint.
6. Authenticated browser clients cannot directly insert receipts or execute the authoritative RPC.
7. Four-skill progress may project a speaking observation only as `verification=self_check`, `outcome=unscored`, `responseMode=speaking`.
8. No objective speaking success/failure is created by this feature.
9. Repeating a request with the same idempotency key does not duplicate the receipt.
10. Existing listening, reading, writing, review, and scheduler evidence semantics remain unchanged.

## Non-goals

- ASR or transcript generation.
- Pronunciation scoring.
- Intelligibility scoring.
- Word/phoneme alignment.
- Persisting learner audio.
- Changing lesson authoring schemas to add a new activity type.
- Passing Gate 5; this feature still requires real-user validation later.

## Acceptance

- Unit tests prove speaking receipts project only unscored self-check capability evidence.
- Capability progress reader owner-scopes and includes speaking receipts.
- pgTAP proves privacy columns are absent, RLS/privileges prevent browser forgery, invalid activity/session state is rejected, and retries are idempotent.
- Production build, Chromium journeys, durable Supabase Golden Session, unit tests, typecheck/lint, and aggregate CI gate all pass on the exact PR head before merge.
