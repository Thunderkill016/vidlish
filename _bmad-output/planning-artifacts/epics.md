---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md
  - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md
  - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md
  - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/SPEC.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/lesson-schema.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/selection-algorithm.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/cefr-rubrics.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/activity-catalog.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/generation-quality-pipeline.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/language-eligibility.md
  - project-context.md
companions:
  - epics/requirements-inventory.md
  - epics/architecture-ux-requirements.md
  - epics/implementation-clarifications.md
  - epics/final-validation.md
  - epics/epic-1.md
  - epics/epic-2.md
  - epics/epic-2-part-2.md
  - epics/epic-2-part-3.md
  - epics/epic-2-part-4.md
  - epics/epic-3.md
  - epics/epic-4.md
  - epics/epic-5.md
readinessReport: implementation-readiness-report-2026-08-03-rerun.md
status: final-implementation-ready
storyCount: 29
---

# Vidlish — Epic Breakdown

## Canonical status

The corrected backlog is final and has passed the post–Correct Course Implementation Readiness assessment.

- **5 epics**
- **29 stories**
- **46/46 Functional Requirements covered**
- **21/21 Non-Functional Requirements assigned through story acceptance criteria**
- Stable AC IDs across all canonical stories
- Initial auth/provider decisions locked in Architecture `IMPLEMENTATION-DECISIONS.md`
- Implementation Readiness: **READY**
- Next workflow: Sprint Planning

## Authorities

- Requirements: [`epics/requirements-inventory.md`](epics/requirements-inventory.md)
- Architecture + UX requirements: [`epics/architecture-ux-requirements.md`](epics/architecture-ux-requirements.md)
- Incremental boundaries: [`epics/implementation-clarifications.md`](epics/implementation-clarifications.md)
- Implementation decisions: [`architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md`](architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md)
- Backlog validation: [`epics/final-validation.md`](epics/final-validation.md)
- Readiness PASS: [`implementation-readiness-report-2026-08-03-rerun.md`](implementation-readiness-report-2026-08-03-rerun.md)

Reference convention:

- `AD-*` — Architecture Spine decisions.
- `AR*` — derived architecture requirements.
- `ID-*` — initial implementation decisions.
- Language amendments override stale language assumptions in the original spine.

## Epic List and FR Coverage

### Epic 1 — Truy cập Vidlish và chọn video phù hợp

**Outcome:** private-beta learner signs in, validates a playable YouTube video, chooses CEFR and confirms a validated draft.  
**FRs:** FR1–FR5.

### Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án

**Outcome:** learner has a durable job and either an eligible canonical English source, a recoverable action state, or an accurate terminal/cancelled state.  
**FRs:** FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5.

### Epic 3 — Nhận một bài học tiếng Anh có căn cứ

**Outcome:** eligible source becomes an immutable, grounded, quality-gated published lesson with a readable viewer.  
**FRs:** FR14–FR30, FR34, FR39.

### Epic 4 — Học và luyện tập trực tiếp với video

**Outcome:** learner seeks evidence, completes activities, retrieves/transfers learning and records completion.  
**FRs:** FR35–FR38.

### Epic 5 — Quay lại và quản lý thư viện bài học

**Outcome:** learner reopens saved work, filters/retries recoverable jobs and deletes data according to policy.  
**FRs:** FR40–FR41.

## Functional Requirement Coverage Map

| Requirement | Canonical implementation path |
| --- | --- |
| FR1–FR2 | Story 1.1 |
| FR3, FR5 | Story 1.2 |
| FR4 | Story 1.3 |
| FR6 | Story 2.9 |
| FR7 | Story 2.2 |
| FR8 | Story 2.4 |
| FR9 | Story 2.5 — optional/policy-gated |
| FR10 | Stories 2.4, 2.6, 2.8 |
| FR11 | Story 2.7 |
| FR12 | Stories 2.2, 2.4, 2.6–2.9 |
| FR13 | Stories 2.2, 2.4, 2.6–2.8, 2.11 |
| FR14–FR15 | Story 3.1 |
| FR16–FR18, FR20 | Story 3.2 |
| FR19, FR21–FR24 | Stories 3.1–3.3 |
| FR25–FR29 | Story 3.4 |
| FR30 | Story 3.5 |
| FR31–FR33 | Stories 2.1, 2.4–2.13 |
| FR34 | Story 3.7 |
| FR35 | Story 4.1 |
| FR36 | Story 4.2 |
| FR37–FR38 | Story 4.3 |
| FR39 | Story 3.6 |
| FR40 | Stories 3.7, 5.1 |
| FR41 | Stories 5.1–5.3 |
| FR-LANG-1–FR-LANG-4 | Story 2.3 |
| FR-LANG-5 | Stories 2.2–2.8 and 3.1–3.5 |

