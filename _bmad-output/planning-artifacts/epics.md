---
stepsCompleted: [1, 2]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md
  - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md
  - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md
  - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md
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
  - epics/epic-1.md
  - epics/epic-2.md
status: draft
---

# Vidlish — Epic Breakdown

## Overview

Tài liệu này là index chính cho epic/story breakdown của Vidlish. Requirement inventory và story details được shard thành companion files để downstream agents có thể đọc theo nhu cầu mà không làm một file đơn khối quá lớn.

## Requirements Inventory

- Functional + Non-Functional Requirements: `epics/requirements-inventory.md`
- Architecture + UX Requirements: `epics/architecture-ux-requirements.md`

## FR Coverage Map

FR1: Epic 1 — Authentication, ownership và route protection.

FR2: Epic 1 — Private-beta access boundary.

FR3: Epic 1 — YouTube URL parsing và validation.

FR4: Epic 1 — CEFR selection.

FR5: Epic 1 — Metadata và playability check.

FR6: Epic 2 — Long-video budget/chunking trong transcript job.

FR7: Epic 2 — Manual/auto caption fast path.

FR8: Epic 2 — Hosted transcript provider fallback.

FR9: Epic 2 — Policy-gated unofficial extractor.

FR10: Epic 2 — Tab-audio/STT fallback.

FR11: Epic 2 — Paste/upload fallback.

FR12: Epic 2 — Canonical transcript normalization.

FR13: Epic 2 — Transcript/audio persistence và retention.

FR14: Epic 3 — Deterministic transcript preprocessing.

FR15: Epic 3 — Video analysis.

FR16: Epic 3 — Language candidate mining.

FR17: Epic 3 — Learning outcome planning.

FR18: Epic 3 — Teachable-moment selection.

FR19: Epic 3 — Flexible Core Lesson progression.

FR20: Epic 3 — CEFR personalization.

FR21: Epic 3 — Segment grounding và generated/source distinction.

FR22: Epic 3 — Structured output và provenance versioning.

FR23: Epic 3 — Multi-stage Lesson Engine.

FR24: Epic 3 — Provider-independent lesson generation.

FR25: Epic 3 — Structural validation.

FR26: Epic 3 — Grounding validation.

FR27: Epic 3 — Exercise answerability validation.

FR28: Epic 3 — Quality score gate.

FR29: Epic 3 — Targeted repair và fail-closed behavior.

FR30: Epic 3 — Golden regression evaluation.

FR31: Epic 2 — Durable, idempotent generation job.

FR32: Epic 2 — Persisted user-facing generation stages.

FR33: Epic 2 — Product errors và actionable fallback states.

FR34: Epic 3 — Readable Lesson Viewer.

FR35: Epic 4 — Timestamp-to-player interaction.

FR36: Epic 4 — Scored and guided learning activities.

FR37: Epic 4 — Retrieval, transfer và exit ticket.

FR38: Epic 4 — Completion state.

FR39: Epic 3 — Atomic publish after quality gate.

FR40: Epic 5 — Reopen saved lesson without regeneration.

FR41: Epic 5 — Library listing, filtering, recovery và deletion.

FR-LANG-1: Epic 2 — Transcript/segment language detection.

FR-LANG-2: Epic 2 — Sufficient-original-English eligibility gate.

FR-LANG-3: Epic 2 — Mixed-language eligibility behavior.

FR-LANG-4: Epic 2 — `VIDEO_LANGUAGE_UNSUPPORTED` terminal state.

FR-LANG-5: Epic 2 — Ban translation/dubbing/generated-source substitution.

## Epic List

### Epic 1: Truy cập Vidlish và chọn video phù hợp

Người học trong private beta có thể đăng nhập, dán URL YouTube, chọn CEFR và xác nhận video tồn tại, công khai và có thể phát trước khi tạo bài.

**FRs covered:** FR1, FR2, FR3, FR4, FR5.

### Epic 2: Lấy transcript tiếng Anh bằng nhiều phương án

Người dùng có thể tạo một job bền vững; hệ thống thử caption/provider/STT và user-input fallbacks, chuẩn hóa transcript, kiểm tra ngôn ngữ và chỉ tiếp tục khi video có đủ tiếng Anh gốc.

**FRs covered:** FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5.

### Epic 3: Nhận một bài học tiếng Anh có căn cứ

Từ transcript đủ điều kiện, người dùng nhận được Core Lesson cá nhân hóa theo CEFR, được tạo qua pipeline nhiều bước, kiểm định grounding/exercise validity và publish nguyên tử thành một lesson có thể đọc.

**FRs covered:** FR14–FR30, FR34, FR39.

### Epic 4: Học và luyện tập trực tiếp với video

Người dùng có thể tương tác với video và lesson, bấm timestamp, làm hoạt động, xem feedback, luyện retrieval/transfer và đánh dấu hoàn thành.

**FRs covered:** FR35, FR36, FR37, FR38.

### Epic 5: Quay lại và quản lý thư viện bài học

Người dùng có thể xem lesson/job theo trạng thái, mở lại không gọi AI, khôi phục job lỗi và xóa lesson cùng dữ liệu phụ thuộc theo retention policy.

**FRs covered:** FR40, FR41.

## Story Index

### Epic 1 — complete

- [Story 1.1 — Truy cập private beta và đăng nhập an toàn](epics/epic-1.md#story-11--truy-cập-private-beta-và-đăng-nhập-an-toàn) — approved.
- [Story 1.2 — Dán và kiểm tra video YouTube](epics/epic-1.md#story-12--dán-và-kiểm-tra-video-youtube) — approved.
- [Story 1.3 — Chọn trình độ và xác nhận video sẵn sàng](epics/epic-1.md#story-13--chọn-trình-độ-và-xác-nhận-video-sẵn-sàng) — approved.

### Epic 2

- [Story 2.1 — Tạo generation job bền vững](epics/epic-2.md#story-21--tạo-generation-job-bền-vững) — approved.
- Story 2.2 — Lấy caption và tạo canonical transcript — drafting.
- Story 2.3 — Kiểm tra video có đủ tiếng Anh gốc — pending.
- Story 2.4 — Thử các transcript provider phía server — pending.
- Story 2.5 — Nhận transcript hoặc subtitle từ người dùng — pending.
- Story 2.6 — Tạo transcript từ audio của tab — pending.
- Story 2.7 — Xử lý video dài và hoàn thiện độ tin cậy — pending.
