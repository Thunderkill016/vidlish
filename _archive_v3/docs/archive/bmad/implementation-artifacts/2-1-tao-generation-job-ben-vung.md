# Story 2.1: Tạo generation job bền vững

Status: done

## Story

As a người học đã xác nhận video và CEFR,
I want tạo một generation job có URL và trạng thái được lưu,
so that reload, retry hoặc double-submit không làm mất tiến trình hay tạo chi phí trùng.

## Business Value

Story này nối validated draft của Epic 1 vào durable generation pipeline. Kết quả là owner-scoped job được persist trước mọi transcript/AI call, có lifecycle canonical, idempotency key, generation page và dispatch boundary. Story kết thúc ở `acquiring_transcript`; chưa lấy transcript và chưa phát sinh provider cost.

## Requirements Traceability

- Functional: FR31–FR33.
- Non-functional: NFR2, NFR5, NFR7, NFR12, NFR15, NFR16.
- Architecture: AR2–AR9, AR21–AR25, AR27, AR28, AR30; AD-2–AD-5, AD-13–AD-16, AD-21.
- UX: UX-DR9, UX-DR27–UX-DR32.

## Acceptance Criteria

### AC1 — Validated create command

Authenticated beta user submits strict `{ videoId, cefrLevel, metadataVersion }`; server revalidates access, CEFR and current video playability, persists before dispatch, returns opaque `jobId` and redirects to `/jobs/{jobId}`.

### AC2 — Durable owner-scoped entities

Migration creates/reuses `videos`, creates `lesson_jobs` plus dispatch audit fields, enables RLS and prevents cross-owner reads/writes. Transcript, Lesson and Activity entities are not created.

### AC3 — Canonical lifecycle

Database, domain and UI use one versioned lifecycle including `checking_language` between `normalizing_transcript` and `analyzing_video`.

### AC4 — Idempotency and concurrency

Active key is owner + video + CEFR + pipeline version. Duplicate or concurrent create returns the same active job. Database constraint/transaction is the final authority.

### AC5 — GenerationPolicy

Policy checks beta access, active concurrency, rate/quota config before insert. Denials use `JOB_CONCURRENCY_LIMIT`, `ACCOUNT_QUOTA_EXCEEDED` or `RATE_LIMITED`; no job/event is created.

### AC6 — Durable dispatch

After commit, dispatcher emits `lesson.generation-requested.v1` with minimal data and stable event ID derived from job + pipeline version. Failed dispatch leaves the job queued and retryable. Inngest function uses idempotency and concurrency key `event.data.jobId`, limit one.

### AC7 — Workflow ownership

Only `GenerateLessonWorkflow` advances internal lifecycle. Story 2.1 performs durable `queued → validating_video → acquiring_transcript` without calling transcript providers.

### AC8 — Generation page

Owner can open/reload `/jobs/{jobId}` and see persisted video, CEFR and learner-facing phase. Polling is private/no-store; guessed cross-owner IDs do not reveal existence.

### AC9 — Safe errors, telemetry and accessibility

ProductError remains Vietnamese and actionable; logs/events contain opaque IDs and safe metadata only. Stepper/loading/offline states use text, controlled `aria-live`, visible focus and 44px targets.

### AC10 — Tests

Unit tests cover lifecycle/policy/event IDs; repository/database tests cover transaction, idempotency and RLS; integration/E2E cover create → redirect → reload and no live provider calls.

## Tasks / Subtasks

- [x] Add strict job/event/read schemas and lifecycle contract.
- [x] Add generation domain, policy, repository and dispatcher ports.
- [x] Add Supabase migration, atomic create RPC, repository and pgTAP/RLS tests.
- [x] Add Inngest v4 client, typed event, durable function and App Router serve endpoint.
- [x] Add authenticated create/read routes with no-store semantics.
- [x] Replace readiness placeholder with `Tạo bài học`; add `/jobs/[jobId]` persisted progress page.
- [x] Add fake adapters and unit/integration/E2E coverage without live providers.
- [x] Run targeted checks during fixes and one full CI before merge.

## Validation Record

- Result: PASS.
- Scope ends before transcript acquisition provider execution.
- Canonical language gate remains after normalization and before Lesson Engine.
- Inngest event IDs are defense in depth; database idempotency remains authoritative because event idempotency is time-bounded.

## Completion Record

- PR: #4 — `Story 2.1: Durable generation job`.
- Squash merge: `6e4a3b60c845c036c80fc1b9a9dff89f1d27b97d`.
- Final CI: run `30848315048`; quality, Chromium journeys and Supabase migration/RLS jobs passed.
- Adversarial review fixes: atomic RPC `created` flag, dispatch-retry UI, non-masking job-read errors, concurrent fake transaction lock and complete quota/rate tests.
- Open findings: none.
