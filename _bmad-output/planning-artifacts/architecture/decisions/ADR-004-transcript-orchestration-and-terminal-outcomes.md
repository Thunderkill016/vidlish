---
id: ADR-004
title: Transcript strategy orchestration and terminal outcomes
status: proposed
date: 2026-08-05
supersedes: none
relates_to:
  - ../architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md
  - ../architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md (ID-4, ID-5, ID-12)
  - ../../repo-analysis-2026-08-05.md (sections 5, 6, 13)
  - PR #7 (story/2-4-hosted-generated-transcript, unmerged)
---

# ADR-004 — Transcript strategy orchestration and terminal outcomes

## Status

**Proposed.** Needs a decision before the next transcript story starts. Decision D0 below records
something already built in PR #7 and is marked separately.

## Context

### The pipeline cannot end

No TypeScript path writes `status = 'failed'`. This is true on `main` and remains true on PR #7.

On `main`, a video with no usable captions produces `NO_USABLE_CAPTIONS`, the workflow records an
attempt and returns, and the job stays in `acquiring_transcript` forever
(`src/adapters/inngest/generate-lesson-workflow.ts:66-94`).

PR #7 makes this more visible without fixing it. When the hosted path is exhausted it writes:

```ts
// acquire-hosted-generated-transcript.ts:105-129
updateStatus(job.id, "acquiring_transcript", "automatic_transcript_unavailable")
```

The stage says the transcript is unavailable while the status stays non-terminal. The consequences
are mechanical:

- `job-progress.tsx:41` derives `terminal` from `phase`, and `phase` derives from `status`. Status is
  `acquiring_transcript`, so the page polls every 3 seconds indefinitely (`:89-98`).
- `activeGenerationJobStatuses` includes `acquiring_transcript`, so the job holds an active-quota
  slot forever. With `GENERATION_MAX_ACTIVE_JOBS = 2`, two such videos lock a private-beta account
  out permanently. There is no cancel endpoint.
- `generationSafeErrorCodeSchema` holds only `VIDEO_LANGUAGE_UNSUPPORTED`
  (`src/shared/contracts/generation.ts:29-31`). There is no product error for transcript exhaustion.

### The registry is a container, not an orchestrator

PR #7 adds `TranscriptStrategyRegistry` in `src/modules/transcript/ports/transcript-strategy.ts`. It
exposes `list()` and `find()` and sorts registrations by `order`. It does not track which strategies
a job has already attempted and has no concept of exhaustion. The workflow still chains strategies
by hand:

```ts
// generate-lesson-workflow.ts:74-77, 103
let useGenerated = nativeOutcome.kind === "not_applicable" || (...);
if (useGenerated && acquireGenerated) { ... }
```

Stories 2.6, 2.7 and 2.8 each add a strategy. On the current shape each one edits this workflow
again, and each edit is a chance to get the exhaustion condition wrong.

### The language gate already depends on an orchestrator that does not exist

`persist_language_eligibility` returns a job to `acquiring_transcript` on `insufficient_evidence`
(`supabase/migrations/20260804031500_create_language_eligibility.sql:308-316`), by design, so that a
different transcript source can be tried. PR #7 wires exactly one such retry
(`generate-lesson-workflow.ts:99`). When that also yields weak evidence there is nothing left to try
and nothing to say so.

## Decision

### D0 — Strategy identity is an open enum *(already implemented in PR #7)*

`transcriptStrategyIdSchema` is a Zod enum, strategies carry a `costBand`, and
`PollableTranscriptStrategy` extends the base port for async providers. Migration
`20260804121000_extend_hosted_transcript_strategies.sql` widens the matching database checks.

Recorded here so it is not re-litigated. **Note the gap:** `transcriptProviderSchema` is still
`z.literal("supadata")`, and the new `transcript_provider_jobs` table adds
`check (provider = 'supadata')`. Provider is not yet open. See ADR-005 D4.

### D1 — The registry becomes an application service

Move orchestration out of the workflow into
`src/modules/transcript/application/transcript-strategy-orchestrator.ts`:

```ts
type NextStrategy =
  | { kind: "next"; strategy: TranscriptStrategy }
  | { kind: "exhausted"; attempted: TranscriptStrategyId[] };

interface TranscriptStrategyOrchestrator {
  next(job: GenerationJob): Promise<NextStrategy>;
}
```

Attempted strategies are derived from `transcript_acquisition_attempts`, which is already persisted
per job and already deduplicated by `attempt_key`. The orchestrator skips strategies that are
disabled by configuration or refused by policy, and never returns a strategy that already produced a
terminal result for that job.

The durable workflow keeps ownership of step boundaries, retries and polling. It must contain no
branching on a specific strategy ID.

### D2 — Exhaustion is terminal and has its own product error

Add `TRANSCRIPT_UNAVAILABLE` to `generationSafeErrorCodeSchema` and a matching `ProductError`
factory with `retryable: false`. The action is `provide_transcript` once Story 2.7 exists and
`choose_another_video` until then; both are already in the canonical action union (ID-12).

The transition happens through a `security definer` RPC, consistent with every other lifecycle
write:

