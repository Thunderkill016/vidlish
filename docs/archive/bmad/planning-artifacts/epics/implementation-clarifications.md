# Epic Implementation Clarifications

**Status:** final, normative companion  
**Updated:** 2026-08-03  
**Purpose:** Remove source drift and define incremental boundaries for the corrected 29-story backlog.

## 1. Authority and references

- PRD and PRD Language Eligibility Amendment own product behavior.
- Architecture Spine and Architecture Language Eligibility Amendment own invariants.
- `architecture/.../IMPLEMENTATION-DECISIONS.md` selects the initial auth/provider adapters.
- `AD-*` refers to Architecture Decisions in `ARCHITECTURE-SPINE.md`.
- `AR*` refers to derived architecture requirements in `architecture-ux-requirements.md`.
- Story references in this file use the corrected 29-story numbering.

## 2. Story 1.1 scaffold

Story 1.1 creates the greenfield application from the architecture seed, not from a third-party starter repository:

- Next.js 16 App Router, Node 24, pnpm, TypeScript, Tailwind 4, shadcn/ui and Zod 4;
- typed environment configuration;
- Supabase SSR email-OTP authentication;
- private-beta `beta_access` boundary;
- protected shell;
- pull-request CI floor.

It does not create Job, Transcript, Lesson or Activity tables.

## 3. Story 1.3 standalone completion

Before Story 2.1 exists:

- primary action is `Xác nhận lựa chọn`;
- success state is `Sẵn sàng tạo bài học`;
- validated draft contains video ID, CEFR and metadata version;
- no `Tạo bài học` job command, provider call or cost exists.

Story 2.1 replaces/promotes this confirmed state into the persisted `Tạo bài học` command. No dead CTA is allowed.

## 4. Transcript registry grows incrementally

At each story, the registry contains only implemented, configured and policy-enabled strategies:

1. Story 2.2 — Supadata native caption.
2. Story 2.4 — Supadata generated transcript.
3. Story 2.5 — unofficial extractor only after explicit approval; optional and default-off.
4. Story 2.6 — Gemini public-URL transcription.
5. Story 2.7 — pasted/uploaded transcript.
6. Story 2.8 — consent-based tab-audio + Cloud STT.

An earlier story has a safe `not_applicable`, recoverable wait or actionable terminal state and never depends on future code.

## 5. Language eligibility authority

Every transcript source follows:

```text
candidate validation
→ deterministic normalization
→ canonical transcript persistence
→ checking_language
→ analyzing_video only when eligible
```

A canonical transcript is not globally labeled English before the gate. Only allowed `englishSegmentIds` may support source quotes, listening, grammar, language mining or scored evidence.

`VIDEO_LANGUAGE_UNSUPPORTED` is emitted only after a reliable transcript + eligibility conclusion, with `choose_another_video` and no translation substitute.

## 6. Provider/shared resilience ownership

- Adapter stories own their local boundary, schema mapping, timeout and basic bounded retry.
- Story 2.10 owns cross-provider quota, cost gates, retry classification, circuit breaker, dedup and cancellation.
- Story 2.12 owns telemetry schema/redaction and environment isolation.
- Story 2.13 owns backup/restore rehearsal and Epic 2 cross-source regression.

## 7. User-input and capture visibility

- Story 2.7 renders only paste and `.srt`/`.vtt` input.
- Story 2.8 adds capability-detected `Ghi âm tab video` and complete consent/capture/STT behavior.
- No enabled tab-audio control is rendered before Story 2.8.

## 8. Publish/viewer boundary

- Story 3.6 creates lesson identity, immutable versions, validated children, current published pointer and atomic publish transaction.
- Story 3.7 renders the readable responsive Lesson Viewer from saved data.
- Before Story 4.1, timestamps/source refs are readable but non-interactive; no dead seek control.
- Story 4.1 alone adds player synchronization.

## 9. Entity timing

Entities appear only when first required:

- Story 1.1 — auth/private-beta support.
- Story 2.1 — videos and lesson jobs plus durable dispatch/audit persistence.
- Story 2.2 — transcripts, segments and acquisition attempts.
- Story 2.3 — language-analysis/eligibility results.
- Stories 2.7–2.8 — temporary user-input/capture artifacts as needed.
- Stories 3.1–3.5 — immutable generation/validation/evaluation artifacts as needed.
- Story 3.6 — lesson identity/version/published pointer.
- Stories 4.2–4.3 — attempts, reflection and completion records.
- Story 5.3 — deletion/tombstone state when required by the deletion workflow.

No epic performs an up-front complete schema build.

## 10. Account menu ownership

- Story 1.1: sign out only.
- Story 2.10: compact quota summary once quota data exists.
- Story 2.11: privacy/retention explanation once cleanup policy exists.
- Beta feedback link is deferred until an explicit requirement owns it.

## 11. CI and external credentials

- Normal CI uses fixtures/fakes and never live providers.
- Story 1.1 CI runs frozen install, typecheck, lint, tests and build.
- A provider-dependent staging acceptance criterion is blocked until its selected credential/config exists.
- Missing credentials disable the adapter; they do not cause the domain to select a different vendor silently.

## 12. Epic dependencies

```text
Epic 1: authenticated + validated confirmed draft
→ Epic 2: durable job + eligible canonical English source or accurate recoverable/terminal outcome
→ Epic 3: immutable grounded published lesson + readable viewer
   ├─→ Epic 4: interactive learning and completion
   └─→ Epic 5: reopen, filter, recover and delete
```

Epic 5 does not hard-depend on Epic 4; completion fields remain nullable until Epic 4 exists.