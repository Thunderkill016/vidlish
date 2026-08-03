# Vidlish Epics & Stories — Final Validation

**Date:** 2026-08-03  
**Workflow:** Create Epics and Stories — Step 4  
**Status:** PASS — workflow complete

## 1. Functional Requirement Coverage

Result: **PASS — 46/46 functional requirements covered.**

Coverage source of truth is the Story Coverage Matrix in `../epics.md`.

| Requirement group | Count | Canonical stories |
| --- | ---: | --- |
| FR1–FR5 | 5 | 1.1–1.3 |
| FR6–FR13 | 8 | 2.2, 2.4–2.7, 2.9 |
| FR14–FR30 | 17 | 3.1–3.5 |
| FR31–FR33 | 3 | 2.1, 2.5–2.9 |
| FR34 | 1 | 3.6 |
| FR35–FR38 | 4 | 4.1–4.3 |
| FR39 | 1 | 3.6 |
| FR40–FR41 | 2 | 5.1–5.3 |
| FR-LANG-1–FR-LANG-5 | 5 | 2.3 plus enforcement in 2.4–2.6 |

No functional requirement is assigned only at epic level without acceptance-criteria coverage.

### Language invariant validation

PASS:

- Every transcript source goes through normalization and `checking_language`.
- Lesson Engine receives only eligible original-English segment IDs.
- Caption absence/provider exhaustion is not treated as unsupported language.
- `VIDEO_LANGUAGE_UNSUPPORTED` is emitted only after transcript-level and segment-level analysis.
- Translation, dubbing and generated-English substitution are explicitly prohibited.

The stale language snippets in the original architecture spine are normatively corrected by `architecture/.../LANGUAGE-ELIGIBILITY-AMENDMENT.md`.

## 2. Non-Functional Requirement Coverage

Result: **PASS — 21/21 NFRs have implementation and test coverage.**

| NFR area | Primary stories |
| --- | --- |
| Server-only secrets and input security | 1.1, 1.2, 2.4–2.6, 3.1–3.3 |
| Owner isolation/RLS | 1.1, 2.1–2.6, 3.6, 4.2–4.3, 5.1–5.3 |
| Transcript/audio privacy and TTL | 2.2, 2.5, 2.6, 2.9, 5.3 |
| Quotas/rate limits/concurrency | 2.1, 2.4, 2.8, 5.2 |
| Timeout/retry/circuit breaker | 1.2, 2.2, 2.4, 2.8 |
| Durable state and fail closed | 2.1–2.9, 3.1–3.6 |
| Provenance/versioning | 2.2–2.9, 3.1–3.6 |
| Metadata and saved-view performance | 1.2, 3.6, 5.1 |
| Async processing | 2.1–2.9, 3.1–3.6 |
| Accessibility/WCAG/responsive | 1.1–1.3, 2.x UI stories, 3.6, 4.x, 5.x |
| Safe telemetry/redaction | 2.1–2.9, 3.x, 4.1, 5.2–5.3 |
| CI provider isolation | Every provider-facing story; release gate 3.5 |
| Deterministic/golden evaluation | 2.2–2.9, 3.1–3.5 |
| Environment isolation | 1.1, 2.9 |
| Backup/restore | 2.9, 3.6, 5.3 |
| Long-video bounded work | 2.7, 3.1, 3.3 |
| Legal/privacy public-launch gate | 2.5, 2.9, 5.3 |

## 3. Architecture Implementation Validation

Result: **PASS with correction applied.**

### Starter/scaffold

Architecture specifies an exact stack and structural seed, not a third-party starter repository. Story 1.1 is therefore correctly the first implementation story and includes:

- Next.js 16 App Router scaffold;
- Node 24/pnpm 10/toolchain lock;
- Tailwind 4, shadcn/ui and Zod 4;
- typed configuration;
- initial module boundaries;
- Supabase SSR authentication.

No separate starter-template clone is required.

### Architecture conflict correction

Validation found the original architecture spine omitted `checking_language` and prematurely declared canonical transcript language as `en`. The final architecture amendment now overrides those snippets. Result: no unresolved language-flow conflict remains.

### Entity timing

PASS. Tables/entities are introduced only by the first story that requires them:

