# Vidlish Epics & Stories — Corrected Final Validation

**Date:** 2026-08-03  
**Trigger:** Correct Course after Implementation Readiness `NEEDS WORK`  
**Status:** PASS — backlog correction complete; re-run Implementation Readiness pending

## 1. Backlog shape

| Epic | Stories | Outcome |
| --- | ---: | --- |
| Epic 1 | 3 | Authenticated beta learner confirms playable video + CEFR draft |
| Epic 2 | 13 | Durable job produces eligible canonical English source or accurate recoverable/terminal outcome |
| Epic 3 | 7 | Grounded quality-gated immutable lesson + readable viewer |
| Epic 4 | 3 | Evidence seeking, activities, retrieval/transfer and completion |
| Epic 5 | 3 | Reopen, filter, recover and delete |
| **Total** | **29** | Complete MVP implementation path |

## 2. Functional Requirement Coverage

**PASS — 46/46 functional requirements covered.**

| Requirement group | Count | Canonical stories |
| --- | ---: | --- |
| FR1–FR5 | 5 | 1.1–1.3 |
| FR6–FR13 | 8 | 2.2, 2.4–2.9, 2.11, 2.13 |
| FR14–FR30 | 17 | 3.1–3.5 |
| FR31–FR33 | 3 | 2.1, 2.4–2.13 |
| FR34 | 1 | 3.7 |
| FR35–FR38 | 4 | 4.1–4.3 |
| FR39 | 1 | 3.6 |
| FR40–FR41 | 2 | 3.7, 5.1–5.3 |
| FR-LANG-1–FR-LANG-5 | 5 | 2.3 plus invariant enforcement across 2.2–2.8 and 3.1–3.5 |

Story-level coverage source of truth: `../epics.md`.

## 3. Non-Functional Requirement Coverage

**PASS — 21/21 NFRs have explicit acceptance/test paths.**

- NFR1–NFR4: server secrets, RLS/ownership, content-log redaction and temporary-audio TTL — Stories 1.1, 2.2, 2.7–2.8, 2.11–2.12, 5.3.
- NFR5–NFR8: quota/cost, provider resilience, durable state and fail-closed behavior — Stories 2.1, 2.4–2.10, 3.1–3.6.
- NFR9: exact provenance/versioning — Stories 2.3–2.6, 3.1–3.6.
- NFR10–NFR12: metadata/saved-page performance and async generation — Stories 1.2, 2.1, 3.7, 5.1.
- NFR13–NFR14: responsive keyboard accessibility/WCAG 2.2 AA — all user-facing stories.
- NFR15–NFR18: safe telemetry, fixture-only CI, golden evaluation and environment isolation — Stories 1.1, 2.10, 2.12–2.13, 3.5.
- NFR19: backup/restore — Stories 2.13, 3.6 and deletion privacy behavior in 5.3.
- NFR20: long-source budgets/no truncation — Stories 2.9, 3.1, 3.3.
- NFR21: legal/public-launch release boundary — Stories 2.5, 2.11, 2.13, 5.3.

## 4. Correct Course issue closure

| Readiness finding | Resolution | Status |
| --- | --- | --- |
| Story 1.3 dead/contradictory CTA | `Xác nhận lựa chọn` → `Sẵn sàng tạo bài học`; Story 2.1 owns `Tạo bài học` | Closed |
| Invalid Story 2.3 `AD-22` | Replaced with Architecture Language Amendment + valid AD/AR/ID references | Closed |
| Stale Story 3.5/3.6 and 5.2/5.3 references | Clarifications updated to 3.6 persistence, 3.7 viewer, 5.3 deletion | Closed |
| Auth/beta implementation unresolved | Six-digit Supabase email OTP + `beta_access` selected | Closed |
| Metadata/language/transcript/STT adapters unresolved | YouTube Data API, Supadata native/generate, franc-min 6.2.0, Gemini 3.6 Flash, Cloud STT Chirp 3 selected | Closed |
| Story 2.4 oversized | Split into 2.4 hosted, 2.5 unofficial policy, 2.6 Gemini URL | Closed |
| Story 2.9 operational bundle oversized | Split into 2.11 cleanup/retention, 2.12 telemetry/env, 2.13 backup/regression | Closed |
| Story 3.6 oversized | Split into 3.6 atomic persistence and 3.7 viewer | Closed |
| Inconsistent AC IDs | Every canonical story now uses stable `AC1...` headings | Closed |
| CI baseline implicit | Story 1.1 requires frozen install, typecheck, lint, tests and build | Closed |
| Account-menu ownership unclear | 1.1 sign-out, 2.10 quota, 2.11 retention; feedback deferred | Closed |
| Stale UX tagline | Canonical “Any English video. Your English lesson.” | Closed |
| Missing UX language phase/state | `Kiểm tra tiếng Anh` and explicit unsupported-language state added | Closed |

## 5. Story quality

**PASS.**

- Every epic delivers a learner/product-team outcome rather than a technical milestone.
- No story requires a future story to be demonstrable.
- Optional Story 2.5 does not block Epic 2 or private-beta acceptance.
- Tables/entities are introduced when first needed.
- Provider-specific code remains behind ports.
- Every story includes happy path, error/security behavior and test criteria.
- Story 3.6 and 3.7 now separate persistence from UI failure domains.
- Operational work in Epic 2 is split into reviewable units.

## 6. Dependency validation

```text
Epic 1 confirmed validated draft
→ Epic 2 durable job + eligible canonical English source / accurate alternative outcome
→ Epic 3 immutable grounded lesson + readable viewer
   ├─→ Epic 4 interactive learning + completion
   └─→ Epic 5 reopen + filter + recover + delete
```

**PASS.** No circular or forward epic dependency exists. Epic 5 completion metadata remains nullable until Epic 4 is implemented.

## 7. Language eligibility invariant

**PASS.** Every transcript source follows:

```text
acquire/create original-language transcript
→ deterministic normalization
→ checking_language
→ pass only eligible English segment IDs
→ Lesson Engine
```

- Caption absence is not unsupported language.
- Mixed-language source uses only independently sufficient English portions.
- Non-English/translated/generated English cannot support source quotes, grammar, listening or scored evidence.
- Ineligible source stops before Lesson Engine with `VIDEO_LANGUAGE_UNSUPPORTED` + `choose_another_video`.

## 8. External decision readiness

**PASS with explicit configuration prerequisites.**

- Initial adapters are selected and versioned in `IMPLEMENTATION-DECISIONS.md`.
- Local/CI use fixtures and need no provider credentials.
- Staging completion of provider stories requires the selected credential/config.
- Unofficial extractor is default-off and explicitly optional.

## 9. Final backlog verdict

# PASS

The corrected epic/story set is internally consistent, fully traceable and sized for sequential implementation. This validation does not replace Implementation Readiness; the next action is to re-run that workflow using the corrected artifacts.