No Functional Requirement is missing. Optional Story 2.5 is not required for private-beta acceptance.

## Story Coverage Matrix

| Story | User outcome | Primary requirements |
| --- | --- | --- |
| 1.1 | OTP private-beta access, protected shell and CI floor | FR1, FR2 |
| 1.2 | Parse URL and confirm metadata/playability | FR3, FR5 |
| 1.3 | Choose CEFR and confirm standalone ready draft | FR4 |
| 2.1 | Durable/idempotent generation job and progress page | FR31–FR33 |
| 2.2 | Native caption fast path and canonical transcript | FR7, FR12, FR13 |
| 2.3 | Original-English language eligibility gate | FR-LANG-1–FR-LANG-5 |
| 2.4 | Hosted generated-transcript fallback | FR8, FR10, FR12, FR13 |
| 2.5 | Optional unofficial extractor behind approval | FR9, FR12, FR13 |
| 2.6 | Gemini public-URL transcription | FR10, FR12, FR13 |
| 2.7 | Paste transcript and upload SRT/VTT | FR11–FR13 |
| 2.8 | Consent-based tab audio + Cloud STT | FR10, FR12, FR13 |
| 2.9 | Long-video budgets and deterministic chunking | FR6, FR12, FR31, FR32 |
| 2.10 | Quota, retry, circuit breaker, dedup and cancellation | FR31–FR33 |
| 2.11 | Temporary cleanup and transcript retention | FR13, FR31–FR33 |
| 2.12 | Safe telemetry and environment isolation | FR31–FR33 |
| 2.13 | Backup/restore rehearsal and Epic 2 regression | FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 |
| 3.1 | Eligible-source preprocessing and grounded analysis | FR14, FR15, FR22–FR24 |
| 3.2 | Candidate mining, CEFR moments and outcomes | FR16–FR18, FR20–FR22 |
| 3.3 | Multi-stage grounded Core Lesson composition | FR19, FR21–FR24 |
| 3.4 | Structural/grounding/exercise gates and repair | FR25–FR29 |
| 3.5 | Golden regression and promotion gate | FR30 |
| 3.6 | Atomic publish and immutable lesson persistence | FR39 |
| 3.7 | Readable responsive Lesson Viewer from saved data | FR34, FR40 |
| 4.1 | Timestamp evidence controls player | FR35 |
| 4.2 | Interactive activities and feedback | FR36 |
| 4.3 | Retrieval, transfer, exit ticket and completion | FR37, FR38 |
| 5.1 | Library and reopen saved lesson/job | FR40, FR41 |
| 5.2 | Filters and recover retryable jobs | FR41 |
| 5.3 | Owner-authorized deletion and dependency cleanup | FR41 |

## Story Index

### Epic 1 — 3 stories

