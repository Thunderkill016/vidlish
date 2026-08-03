---
stepsCompleted: [1, 2, 3, 4]
status: in-progress
project: Vidlish
date: 2026-08-03
includedDocuments:
  prd:
    - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md
    - _bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md
  architecture:
    - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md
    - _bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md
  ux:
    - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md
    - _bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md
  epics:
    - _bmad-output/planning-artifacts/epics.md
    - _bmad-output/planning-artifacts/epics/requirements-inventory.md
    - _bmad-output/planning-artifacts/epics/architecture-ux-requirements.md
    - _bmad-output/planning-artifacts/epics/implementation-clarifications.md
    - _bmad-output/planning-artifacts/epics/final-validation.md
    - _bmad-output/planning-artifacts/epics/epic-1.md
    - _bmad-output/planning-artifacts/epics/epic-2.md
    - _bmad-output/planning-artifacts/epics/epic-2-part-2.md
    - _bmad-output/planning-artifacts/epics/epic-2-part-3.md
    - _bmad-output/planning-artifacts/epics/epic-3.md
    - _bmad-output/planning-artifacts/epics/epic-4.md
    - _bmad-output/planning-artifacts/epics/epic-5.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-08-03  
**Project:** Vidlish

## Step 1 — Document Discovery

### PRD documents

- `_bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md`
- `_bmad-output/planning-artifacts/prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md`

The amendment is a deliberate normative override, not a competing duplicate.

### Architecture documents

- `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md`
- `_bmad-output/planning-artifacts/architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md`

`.memlog.md` is a workflow sidecar and is excluded from readiness evidence.

### UX documents

- `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/DESIGN.md`
- `_bmad-output/planning-artifacts/ux-designs/ux-vidlish-2026-08-03/EXPERIENCE.md`

The two UX documents are complementary design and experience companions.

### Epics and stories

- Canonical index: `_bmad-output/planning-artifacts/epics.md`
- Companion files: requirement inventories, implementation clarifications, final validation, and complete Epic 1–5 story shards listed in frontmatter.

### Discovery findings

- All four required artifact groups are present.
- No unresolved whole-versus-sharded duplicate exists.
- Amendment precedence is explicit and intentional.
- Document set confirmed for readiness assessment.

## Step 2 — PRD Analysis

The final PRD and its normative language-eligibility amendment were read completely. The amendment overrides any wording that could imply every public/playable video is eligible regardless of spoken language.

### Functional Requirements

FR1: Đăng ký, đăng nhập, đăng xuất; bắt buộc đăng nhập trước generation; Job, Transcript và Lesson có owner và bị cô lập giữa người dùng.

FR2: Vận hành MVP dưới dạng private beta để kiểm chứng coverage, chất lượng, chi phí và rủi ro.

FR3: Nhận các dạng URL YouTube phổ biến, chuẩn hóa video ID và từ chối URL không hợp lệ.

FR4: Người dùng chọn CEFR A1–C1 trước khi tạo bài.

FR5: Lấy title, channel, thumbnail, duration và phân biệt video unavailable/private/restricted/unplayable.

FR6: Không dùng trần phút cố định; video dài được xử lý bằng budget, chunking, async workflow và overview/micro-lessons; không truncate âm thầm.

FR7: Ưu tiên manual caption và auto-caption, giữ source/confidence.

FR8: Dùng hosted transcript provider khi caption fast path thất bại.

FR9: Private beta có thể dùng unofficial extractor qua abstraction, timeout/retry giới hạn và feature flag.

FR10: `NO_CAPTIONS` không phải lỗi cuối; có audio-to-text fallback có consent, ưu tiên browser tab-audio capture.

FR11: Cho phép paste transcript hoặc upload subtitle; owned audio/video upload chỉ khi người dùng có quyền.

FR12: Chuẩn hóa transcript thành stable segments có timestamp, source và confidence; loại dữ liệu trống/trùng/hỏng và không bịa phần thiếu.

FR13: Lưu normalized transcript để mở lại lesson; không lưu video; audio tạm bị xóa; transcript phụ thuộc bị xóa theo retention.

FR14: Trước model call, transcript được normalize, hash, gắn segment ID/source/confidence và đánh dấu untrusted.

