---
status: approved-and-applied
project: Vidlish
date: 2026-08-03
changeScope: moderate
mode: batch
trigger: implementation-readiness-report-2026-08-03.md
approvedByUser: true
approvalInput: A
---

# Sprint Change Proposal — Khóa planning trước implementation

## 1. Issue summary

Implementation Readiness đầu tiên xác nhận 46/46 Functional Requirements được bao phủ nhưng trả `NEEDS WORK` vì 13 điểm precision:

- UX còn tagline/state flow trước language amendment;
- Story 1.3 có CTA mâu thuẫn;
- Story 2.3 tham chiếu architecture ID không tồn tại;
- clarification dùng story number cũ;
- auth/private-beta và initial adapters chưa được chọn;
- Stories 2.4, 2.9 và 3.6 quá lớn;
- AC IDs, CI baseline và account-menu ownership chưa đồng nhất.

Không có code hoặc sprint plan cần rollback. PRD/MVP scope không thay đổi.

## 2. Path selected

**Direct Adjustment within the existing PRD and five-epic structure.**

- Effort: Medium.
- Product-scope impact: None.
- Risk after correction: Low–Medium, concentrated in external providers.
- Backlog shape changed from 24 to 29 smaller stories.

Rollback and MVP reduction were rejected because implementation had not started and the original product remained feasible.

## 3. Approved changes

### UX

- Canonical tagline: **Any English video. Your English lesson.**
- Mandatory learner phase: **Kiểm tra tiếng Anh** after transcript normalization.
- Explicit `VIDEO_LANGUAGE_UNSUPPORTED` state with sole primary action **Chọn video khác**.
- No translation lesson mode or generated-English source substitute.
- Account-menu ownership:
  - Story 1.1: sign out;
  - Story 2.10: quota summary;
  - Story 2.11: privacy/retention explanation;
  - beta feedback link deferred.

### Initial implementation decisions

- Supabase six-digit email OTP; no magic-link fork in MVP.
- Postgres `beta_access` allowlist controlled by migration/service-role-only admin path.
- YouTube Data API v3 `videos.list` for metadata/playability.
- Supadata `mode=native` for native caption fast path.
- Supadata `mode=generate` for hosted generated transcript.
- `franc-min@6.2.0` behind `LanguageAnalysisPort`, using coherent windows and fail-closed ambiguity handling.
- `gemini-3.6-flash` for feature-gated public YouTube URL transcription.
- Google Cloud Speech-to-Text V2 `chirp_3` for tab-audio STT.
- Unofficial extractor default-off and optional pending explicit approval/package choice.
- Local/CI fixture-only; external credentials required only for relevant staging acceptance.

### Story corrections

- Story 1.1: OTP, beta allowlist and PR CI floor.
- Story 1.2: initial YouTube Data API adapter.
- Story 1.3: `Xác nhận lựa chọn` → `Sẵn sàng tạo bài học`; Story 2.1 owns job-creating `Tạo bài học`.
- Story 2.2: Supadata native-caption initial adapter.
- Story 2.3: valid architecture/amendment refs and Franc adapter.
- Every canonical story now uses stable `AC1...` headings.

### Story splits

Old oversized Story 2.4 became:

1. 2.4 — Hosted generated-transcript provider.
2. 2.5 — Optional unofficial extractor policy.
3. 2.6 — Gemini public-URL transcription.

Remaining Epic 2 stories were renumbered and the old operational bundle was split:

- 2.7 — User-provided transcript/subtitle.
- 2.8 — Tab audio + Cloud STT.
- 2.9 — Long-video budgets/chunking.
- 2.10 — Quota/retry/circuit/dedup/cancellation.
- 2.11 — Cleanup/retention.
- 2.12 — Telemetry/environment isolation.
- 2.13 — Backup/restore and Epic 2 regression.

Old Story 3.6 became:

- 3.6 — Atomic immutable lesson publish.
- 3.7 — Readable responsive Lesson Viewer.

## 4. Final backlog

```text
Epic 1: 3 stories
Epic 2: 13 stories
Epic 3: 7 stories
Epic 4: 3 stories
Epic 5: 3 stories
Total: 29 stories
```

Dependency graph remains:

```text
Epic 1 → Epic 2 → Epic 3
                    ├─→ Epic 4
                    └─→ Epic 5
```

## 5. Artifacts modified

- `architecture/.../IMPLEMENTATION-DECISIONS.md` — created.
- `ux-designs/.../DESIGN.md` — corrected promise/design boundary.
- `ux-designs/.../EXPERIENCE.md` — corrected phases, unsupported state and ownership.
- `epics/epic-1.md` — corrected auth/metadata/readiness stories.
- `epics/epic-2.md`, `epic-2-part-2.md`, `epic-2-part-3.md`, `epic-2-part-4.md` — corrected 13-story Epic 2.
- `epics/epic-3.md` — corrected 7-story Epic 3.
- `epics/epic-4.md`, `epics/epic-5.md` — normalized AC IDs/dependencies.
- `epics/implementation-clarifications.md` — corrected numbering/entity timing.
- `epics.md` — canonical 29-story index/coverage.
- `epics/final-validation.md` — corrected backlog PASS validation.
- `project-context.md` — corrected stage/next workflow.

PRD was intentionally unchanged.

## 6. Checklist completion

- [x] Trigger and evidence documented.
- [x] Epic impact assessed; no epic added/removed/reordered.
- [x] PRD/Architecture/UX/backlog impact assessed.
- [x] Direct Adjustment selected.
- [x] Detailed edits approved by user.
- [x] Proposal applied to planning artifacts.
- [N/A] `sprint-status.yaml` update — Sprint Planning has not run.
- [x] Handoff defined.

## 7. Handoff

**Scope:** Moderate backlog/artifact reorganization.

Next sequence:

```text
Re-run Implementation Readiness
→ PASS
→ Sprint Planning
→ Create/validate Story 1.1 implementation artifact
→ Dev Story 1.1
```

No product code starts before PASS + Sprint Planning.

## 8. Success criteria

- 46/46 FR and 21/21 NFR remain covered.
- No contradictory CTA, invalid reference or stale story number remains.
- Initial adapters/auth decisions are explicit and versioned.
- Every story is a reviewable delivery unit.
- UX enforces original-English eligibility.
- Re-run Implementation Readiness returns READY/PASS.

## 9. Correct Course completion

The approved change proposal has been applied. The next required workflow is `bmad-check-implementation-readiness` using the corrected artifact set.