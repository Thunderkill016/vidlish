---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md
  - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md
  - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md
  - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/.memlog.md
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
  - epics/epic-1.md
  - epics/epic-2.md
  - epics/epic-2-part-2.md
  - epics/epic-2-part-3.md
  - epics/epic-3.md
  - epics/epic-4.md
  - epics/epic-5.md
status: final-validation-pending
---

# Vidlish — Epic Breakdown

## Overview

Đây là index chuẩn tắc cho epic/story breakdown của Vidlish. Requirements, clarifications và story details được shard thành companion files để implementation agents chỉ tải phần cần thiết.

## Requirements Inventory

- Functional + Non-Functional Requirements: [`epics/requirements-inventory.md`](epics/requirements-inventory.md)
- Architecture + UX Requirements: [`epics/architecture-ux-requirements.md`](epics/architecture-ux-requirements.md)
- Normative implementation clarifications: [`epics/implementation-clarifications.md`](epics/implementation-clarifications.md)

Reference convention:

- `AD-*` = canonical architecture decisions/invariants.
- `AR*` = derived implementation requirements.
- Language conflicts are resolved by the PRD, architecture and Lesson Engine language-eligibility amendments.

## FR Coverage Map

FR1: Epic 1 — Authentication, ownership và route protection.
FR2: Epic 1 — Private-beta access boundary.
FR3: Epic 1 — YouTube URL parsing và validation.
FR4: Epic 1 — CEFR selection.
FR5: Epic 1 — Metadata và playability check.
FR6: Epic 2 — Long-video budgets, deterministic chunking và no silent truncation.
FR7: Epic 2 — Manual/auto caption fast path.
FR8: Epic 2 — Hosted transcript provider fallback.
FR9: Epic 2 — Policy-gated unofficial extractor.
FR10: Epic 2 — Original-audio transcription và consent-based tab-audio/STT.
FR11: Epic 2 — Paste transcript và upload subtitle.
FR12: Epic 2 — Canonical transcript normalization.
FR13: Epic 2 — Transcript/audio persistence, privacy và retention.
FR14: Epic 3 — Deterministic preprocessing và untrusted-input treatment.
FR15: Epic 3 — Evidence-linked video analysis.
FR16: Epic 3 — Language candidate pool.
FR17: Epic 3 — Tối đa ba measurable outcomes.
FR18: Epic 3 — Teachable-moment selection.
FR19: Epic 3 — Flexible Core Lesson progression 10–20 phút.
FR20: Epic 3 — CEFR personalization.
FR21: Epic 3 — Segment grounding và generated/source distinction.
FR22: Epic 3 — Structured outputs, provenance và versioning.
FR23: Epic 3 — Multi-stage Lesson Engine.
FR24: Epic 3 — Provider-independent lesson generation.
FR25: Epic 3 — Structural validation hard gate.
FR26: Epic 3 — Grounding validation hard gate.
FR27: Epic 3 — Scored-activity validity.
FR28: Epic 3 — Final quality score tối thiểu 14/16.
FR29: Epic 3 — Targeted repair bounded và fail closed.
FR30: Epic 3 — Golden regression evaluation.
FR31: Epic 2 — Durable, idempotent generation job.
FR32: Epic 2 — Persisted user-facing generation stages.
FR33: Epic 2 — Product errors và actionable fallback states.
FR34: Epic 3 — Readable Lesson Viewer.
FR35: Epic 4 — Timestamp evidence seeks player.
FR36: Epic 4 — Scored/guided activities và feedback.
FR37: Epic 4 — Retrieval, transfer, self-check và exit ticket.
FR38: Epic 4 — Completion state.
FR39: Epic 3 — Atomic publish only after Final Quality Gate.
FR40: Epic 5 — Reopen saved lesson without regeneration.
FR41: Epic 5 — Library, filters, recovery và deletion.
FR-LANG-1: Epic 2 — Language detection before Lesson Engine.
FR-LANG-2: Epic 2 — Sufficient coherent original-English eligibility.
FR-LANG-3: Epic 2 — Mixed-language eligibility/evidence boundaries.
FR-LANG-4: Epic 2 — `VIDEO_LANGUAGE_UNSUPPORTED` + `choose_another_video`.
FR-LANG-5: Epic 2 — No translation/dubbing/generated-source substitute.

