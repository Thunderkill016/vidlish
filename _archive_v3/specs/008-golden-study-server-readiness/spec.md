# Feature 008: Golden study server readiness

## Problem

`pnpm study:golden` currently prints that the Golden Session study harness is ready before the Vidlish child process is even spawned. It also does not prove that the fixed study port is free before resetting the local database.

If a stale process already owns the study port, the operator can open the printed URLs and reach the wrong server/cycle while the newly spawned child is failing to bind. That can invalidate the one-real-participant-per-clean-cycle protocol.

The usability runbook describes the intended order as starting Vidlish before printing the operator URLs.

## Acceptance boundary

- Before any local database reset for a participant cycle, the harness must prove the configured study host/port can be bound. If the port is occupied, fail closed before resetting the study database or spawning Vidlish.
- After the clean local database and fixture are prepared, spawn the Vidlish child with the existing isolated runtime environment.
- Do not print the "ready" operator instructions until the newly spawned child responds over HTTP at the configured local origin.
- If the child exits before readiness, fail the harness without printing ready instructions.
- If readiness is not reached within a bounded timeout, terminate the child and fail rather than leaving an ambiguous study cycle.
- Existing signal forwarding and child exit status behavior must remain bounded.

## Invariants / non-goals

- Do not change the Golden Session lesson, measurement schema, participant schema, Gate 5 thresholds, evaluator, participant count, or reset semantics.
- Do not expose local Supabase credentials.
- Do not enable production Supabase or paid providers.
- Do not automatically create participant records or claim Gate 5 evidence.
- Keep the study server bound to loopback as today.

## Proof

Automated tests must cover at least:

1. an already-occupied port is refused;
2. a free port passes the preflight;
3. readiness resolves only after an HTTP server actually responds;
4. child exit before readiness fails closed;
5. timeout fails closed.

Full repository CI on the exact PR head remains the merge gate.