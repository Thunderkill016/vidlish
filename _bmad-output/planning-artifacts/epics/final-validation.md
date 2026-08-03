# Vidlish Epics & Stories — Final Validation

**Date:** 2026-08-03  
**Trigger:** Correct Course after the first Implementation Readiness assessment  
**Status:** PASS — corrected backlog and Implementation Readiness complete

## Final result

- Epics: **5**
- Stories: **29**
- Functional Requirements: **46/46 covered**
- Non-Functional Requirements: **21/21 assigned to explicit acceptance/test paths**
- Implementation Readiness rerun: **READY**
- Blocking critical/major issues: **0**
- Next workflow: **Sprint Planning**

Readiness report:

`../implementation-readiness-report-2026-08-03-rerun.md`

## Coverage summary

| Requirement group | Canonical stories |
| --- | --- |
| FR1–FR5 | 1.1–1.3 |
| FR6–FR13 | 2.2, 2.4, 2.6–2.9, 2.11, 2.13 |
| FR14–FR30 | 3.1–3.5 |
| FR31–FR33 | 2.1, 2.4–2.13 |
| FR34 | 3.7 |
| FR35–FR38 | 4.1–4.3 |
| FR39 | 3.6 |
| FR40–FR41 | 3.7, 5.1–5.3 |
| FR-LANG-1–FR-LANG-5 | 2.3 plus enforcement across acquisition and Lesson Engine stories |

Story-level source of truth: `../epics.md`.

## Correct Course closure

| Finding | Resolution |
| --- | --- |
| Story 1.3 contradictory CTA | `Xác nhận lựa chọn` produces `Sẵn sàng tạo bài học`; Story 2.1 owns job creation |
| Invalid architecture reference | Removed and replaced with valid amendment/AD/AR/ID authorities |
| Stale story numbering/entity timing | Corrected to 3.6 persistence, 3.7 viewer and 5.3 deletion |
| Auth and beta access unresolved | Six-digit Supabase email OTP plus server-managed `beta_access` |
| Initial adapters unresolved | YouTube Data API, Supadata native/generate, Franc, Gemini 3.6 Flash and Cloud STT Chirp 3 selected |
| Oversized provider story | Split into Stories 2.4–2.6 |
| Oversized operational bundle | Split into Stories 2.11–2.13 |
| Oversized publish/viewer story | Split into Stories 3.6–3.7 |
| AC formatting inconsistent | Every canonical story now uses stable `AC1...` headings |
| CI baseline implicit | Story 1.1 requires frozen install, typecheck, lint, tests and build |
| Account-menu ownership unclear | Assigned to 1.1, 2.10 and 2.11; feedback deferred |
| UX tagline and language state stale | Canonical English-video tagline, `Kiểm tra tiếng Anh` and unsupported-language state applied |

## Dependency validation

```text
Epic 1 confirmed validated draft
→ Epic 2 durable job + eligible canonical English source / accurate alternative outcome
→ Epic 3 immutable grounded lesson + readable viewer
   ├─→ Epic 4 interactive learning + completion
   └─→ Epic 5 reopen + filter + recover + delete
```

- No circular or forward epic dependency.
- Every story has a demonstrable standalone completion state.
- Optional Story 2.5 does not block private-beta acceptance.
- Entity creation occurs only when first required.
- Epic 5 does not hard-depend on Epic 4.

## Language eligibility validation

Every transcript source follows:

```text
acquire/create original-language transcript
→ deterministic normalization
→ checking_language
→ pass only eligible English segment IDs
→ Lesson Engine
```

- Caption absence is not unsupported language.
- Mixed-language videos use only independently sufficient English portions.
- Non-English, translated or generated English cannot support source evidence.
- Ineligible sources stop before Lesson Engine with `VIDEO_LANGUAGE_UNSUPPORTED` and `choose_another_video`.

## External adapter readiness

- Initial adapters are explicit and versioned in Architecture `IMPLEMENTATION-DECISIONS.md`.
- Local/CI use fixtures and require no provider credentials.
- Relevant staging stories require their selected credentials/configuration.
- Missing credentials disable an adapter; they do not trigger an undocumented vendor change.
- Unofficial extraction is default-off and optional.

# PASS

The canonical planning set is ready for Sprint Planning. Product code remains blocked until Sprint Planning and the normal Create Story → Validate Story → Dev Story cycle.