## Epic List

### Epic 1: Truy cập Vidlish và chọn video phù hợp

Người học trong private beta có thể đăng nhập, dán URL YouTube, chọn CEFR và xác nhận video tồn tại, công khai và có thể phát trước khi tạo bài.

**FRs covered:** FR1–FR5.

### Epic 2: Lấy transcript tiếng Anh bằng nhiều phương án

Người dùng có thể tạo durable job; hệ thống thử caption/provider/STT/user-input fallbacks, chuẩn hóa transcript, kiểm tra ngôn ngữ và chỉ tiếp tục khi có đủ tiếng Anh gốc.

**FRs covered:** FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5.

### Epic 3: Nhận một bài học tiếng Anh có căn cứ

Từ transcript eligible, người dùng nhận Core Lesson cá nhân hóa theo CEFR, multi-stage, grounded, quality-gated và atomically published.

**FRs covered:** FR14–FR30, FR34, FR39.

### Epic 4: Học và luyện tập trực tiếp với video

Người dùng bấm timestamp, làm hoạt động, nhận feedback, luyện retrieval/transfer và lưu completion.

**FRs covered:** FR35–FR38.

### Epic 5: Quay lại và quản lý thư viện bài học

Người dùng mở lại, lọc, phục hồi và xóa lesson/job cùng dữ liệu phụ thuộc theo policy.

**FRs covered:** FR40–FR41.

## Story Coverage Matrix

| Story | User outcome | Requirements |
| --- | --- | --- |
| 1.1 | Truy cập private beta và đăng nhập an toàn | FR1, FR2 |
| 1.2 | Dán và kiểm tra video YouTube | FR3, FR5 |
| 1.3 | Chọn CEFR và xác nhận input sẵn sàng | FR4 |
| 2.1 | Durable/idempotent generation job | FR31–FR33 |
| 2.2 | Caption fast path và canonical transcript | FR7, FR12, FR13 |
| 2.3 | Original-English language eligibility gate | FR-LANG-1–FR-LANG-5 |
| 2.4 | Hosted/unofficial/Gemini transcript strategies | FR8–FR10, FR12, FR13 |
| 2.5 | Paste transcript và upload SRT/VTT | FR11–FR13 |
| 2.6 | Consent-based tab audio capture + STT | FR10, FR12, FR13 |
| 2.7 | Long-video budgets và deterministic chunking | FR6, FR12, FR31, FR32 |
| 2.8 | Quota, retry, dedup và cancellation | FR31–FR33 |
| 2.9 | Retention cleanup, telemetry và operational resilience | FR13, FR31–FR33 |
| 3.1 | Preprocess và evidence-linked video analysis | FR14, FR15, FR22–FR24 |
| 3.2 | Candidate mining, CEFR, moments và outcomes | FR16–FR18, FR20–FR22 |
| 3.3 | Multi-stage grounded lesson composition | FR19, FR21–FR24 |
| 3.4 | Structural/grounding/exercise gates và repair | FR25–FR29 |
| 3.5 | Golden regression và release quality gate | FR30 |
| 3.6 | Atomic publish và readable Lesson Viewer | FR34, FR39 |
| 4.1 | Timestamp evidence điều khiển player | FR35 |
| 4.2 | Interactive activities và feedback | FR36 |
| 4.3 | Retrieval, transfer, exit ticket và completion | FR37, FR38 |
| 5.1 | Library và reopen saved lesson/job | FR40, FR41 |
| 5.2 | Filters và recover retryable jobs | FR41 |
| 5.3 | Owner-authorized deletion và dependency cleanup | FR41 |

## Story Index

### Epic 1 — complete