FR15: Phân tích genre, topic, structure, difficulty, semantic sections, listening challenges và low-confidence regions với evidence.

FR16: Tạo candidate pool ngôn ngữ có form, kind, CEFR, register, context, evidence, usefulness và transferability.

FR17: Chọn tối đa ba learning outcomes; mọi section/activity phục vụ ít nhất một outcome.

FR18: Chọn teachable moments theo teaching value; loại item không hữu ích hoặc quá chuyên ngành khi không cần thiết.

FR19: Tạo Core Lesson 10–20 phút theo activation → gist → noticing → practice → retrieval → transfer → reflection; số lượng nội dung co giãn.

FR20: Cá nhân hóa A1–C1 thực chất về support, item count, question type, explanation depth và production demand.

FR21: Source quote, claim, question, grammar evidence và rationale phải tham chiếu segment ID; generated example được phân biệt.

FR22: AI stages dùng structured output có version; lesson lưu schema/pipeline/prompt/model/transcript hash/quality versions.

FR23: Production generation bắt buộc multi-stage; cấm one-shot transcript-to-published-lesson.

FR24: Gemini chỉ là `LessonGenerationProvider`; domain schema và validators độc lập provider.

FR25: Lesson sai schema/type/enum/relationship không được publish.

FR26: Segment giả, quote không khớp hoặc claim thiếu evidence là hard failure.

FR27: Scored activity có answer key, rationale và evidence/criteria; MCQ có đúng một đáp án tốt nhất.

FR28: Chỉ publish khi qua mọi hard gate và quality score tối thiểu 14/16; grounding và exercise validity đạt tối đa.

FR29: Targeted repair theo lỗi cụ thể; tối đa một structural repair và một semantic repair rồi fail closed.

FR30: Mọi thay đổi model/prompt/schema/selector chạy regression trên ít nhất 10 video đa genre và level trước production.

FR31: Tạo persisted job ID + idempotency key trước provider call; reload/retry không làm mất trạng thái hay tạo trùng.

FR32: UI hiển thị các stage: kiểm tra video, transcript, ngôn ngữ, phân tích, chọn nội dung, tạo hoạt động, kiểm định, hoàn tất.

FR33: Lỗi map sang mã ổn định, copy tiếng Việt và action cụ thể; không lộ provider error thô.

FR34: Lesson Viewer hiển thị player, outcomes, video map, transcript timestamp, language items, activities, explanations và provenance nội bộ.

FR35: Evidence/timestamp seek player tới đoạn tương ứng.

FR36: Người dùng làm gist/comprehension/listening/retrieval, submit scored items và xem feedback.

FR37: Lesson có transfer/production prompt, self-check criteria và exit ticket; không giả chấm open speaking/writing.

FR38: Người dùng đánh dấu lesson completed/incomplete.

FR39: Lesson chỉ tự lưu sau Final Quality Gate và atomic publish.

FR40: Mở lesson đã lưu không gọi lại transcript provider hoặc Lesson Engine.

FR41: Library hiển thị metadata/status/source, mở, lọc trạng thái và xóa lesson sau xác nhận.

FR-LANG-1: Detect language ở transcript và segment level sau normalization, trước Lesson Engine.

FR-LANG-2: Chỉ tiếp tục khi có đủ English speech gốc, đáng tin cậy và liền mạch để tạo lesson grounded.

FR-LANG-3: Mixed-language video chỉ hợp lệ khi phần English tự nó đủ; non-English chỉ làm context.

FR-LANG-4: Không đủ English thì dừng trước expensive lesson calls với `VIDEO_LANGUAGE_UNSUPPORTED` và `choose_another_video`.

FR-LANG-5: Không dịch video khác ngôn ngữ, không synthesize English audio và không giả generated text thành source evidence.

**Total Functional Requirements:** 46.

### Non-Functional Requirements

NFR1: Secrets và service-role credentials chỉ ở server.

NFR2: Ownership enforcement ở application và RLS/storage policy.

NFR3: Không log full transcript, captured audio body hoặc prompt chứa full transcript.

NFR4: Temporary audio private, TTL ngắn, xóa sau transcription/failure và có sweeper.

