# Vidlish Architecture Readiness Review

**Date:** 2026-08-03  
**Artifact:** `ARCHITECTURE-SPINE.md`  
**Verdict:** **PASS — architecture is ready for Epics/Stories. No product code has been written.**

## 1. Architecture fit

The selected paradigm is appropriate for the MVP:

- one deployable Next.js codebase keeps operational scope low;
- hexagonal ports prevent Gemini, transcript, STT, Supabase and YouTube SDKs from owning domain contracts;
- Inngest durable steps fit long-running transcript and multi-stage lesson generation;
- Postgres remains the product state authority;
- independently deployable microservices are deferred until measured constraints require them.

## 2. Current-technology verification

All version-bearing seed decisions were checked against current official documentation on 2026-08-03:

- Next.js 16 is stable and App Router remains recommended.
- Node.js 24 is LTS; Node.js 26 is Current.
- TypeScript 6.0 is stable; TypeScript 7.0 is newly released and intentionally deferred for conservative ecosystem compatibility.
- Zod 4 is stable.
- Inngest TypeScript SDK v4 documents durable Next.js workflows, step checkpoints, retries and testing support.
- Gemini `gemini-3.6-flash` is stable/GA, supports text/audio/video, structured output and URL context.
- Gemini official audio documentation includes transcription with timestamps and YouTube URL input, validating its place as one transcript fallback rather than only a lesson-generation model.
- Supabase official documentation requires RLS on exposed tables and supports cookie-based Next.js authentication.
- Vercel Functions remain bounded by execution duration, validating the decision not to model generation as one synchronous request.

Exact package patches are deliberately deferred to the scaffold lockfile.

## 3. Adversarial divergence tests

### Test A — Two transcript adapters

**Attack:** one adapter returns seconds and raw captions; another returns milliseconds and confidence-bearing STT segments.

**Closed by:** AD-5, AD-6, AD-7 and AD-14. Both adapters must return the canonical transcript DTO with millisecond offsets, stable segment IDs and validated source metadata.

### Test B — Two routes start the same generation

**Attack:** Create Lesson submit and page reload each emit a workflow event, producing two Gemini bills and two lessons.

**Closed by:** AD-4 and AD-15. Stable event IDs, one workflow concurrency slot per job, active-job idempotency and stage result keys prevent a second execution.

### Test C — Lesson page sees partially published content

**Attack:** a story inserts lesson JSON before quality/provenance or job completion is saved.

**Closed by:** AD-10 and AD-12. Only passed output reaches publishing, and version insert/current pointer/job completion are exposed atomically.

### Test D — Workflow service-role access leaks ownership

**Attack:** a server adapter bypasses RLS and fetches a transcript by guessed ID without validating its owner.

**Closed by:** AD-13. Service-role use remains server-only and repositories still require owner-scoped commands/checks; RLS is defense in depth for exposed access.

### Test E — Different modules enforce different video limits

**Attack:** URL validation rejects a video by duration while the workflow accepts it by token budget.

**Closed by:** AD-9 and AD-21. Duration alone is not a terminal rule; `GenerationPolicy` owns quota/cost decisions and the workflow owns bounded chunking.

### Test F — Gemini reviewer approves its own invalid lesson

**Attack:** the LLM returns a high review score despite nonexistent evidence segments.

**Closed by:** AD-10 and AD-17. Deterministic code owns segment existence, quote hydration, answer contracts and hard publish authorization.

## 4. Source reconciliation

### PRD

**Pass.** The architecture supports the full core loop, private ownership, transcript fallback, no hard caption dependency, no hard duration cap, Core Lesson generation, save/reopen/delete and provider/account deferral.

### UX

**Pass.** Persisted jobs support reload and Library status. `awaiting_user_input` supports tab capture and transcript input. Polling remains the MVP progress transport. Evidence timestamps use canonical segment timing.

### Lesson Engine SPEC

**Pass.** Every CAP-1 through CAP-12 maps to a module and governing AD. Provider independence, stable segment IDs, immutable lesson versions, quality gates, provenance and golden evaluation are architecture invariants.

### Transcript research

**Pass.** The strategy registry can host official captions, hosted providers, unofficial extraction, Gemini URL/audio transcription, browser audio + STT, uploads and pasted input without changing product-domain code.

## 5. Security, privacy and operations

**Pass for private beta.** The spine covers:

- server-only secrets;
- RLS and owner checks;
- temporary private audio with immediate deletion and TTL sweeper;
- prompt-injection isolation;
- redacted structured logs;
- local/staging/production isolation;
- co-location of compute and database where possible;
- backups/restore requirement before public launch;
- legal review retained as a public-release gate.

## 6. Remaining non-blocking decisions

These do not block Epics/Stories or initial implementation:

1. Exact paid transcript provider.
2. Exact cloud STT provider.
3. Numeric user quota and monthly cost ceilings.
4. Supabase/Vercel production region during account setup.
5. API keys, billing accounts and public-launch legal copy.

Provider contracts, security rules and integration boundaries are already fixed, so these decisions can be supplied without redesigning the product.

## 7. Gate result

- Architecture spine: **final**.
- Product code written: **no**.
- Ready for `bmad-create-epics-and-stories`: **yes**.
- Ready for implementation directly: **no** — epics/stories and implementation-readiness review must run first.