- [Story 1.1 — Truy cập private beta và đăng nhập an toàn](epics/epic-1.md#story-11--truy-cập-private-beta-và-đăng-nhập-an-toàn)
- [Story 1.2 — Dán và kiểm tra video YouTube](epics/epic-1.md#story-12--dán-và-kiểm-tra-video-youtube)
- [Story 1.3 — Chọn trình độ và xác nhận video sẵn sàng](epics/epic-1.md#story-13--chọn-trình-độ-và-xác-nhận-video-sẵn-sàng)

### Epic 2 — complete

- [Story 2.1 — Tạo generation job bền vững](epics/epic-2.md#story-21--tạo-generation-job-bền-vững)
- [Story 2.2 — Lấy caption và tạo canonical transcript](epics/epic-2.md#story-22--lấy-caption-và-tạo-canonical-transcript)
- [Story 2.3 — Kiểm tra video có đủ tiếng Anh gốc](epics/epic-2.md#story-23--kiểm-tra-video-có-đủ-tiếng-anh-gốc)
- [Story 2.4 — Thử các transcript provider phía server](epics/epic-2-part-2.md#story-24--thử-các-transcript-provider-phía-server)
- [Story 2.5 — Nhận transcript hoặc subtitle từ người dùng](epics/epic-2-part-3.md#story-25--nhận-transcript-hoặc-subtitle-từ-người-dùng)
- [Story 2.6 — Tạo transcript từ audio của tab](epics/epic-2-part-3.md#story-26--tạo-transcript-từ-audio-của-tab)
- [Story 2.7 — Xử lý video dài bằng budget và chunking](epics/epic-2-part-3.md#story-27--xử-lý-video-dài-bằng-budget-và-chunking)
- [Story 2.8 — Kiểm soát quota, retry và cancellation](epics/epic-2-part-3.md#story-28--kiểm-soát-quota-retry-và-cancellation)
- [Story 2.9 — Dọn dữ liệu tạm và vận hành transcript pipeline](epics/epic-2-part-3.md#story-29--dọn-dữ-liệu-tạm-và-vận-hành-transcript-pipeline)

### Epic 3 — complete

- [Story 3.1 — Tiền xử lý transcript và phân tích video](epics/epic-3.md#story-31--tiền-xử-lý-transcript-và-phân-tích-video)
- [Story 3.2 — Chọn ngôn ngữ đáng học và mục tiêu bài học](epics/epic-3.md#story-32--chọn-ngôn-ngữ-đáng-học-và-mục-tiêu-bài-học)
- [Story 3.3 — Soạn Core Lesson qua pipeline nhiều bước](epics/epic-3.md#story-33--soạn-core-lesson-qua-pipeline-nhiều-bước)
- [Story 3.4 — Kiểm định, chấm chất lượng và sửa có giới hạn](epics/epic-3.md#story-34--kiểm-định-chấm-chất-lượng-và-sửa-có-giới-hạn)
- [Story 3.5 — Chạy golden regression và khóa release chất lượng](epics/epic-3.md#story-35--chạy-golden-regression-và-khóa-release-chất-lượng)
- [Story 3.6 — Publish nguyên tử và hiển thị Lesson Viewer](epics/epic-3.md#story-36--publish-nguyên-tử-và-hiển-thị-lesson-viewer)

### Epic 4 — complete

- [Story 4.1 — Điều hướng video bằng timestamp evidence](epics/epic-4.md#story-41--điều-hướng-video-bằng-timestamp-evidence)
- [Story 4.2 — Làm hoạt động và nhận feedback](epics/epic-4.md#story-42--làm-hoạt-động-và-nhận-feedback)
- [Story 4.3 — Retrieval, transfer và hoàn thành lesson](epics/epic-4.md#story-43--retrieval-transfer-và-hoàn-thành-lesson)

### Epic 5 — complete

- [Story 5.1 — Xem thư viện và mở lại lesson đã lưu](epics/epic-5.md#story-51--xem-thư-viện-và-mở-lại-lesson-đã-lưu)
- [Story 5.2 — Lọc thư viện và khôi phục job lỗi](epics/epic-5.md#story-52--lọc-thư-viện-và-khôi-phục-job-lỗi)
- [Story 5.3 — Xóa lesson và dữ liệu phụ thuộc theo policy](epics/epic-5.md#story-53--xóa-lesson-và-dữ-liệu-phụ-thuộc-theo-policy)

## Dependency Flow

```text
Epic 1: authenticated + validated video/CEFR input
→ Epic 2: durable job + eligible canonical English source
→ Epic 3: grounded quality-gated published Core Lesson
→ Epic 4: interactive learning + completion
→ Epic 5: reopen, manage, recover and delete
```

Every canonical story has a safe standalone completion state and consumes only outputs from earlier stories. Incremental visibility and entity timing are defined in `implementation-clarifications.md`.