NFR5: Có rate limit, quota, concurrency và estimated-cost gate.

NFR6: Provider adapters có timeout, bounded retry, mapping và fallback/circuit behavior.

NFR7: Generation state persisted, không phụ thuộc browser/request/worker memory.

NFR8: Fail closed khi eligibility hoặc quality chưa đạt; không publish partial lesson.

NFR9: Ghi provider/model/prompt/pipeline/schema versions để tái tạo lỗi.

NFR10: URL/metadata validation phản hồi hoặc bắt đầu phản hồi trong khoảng 2 giây ở điều kiện bình thường.

NFR11: Saved Lesson và Library hiển thị dữ liệu chính trong khoảng 3 giây ở điều kiện bình thường.

NFR12: Generation dài chạy async, có persisted status và không giữ HTTP request mở vô hạn.

NFR13: Core flows dùng được bằng bàn phím, có labels, focus và responsive behavior.

NFR14: Core web đạt WCAG 2.2 AA theo UX floor.

NFR15: Job telemetry có stage latency, strategy, source/confidence, eligibility, provider/model, token, retry/repair, quality và cost; không log secrets/content.

NFR16: CI mặc định chỉ dùng fixtures/fakes/sandboxes, không gọi live providers.

NFR17: Pipeline/model/prompt changes phải qua deterministic tests và golden evaluation.

NFR18: Local, staging và production tách data, secrets và provider environments.

NFR19: Production có managed backups và tested restore trước public launch.

NFR20: Video dài bị giới hạn bằng semantic/token/request/cost budgets, không silent truncation.

NFR21: Public launch cần Privacy Policy, Terms và legal review về transcript, retention, embeds và AI content.

**Total Non-Functional Requirements:** 21.

### Additional Requirements and Constraints

- Target user: Vietnamese self-learners at CEFR A1–C1.
- MVP surfaces: Create Lesson, Lesson Viewer and Library, plus authentication and transcript fallback flows.
- Core Lesson duration target: 10–20 minutes; content quantity adapts to teaching value and CEFR.
- Explanation language defaults to Vietnamese; source and target learning content remain English.
- Caption absence is recoverable; confirmed insufficient original English is terminal for MVP.
- Acquisition coverage success metric applies only to eligible English-language videos after the amendment.
- No translation-based lesson mode, AI tutor chat, pronunciation scoring, gamification, payments, classrooms, public sharing, mobile native, Chrome extension or desktop companion deliverable in MVP.
- Private beta requires caption/auto-caption and at least one audio-to-text fallback end-to-end.
- Public launch—not controlled private beta—requires final Privacy Policy, Terms and legal review.
- Implementation remains gated by UX, Architecture, Epics/Stories, Implementation Readiness and Sprint Planning.

### PRD Completeness Assessment

The PRD is complete enough for implementation-readiness traceability. Product scope, user journeys, functional behavior, quality gates, success metrics, non-goals and release gates are explicit. The language amendment resolves the only material product-boundary ambiguity by defining original-English eligibility, mixed-language handling and the terminal unsupported-language behavior.

## Step 3 — Epic Coverage Validation

The canonical epic index and all story shards were read. The Story Coverage Matrix was compared against every functional requirement extracted from the PRD.

### Coverage Matrix