- [1.1 — Truy cập private beta và đăng nhập an toàn](epics/epic-1.md#story-11--truy-cập-private-beta-và-đăng-nhập-an-toàn)
- [1.2 — Dán và kiểm tra video YouTube](epics/epic-1.md#story-12--dán-và-kiểm-tra-video-youtube)
- [1.3 — Chọn trình độ và xác nhận video sẵn sàng](epics/epic-1.md#story-13--chọn-trình-độ-và-xác-nhận-video-sẵn-sàng)

### Epic 2 — 13 stories

- [2.1 — Tạo generation job bền vững](epics/epic-2.md#story-21--tạo-generation-job-bền-vững)
- [2.2 — Lấy caption gốc và tạo canonical transcript](epics/epic-2.md#story-22--lấy-caption-gốc-và-tạo-canonical-transcript)
- [2.3 — Kiểm tra video có đủ tiếng Anh gốc](epics/epic-2.md#story-23--kiểm-tra-video-có-đủ-tiếng-anh-gốc)
- [2.4 — Lấy transcript qua hosted generated-transcript provider](epics/epic-2-part-2.md#story-24--lấy-transcript-qua-hosted-generated-transcript-provider)
- [2.5 — Tích hợp unofficial extractor theo policy](epics/epic-2-part-2.md#story-25--tích-hợp-unofficial-extractor-theo-policy)
- [2.6 — Tạo transcript từ public YouTube URL bằng Gemini](epics/epic-2-part-2.md#story-26--tạo-transcript-từ-public-youtube-url-bằng-gemini)
- [2.7 — Nhận transcript hoặc subtitle từ người dùng](epics/epic-2-part-3.md#story-27--nhận-transcript-hoặc-subtitle-từ-người-dùng)
- [2.8 — Tạo transcript từ audio của tab](epics/epic-2-part-3.md#story-28--tạo-transcript-từ-audio-của-tab)
- [2.9 — Xử lý video dài bằng budget và chunking](epics/epic-2-part-3.md#story-29--xử-lý-video-dài-bằng-budget-và-chunking)
- [2.10 — Kiểm soát quota, retry, circuit breaker và cancellation](epics/epic-2-part-3.md#story-210--kiểm-soát-quota-retry-circuit-breaker-và-cancellation)
- [2.11 — Dọn artifact tạm và áp dụng transcript retention](epics/epic-2-part-4.md#story-211--dọn-artifact-tạm-và-áp-dụng-transcript-retention)
- [2.12 — Ghi telemetry an toàn và cô lập environment](epics/epic-2-part-4.md#story-212--ghi-telemetry-an-toàn-và-cô-lập-environment)
- [2.13 — Diễn tập backup/restore và khóa Epic 2 regression](epics/epic-2-part-4.md#story-213--diễn-tập-backuprestore-và-khóa-epic-2-regression)

### Epic 3 — 7 stories

- [3.1 — Tiền xử lý transcript và phân tích video](epics/epic-3.md#story-31--tiền-xử-lý-transcript-và-phân-tích-video)
- [3.2 — Chọn ngôn ngữ đáng học và mục tiêu bài học](epics/epic-3.md#story-32--chọn-ngôn-ngữ-đáng-học-và-mục-tiêu-bài-học)
- [3.3 — Soạn Core Lesson qua pipeline nhiều bước](epics/epic-3.md#story-33--soạn-core-lesson-qua-pipeline-nhiều-bước)
- [3.4 — Kiểm định, chấm chất lượng và sửa có giới hạn](epics/epic-3.md#story-34--kiểm-định-chấm-chất-lượng-và-sửa-có-giới-hạn)
- [3.5 — Chạy golden regression và khóa release chất lượng](epics/epic-3.md#story-35--chạy-golden-regression-và-khóa-release-chất-lượng)
- [3.6 — Publish nguyên tử và lưu immutable lesson version](epics/epic-3.md#story-36--publish-nguyên-tử-và-lưu-immutable-lesson-version)
- [3.7 — Hiển thị Lesson Viewer dễ đọc và responsive](epics/epic-3.md#story-37--hiển-thị-lesson-viewer-dễ-đọc-và-responsive)

### Epic 4 — 3 stories

- [4.1 — Điều hướng video bằng timestamp evidence](epics/epic-4.md#story-41--điều-hướng-video-bằng-timestamp-evidence)
- [4.2 — Làm hoạt động và nhận feedback](epics/epic-4.md#story-42--làm-hoạt-động-và-nhận-feedback)
- [4.3 — Retrieval, transfer và hoàn thành lesson](epics/epic-4.md#story-43--retrieval-transfer-và-hoàn-thành-lesson)

### Epic 5 — 3 stories

- [5.1 — Xem thư viện và mở lại lesson đã lưu](epics/epic-5.md#story-51--xem-thư-viện-và-mở-lại-lesson-đã-lưu)
- [5.2 — Lọc thư viện và khôi phục job lỗi](epics/epic-5.md#story-52--lọc-thư-viện-và-khôi-phục-job-lỗi)
- [5.3 — Xóa lesson và dữ liệu phụ thuộc theo policy](epics/epic-5.md#story-53--xóa-lesson-và-dữ-liệu-phụ-thuộc-theo-policy)

## Dependency Flow

```text
Epic 1: authenticated + playable video + CEFR + confirmed validated draft
→ Epic 2: durable job + eligible canonical English source or accurate recoverable/terminal outcome
→ Epic 3: immutable grounded quality-gated lesson + readable viewer
   ├─→ Epic 4: interactive learning + completion
   └─→ Epic 5: reopen + filter + recover + delete
```

Every story consumes only outputs from earlier stories. Story 2.5 is optional and does not block later stories. Epic 5 does not hard-depend on Epic 4.