```sql
mark_transcript_exhausted(p_job_id uuid, p_owner_user_id uuid, p_reason text)
-- status -> 'failed', safe_error_code -> 'TRANSCRIPT_UNAVAILABLE', idempotent
```

### D3 — Weak language evidence never becomes a language error

When the gate returns `insufficient_evidence`, the workflow consults the orchestrator. If a strategy
remains, the job continues as today. If none remains, the job terminates with
`TRANSCRIPT_UNAVAILABLE`.

`VIDEO_LANGUAGE_UNSUPPORTED` stays reserved for a confirmed `ineligible` verdict. This restates the
existing rule in `LANGUAGE-ELIGIBILITY-AMENDMENT.md` ("Caption absence, provider exhaustion and
low-quality acquisition are not themselves proof that the source language is unsupported") and makes
it reachable in code.

### D4 — `status` is the only source of truth for terminality

`currentStage` is a learner-facing label. It must never be the only signal that a job has failed. A
stage name that describes a failure while `status` remains non-terminal is a defect, and CI asserts
against it.

### D5 — Every job reaches a terminal state within a bounded time

A watchdog moves any job that has been non-terminal and unchanged for longer than a configured
threshold to `failed`. The threshold is a named constant with a comment recording where the value
came from, per the repository rule against unexplained magic numbers.

Initial proposal: **15 minutes** without an `updated_at` change. Rationale: the longest legitimate
quiet period today is hosted-generate polling, bounded at
`SUPADATA_GENERATED_MAX_POLLS × SUPADATA_GENERATED_POLL_INTERVAL_MS` = 30 × 2 s = 60 s, so 15 minutes
leaves an order of magnitude of headroom for Lesson Engine stages added later. Revisit when Epic 3
lands.

### D6 — Terminal jobs release quota

`failed` is already excluded from `activeGenerationJobStatuses`, so this follows from D2. It is
called out because it is the user-visible reason D2 matters, and it gets an explicit test.

### D7 — Attempt records name the strategy that actually ran

`AcquireNativeCaption.recordFailure` hard-codes `provider: "supadata"` even when the fixture strategy
ran (`acquire-native-caption.ts:71`). Provenance is taken from the strategy instance instead.

## Consequences

**Positive**

- Every job reaches a terminal state, so the progress page can stop polling and quota is released.
- Stories 2.6, 2.7 and 2.8 register a strategy instead of editing the workflow.
- The `insufficient_evidence` path stops being a dead end.
- Exhaustion is distinguishable from an unsupported source language in telemetry and in support.

**Negative**

- One more RPC, one more migration and one more application service.
- PR #7 has to rebase and widen its exhaustion condition from "native failed" to "orchestrator
  exhausted".
- The watchdog is a second writer of terminal state, so it must be idempotent against the workflow.

**Sequencing.** Land this off `main` first, then rebase #7. On `main` there is one strategy, so
"exhausted" means "native failed" — small and independently testable. Merging #7 first would put a
metered provider call in front of a pipeline that still cannot end.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep chaining strategies with booleans in the workflow | Cost is linear in strategies and already visible: #7 touched 33 files. Each new story re-derives the exhaustion condition. |
| Terminality only from the watchdog | Every failure would wait for the timeout and arrive without a reason code. Bad UX, useless telemetry. |
| Reuse `VIDEO_LANGUAGE_UNSUPPORTED` for exhaustion | Contradicts ID-12 and the language amendment, and tells the learner something false about their video. |
| Mark terminal state with `currentStage` only | What #7 does today. `status` drives phase, terminality, polling and quota; a stage label changes none of them. |
| Put orchestration in the Inngest workflow file | Ties ordering policy to one durable-execution vendor and makes it untestable without Inngest. |

## Compliance and verification

- **pgTAP:** `acquiring_transcript` → `failed` with `TRANSCRIPT_UNAVAILABLE`; idempotent on repeat;
  cross-owner invisible; a `failed` job no longer counts toward the active quota.
- **Unit:** orchestrator returns `next` in order, returns `exhausted` when none remain, never repeats
  a terminally failed strategy, skips disabled ones. Terminal mapping for each
  `TranscriptStrategyResult` in both "strategy remains" and "none remains" cases.
- **Unit:** `insufficient_evidence` with a strategy remaining continues; with none remaining
  terminates as `TRANSCRIPT_UNAVAILABLE`.
- **CI assertion for D4:** no code path writes a failure-describing `currentStage` while leaving
  `status` non-terminal.
- **E2E:** exhaustion shows a terminal screen with one primary action and polling stops.
- **Staging:** a real caption-less video reaches `failed` in under two minutes, with the attempt row
  and released quota as evidence.

## Open questions

1. Is 15 minutes the right watchdog threshold before Epic 3 exists? (D5)
2. Should the watchdog be an Inngest cron over the whole table, or `step.sleep` inside each workflow?
   Cron survives a lost workflow; in-workflow sleep is simpler. Leaning cron, undecided.
3. When Story 2.7 lands, does `TRANSCRIPT_UNAVAILABLE` switch its action to `provide_transcript`
   globally, or only when the learner has not already declined to supply one?