| FR | PRD requirement | Epic/story coverage | Status |
| --- | --- | --- | --- |
| FR1 | Auth, required sign-in and owner isolation | Epic 1 / Story 1.1 | ✓ Covered |
| FR2 | Private beta boundary | Epic 1 / Story 1.1 | ✓ Covered |
| FR3 | Parse and validate YouTube URLs | Epic 1 / Story 1.2 | ✓ Covered |
| FR4 | Required CEFR A1–C1 selection | Epic 1 / Story 1.3 | ✓ Covered |
| FR5 | Metadata and playability states | Epic 1 / Story 1.2 | ✓ Covered |
| FR6 | Long-video budget/chunking; no silent truncation | Epic 2 / Story 2.7 | ✓ Covered |
| FR7 | Manual/auto caption fast path | Epic 2 / Story 2.2 | ✓ Covered |
| FR8 | Hosted transcript provider fallback | Epic 2 / Story 2.4 | ✓ Covered |
| FR9 | Policy-gated unofficial extractor | Epic 2 / Story 2.4 | ✓ Covered |
| FR10 | Consent-based audio-to-text fallback | Epic 2 / Stories 2.4, 2.6 | ✓ Covered |
| FR11 | Paste/upload transcript fallback | Epic 2 / Story 2.5 | ✓ Covered |
| FR12 | Canonical transcript normalization | Epic 2 / Stories 2.2, 2.4–2.7 | ✓ Covered |
| FR13 | Transcript/audio persistence and retention | Epic 2 / Stories 2.2, 2.4–2.6, 2.9 | ✓ Covered |
| FR14 | Deterministic preprocessing and untrusted input | Epic 3 / Story 3.1 | ✓ Covered |
| FR15 | Evidence-linked video analysis | Epic 3 / Story 3.1 | ✓ Covered |
| FR16 | Language candidate pool | Epic 3 / Story 3.2 | ✓ Covered |
| FR17 | Maximum three learning outcomes | Epic 3 / Story 3.2 | ✓ Covered |
| FR18 | Teachable-moment selection | Epic 3 / Story 3.2 | ✓ Covered |
| FR19 | Flexible Core Lesson progression | Epic 3 / Story 3.3 | ✓ Covered |
| FR20 | Material CEFR personalization | Epic 3 / Story 3.2 | ✓ Covered |
| FR21 | Segment grounding and generated/source distinction | Epic 3 / Stories 3.2–3.4 | ✓ Covered |
| FR22 | Structured outputs and provenance versions | Epic 3 / Stories 3.1–3.3 | ✓ Covered |
| FR23 | Mandatory multi-stage generation | Epic 3 / Stories 3.1–3.3 | ✓ Covered |
| FR24 | Provider-independent lesson generation | Epic 3 / Stories 3.1–3.3 | ✓ Covered |
| FR25 | Structural validation hard gate | Epic 3 / Story 3.4 | ✓ Covered |
| FR26 | Grounding validation hard gate | Epic 3 / Story 3.4 | ✓ Covered |
| FR27 | Scored-activity answer validity | Epic 3 / Story 3.4 | ✓ Covered |
| FR28 | Quality score ≥14/16 plus hard gates | Epic 3 / Story 3.4 | ✓ Covered |
| FR29 | Bounded targeted repair and fail closed | Epic 3 / Story 3.4 | ✓ Covered |
| FR30 | Golden regression before promotion | Epic 3 / Story 3.5 | ✓ Covered |
| FR31 | Durable, idempotent generation job | Epic 2 / Stories 2.1, 2.7–2.9 | ✓ Covered |
| FR32 | Persisted user-facing stages | Epic 2 / Stories 2.1, 2.3, 2.7–2.9 | ✓ Covered |
| FR33 | Stable actionable product errors | Epic 2 / Stories 2.1, 2.3–2.9 | ✓ Covered |
| FR34 | Readable Lesson Viewer | Epic 3 / Story 3.6 | ✓ Covered |
| FR35 | Timestamp/evidence seeks player | Epic 4 / Story 4.1 | ✓ Covered |
| FR36 | Interactive scored/guided activities | Epic 4 / Story 4.2 | ✓ Covered |
| FR37 | Retrieval, transfer and exit ticket | Epic 4 / Story 4.3 | ✓ Covered |
| FR38 | Completion state | Epic 4 / Story 4.3 | ✓ Covered |
| FR39 | Atomic publish only after Final Gate | Epic 3 / Story 3.6 | ✓ Covered |
| FR40 | Reopen saved lesson without regeneration | Epic 5 / Story 5.1 | ✓ Covered |
| FR41 | Library metadata, filters, recovery and deletion | Epic 5 / Stories 5.1–5.3 | ✓ Covered |
| FR-LANG-1 | Transcript/segment language detection | Epic 2 / Story 2.3 | ✓ Covered |
| FR-LANG-2 | Sufficient coherent original English | Epic 2 / Story 2.3 | ✓ Covered |
| FR-LANG-3 | Mixed-language eligibility boundary | Epic 2 / Story 2.3 | ✓ Covered |
| FR-LANG-4 | Unsupported-language terminal state/action | Epic 2 / Story 2.3 | ✓ Covered |
| FR-LANG-5 | No translation/dubbing/generated substitute | Epic 2 / Stories 2.3–2.6 | ✓ Covered |