- 1.1: identity/private-beta support only.
- 2.1: videos, jobs and job events.
- 2.2: transcripts, segments and acquisition attempts.
- 2.3: segment-language/eligibility results.
- 3.1–3.5: generation and validation artifacts as needed.
- 3.6: lesson identity/version/published pointer.
- 4.2–4.3: attempts/reflection/completion.
- 5.3: deletion/tombstone state only if needed.

No all-tables-up-front story exists.

### Provider and workflow boundaries

PASS:

- External providers remain behind ports.
- Raw provider objects do not enter domain/application.
- Only the durable workflow advances generation stages.
- Stable events/steps and persisted result keys are covered.
- Browser cannot write canonical transcript/lesson state directly.

## 4. Story Quality Validation

Result: **PASS — 24 canonical stories.**

Validation initially found three stories too broad:

- former 2.7 combined long-video, quotas, cancellation, cleanup and operations;
- former 3.5 combined golden release gate, atomic publish and viewer;
- former 5.2 combined filters, recovery and deletion.

They were split into:

- 2.7 long-video budgets/chunking;
- 2.8 quota/retry/cancellation;
- 2.9 retention/telemetry/operations;
- 3.5 golden regression/release gate;
- 3.6 atomic publish/viewer;
- 5.2 filters/recovery;
- 5.3 deletion/dependency cleanup.

Each canonical story now has:

- a user or operational value statement;
- specific requirement references;
- testable Given/When/Then criteria;
- explicit persistence/security/error/test boundaries;
- a completion state that does not require a future story.

### Forward-dependency corrections

PASS after normative clarification:

- Story 1.3 ships a standalone confirmed-ready state; it does not expose a dead create-job action before Story 2.1.
- Story 2.5 ships paste/upload only; tab capture is not enabled until Story 2.6.
- Story 3.6 shows source timestamps as non-interactive references until Story 4.1 adds seek behavior.
- Each transcript story has a safe exhaustion/wait/terminal state before later strategies exist.

## 5. Epic Structure and File Churn

Result: **PASS.**

Every epic delivers a complete domain outcome:

1. Authenticated user with validated video and CEFR input.
2. Durable transcript acquisition with an eligible original-English source or an actionable state.
3. Grounded, validated and published Core Lesson.
4. Interactive learning and completion.
5. Reopen, filter, recover and delete.

### File churn assessment

Expected shared-file overlap exists in:

- generation workflow state definitions across Epic 2 and 3;
- Lesson Viewer across Epic 3 and 4;
- owner-scoped lesson/job queries across Epic 3–5.

The split remains justified because each boundary creates a usable feedback loop and distinct module ownership:

- `transcript` and workflow acquisition;
- `lesson-engine` and publish;
- player/activity interaction;
- library/lifecycle management.

The companions reduce context size without changing canonical order.

## 6. Dependency Validation

Result: **PASS.**

### Hard epic dependencies

```text
Epic 1 → Epic 2 → Epic 3
Epic 3 → Epic 4
Epic 3 → Epic 5
```

Epic 5 does not hard-depend on Epic 4. Completion metadata is nullable until Epic 4 exists; library/reopen works from published Epic 3 lessons.

### Within-epic dependencies

- Epic 1: 1.1 → 1.2 → 1.3.
- Epic 2: 2.1 establishes job/workflow; 2.2 adds first source; 2.3 adds mandatory gate; 2.4–2.6 extend source registry; 2.7–2.9 harden outputs already available.
- Epic 3: 3.1 analysis → 3.2 selection → 3.3 draft → 3.4 validation → 3.5 regression gate → 3.6 publish/viewer.
- Epic 4: 4.1 player evidence → 4.2 activities → 4.3 retrieval/transfer/completion.
- Epic 5: 5.1 library/reopen → 5.2 filters/recovery → 5.3 deletion.

No canonical story requires code or data created only by a later story.

## 7. Final Verdict

**PASS — workflow complete.**

The epic/story set is complete, requirement-traceable, architecture-aligned and ready to enter the separate Implementation Readiness workflow.

Remaining public-launch items such as final legal text, production numeric quotas and exact commercial transcript/STT providers are explicit configuration/release gates, not blockers for starting Story 1.1 with local/fixture adapters.