### Missing Requirements

None. Every PRD functional requirement has at least one explicit story implementation path and acceptance-criteria coverage.

### Extra Epic Requirements Not Present in PRD

None. Epics add implementation details, architecture references and UX constraints, but do not introduce an unapproved product capability outside the PRD.

### Coverage Statistics

- Total PRD FRs: 46
- FRs covered in epics: 46
- Missing FRs: 0
- Coverage: 100%

## Step 4 — UX Alignment Assessment

### UX Document Status

**Found.** `DESIGN.md` defines the visual/design-system spine and `EXPERIENCE.md` defines information architecture, states, interaction behavior, responsive rules and accessibility.

### UX ↔ PRD Alignment

Strong alignment exists for:

- Passwordless sign-in and protected owner-scoped surfaces.
- Create Lesson with YouTube URL, metadata preview and required CEFR A1–C1.
- Persisted generation URL, recoverable progress and actionable transcript fallback.
- Consent-first tab-audio capture, no video storage and temporary-audio retention copy.
- Core Lesson progression, source evidence, progressive transcript support, activities, retrieval, transfer and completion.
- Library reopen without regeneration, failed-job recovery and deletion confirmation.
- Calm Vietnamese product copy, no gamification, no AI-chat-first interface and no provider jargon.

### UX ↔ Architecture Alignment

Architecture supports the UX through:

- Next.js App Router, Tailwind and shadcn/ui for the responsive component system.
- Supabase SSR auth, Postgres product truth and RLS for protected surfaces and reload-safe state.
- Inngest durable workflow, persisted stages and polling for Generation UX.
- Provider ports and stable ProductError mapping for fallback cards without vendor jargon.
- Private temporary storage, signed uploads and TTL cleanup for tab-audio capture.
- Canonical transcript timing and source references for transcript rows and later player seeking.
- Immutable published lesson versions and owner-safe reads for Lesson Viewer and Library performance.
- Explicit responsive, accessibility, reduced-motion, focus and keyboard requirements in the derived architecture/UX inventory.

No structural architecture capability required by the final UX is missing.

### Alignment Issues

#### UX-ALIGN-1 — Stale tagline and product promise

**Severity:** High documentation drift.

`DESIGN.md` uses **“Any video. Your English lesson.”** The final PRD amendment and project context require **“Any English video. Your English lesson.”** The current design wording can cause implementation copy to promise support for non-English videos, contradicting the terminal language-eligibility boundary.

**Required correction:** Update the design tagline and any generic “every/public video” copy to explicitly say English-language video or enough original English speech.

#### UX-ALIGN-2 — Mandatory language-check phase missing from UX phase vocabulary

**Severity:** High state-model drift.

`EXPERIENCE.md` lists Generation phases without **“Kiểm tra tiếng Anh”**, while the PRD amendment and architecture amendment require `checking_language` after every normalized transcript and before Lesson Engine work. Epics and derived UX requirements already include the missing phase.

**Required correction:** Add `Kiểm tra tiếng Anh` between transcript acquisition and content analysis in the phase vocabulary and affected key flows.

#### UX-ALIGN-3 — Unsupported-language state is not explicit in the UX state table

**Severity:** Medium.

The final product requires `VIDEO_LANGUAGE_UNSUPPORTED`, the standard Vietnamese message and one primary action `Chọn video khác`. The UX state patterns cover unavailable video, exhausted captions and low-confidence STT but do not explicitly define this terminal language state.

**Required correction:** Add the unsupported-language state, prohibit translation mode in that state and specify the single primary action.

### Warnings

- Vietnamese translation/help on demand is acceptable only as clearly generated learner support; it must never be presented as original source speech or used as scored English evidence.
- UX and architecture are otherwise aligned on performance targets, responsive behavior, accessibility, player interaction, state persistence, fallback hierarchy and data retention.

### UX Alignment Verdict

**Mostly aligned, with three targeted documentation corrections required before final readiness approval.** These are source-of-truth copy/state issues rather than missing architecture capabilities.
