---
name: Vidlish
status: final
updated: 2026-08-03
sources:
  - ../../prds/prd-vidlish-2026-08-03/prd.md
  - ../../prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md
  - ../../architecture/architecture-vidlish-2026-08-03/ARCHITECTURE-SPINE.md
  - ../../architecture/architecture-vidlish-2026-08-03/LANGUAGE-ELIGIBILITY-AMENDMENT.md
  - ../../architecture/architecture-vidlish-2026-08-03/IMPLEMENTATION-DECISIONS.md
design: DESIGN.md
---

# Vidlish — Experience Spine

## Foundation

Vidlish is a responsive web application for Vietnamese English learners. It is desktop-first for generation and study, but every core flow works on modern mobile browsers.

Canonical promise:

> **Any English video. Your English lesson.**

A video is eligible only when the original speech contains enough reliable, coherent English. Missing captions are recoverable; confirmed insufficient original English is terminal for MVP.

Product UX principles:

1. **One job at a time.** Create, learn and manage are separate surfaces.
2. **Progressive support.** Gist and recall precede full transcript/reveal where appropriate.
3. **Evidence nearby.** Source-dependent claims and answers expose the supporting timestamp/reference.
4. **Fallback without blame.** Acquisition failures lead to the next valid method or one clear user action.
5. **Quality before speed.** Progress communicates checking and validation, not “AI thinking.”
6. **Original-English boundary.** Translation/support never masquerades as source speech or scored English evidence.
7. **No forced completeness.** Lessons may be shorter when source teaching value is limited.

## Information architecture

| Surface | Purpose |
| --- | --- |
| Sign in | Six-digit email OTP and private-beta access |
| Create Lesson | Paste YouTube URL, verify metadata, choose CEFR and confirm readiness |
| Generation | Persisted job progress, fallbacks, retry/cancel and completion redirect |
| Transcript Input | Paste transcript or upload `.srt`/`.vtt` into the current job |
| Tab Audio Capture | Consent-first capture of the selected YouTube tab’s audio |
| Lesson Viewer | Study the published grounded Core Lesson |
| Library | Open saved lessons/jobs, filter, recover and delete |
| Account menu | Sign out in Story 1.1; quota and retention details appear only when owning stories exist |

Primary authenticated navigation:

- **Tạo bài học**
- **Thư viện**
- Account menu

No dashboard, marketplace, social feed, streak, XP or settings hierarchy in MVP. The beta-feedback link is deferred until a requirement assigns ownership.

## Voice and tone

System navigation and explanation default to Vietnamese. English is used for source speech and learning terms.

| Situation | Preferred copy |
| --- | --- |
| Empty create | “Dán video tiếng Anh bạn muốn học.” |
| Caption missing | “Video này chưa có phụ đề dùng được. Vidlish đang thử cách khác để lấy lời thoại.” |
| Permission | “Chỉ audio của tab bạn chọn được dùng tạm thời để tạo transcript. Vidlish không lưu video.” |
| Long processing | “Video dài đang được chia thành các phần để xử lý.” |
| Language check | “Đang kiểm tra video có đủ nội dung tiếng Anh để tạo bài học.” |
| Quality check | “Đang đối chiếu câu hỏi và trích dẫn với video.” |
| Unsupported language | “Video này không có đủ nội dung tiếng Anh để tạo bài học. Hãy chọn một video chủ yếu nói tiếng Anh.” |
| Lesson ready | “Bài học đã sẵn sàng.” |
| Delete | “Xóa bài học và dữ liệu phụ thuộc đã lưu?” |

Avoid provider names, stack traces, “AI magic,” fake certainty and blame-oriented copy.

## Global behavior

### App shell

- Slim top bar with Create, Library and account menu.
- Logo returns to Create.
- Story 1.1 account menu contains **Đăng xuất** only.
- Story 2.10 may add quota summary.
- Story 2.11 may add privacy/retention explanation.

### Create controls

- URL validation waits for blur or submit.
- Metadata preview stays close to the URL field.
- CEFR A1–C1 is required and persists only for the current Create session.
- Before Story 2.1, the primary action is **Xác nhận lựa chọn** and yields `Sẵn sàng tạo bài học`.
- Story 2.1 replaces it with **Tạo bài học**, creates a persisted job and navigates to `/jobs/{id}`.

### Generation phase vocabulary

The learner-facing phase order is mandatory:

1. **Kiểm tra video**
2. **Lấy hoặc tạo transcript**
3. **Kiểm tra tiếng Anh**
4. **Phân tích nội dung**
5. **Chọn phần đáng học**
6. **Tạo hoạt động**
7. **Kiểm định bài học**
8. **Hoàn tất**

Internal provider/model calls are never exposed as separate phases.

### Persisted progress

- Job page has a durable URL.
- Refresh, backgrounding and temporary network loss do not reset the job.
- Polling reads persisted state; it does not resubmit generation.
- Active, waiting, failed, cancelled and completed states use text/icon plus semantic color.

## Transcript fallback hierarchy

1. Try enabled server-side strategies automatically.
2. Ask the learner only when consent/input is required.
3. Show exactly one recommended primary action.
4. Alternatives appear under **Cách khác**.
5. Never expose extractor/vendor terminology.
6. Never translate a non-English video into a fake source-English lesson.

### User-provided transcript

- Supports pasted text and `.srt`/`.vtt`.
- Keeps the same job ID.
- Parse/validation errors can be corrected without starting over.
- Plain text without reliable timing does not pretend to support exact seek/listening evidence.

### Tab-audio capture

- Capability-detected; Chromium desktop is the primary beta target.
- Explain scope and retention before the browser picker.
- Picker opens only from direct user action.
- User selects the YouTube tab and shares audio.
- Permission denied, no audio, stop or reload keep the job recoverable.
- Video is not stored; temporary audio is deleted after transcription/failure or TTL.

## Language eligibility states

### Checking

While the job is `checking_language`, the phase stepper shows **Kiểm tra tiếng Anh**. Internal thresholds and detector jargon are hidden.

### Eligible

- Continue to **Phân tích nội dung**.
- Mixed-language videos pass only when their English portions independently support a valid lesson.
- Only eligible English segments can support source quotes, listening, grammar and scored evidence.

### Unsupported language

Product error:

```text
VIDEO_LANGUAGE_UNSUPPORTED
```

Preferred message:

> Video này không có đủ nội dung tiếng Anh để tạo bài học. Hãy chọn một video chủ yếu nói tiếng Anh.

Rules:

- Terminal for the current job.
- Sole primary action: **Chọn video khác**.
- No retry button when the conclusion is reliable.
- No translation lesson mode, dubbing, synthetic audio or generated-English substitute.
- Status is conveyed with text/icon, not color alone.

### Low confidence

Low transcript/detector confidence is not automatically the same as unsupported language. The product may request a better transcript method; it fails closed rather than assuming English.

## Lesson Viewer

### Desktop

- Sticky media rail 38–42% and reading rail 58–62%.
- Player, video map and transcript controls on the media side.
- Core Lesson phases remain in sequence on the reading side.

### Mobile

- Player at top and not permanently sticky after meaningful scroll.
- Lesson phases stack below.
- Transcript/video map use inline Accordion or Sheet.
- Evidence activation can return to player without creating a focus trap.

### Opening sequence

1. Title, CEFR and estimated time.
2. Up to three learning outcomes.
3. Activation/prediction.
4. Gist before full transcript is automatically expanded.

### Source distinction

- Original English source speech is labeled/styled as source-backed.
- Generated explanations/examples use a distinct label such as **Ví dụ mới**.
- Vietnamese translation/support is assistance only and never source evidence.
- Non-English source context is never styled as an English teaching quote.

### Activities

- Attempt → submit → feedback.
- Deterministic scored activities use published answer contracts.
- Open production uses self-check criteria, not fake AI/string scoring.
- Listening activities require adequate timing quality.
- Learners may retry without gamification pressure.

### Completion

- Retrieval.
- Transfer/production prompt.
- Exit ticket.
- Mark complete/incomplete.
- Return to Library.

No confetti, streak or forced share.

## Library

Default sort: reverse chronological.

Each item may show thumbnail, title/channel, CEFR, created/updated time, status, completion and source summary when relevant.

Canonical filters:

- All
- Ready
- In progress
- Needs action
- Failed
- Completed

Behavior:

- Ready opens saved Lesson without provider calls.
- Active opens the persisted Job.
- Awaiting input restores the exact fallback.
- Retryable failed jobs expose **Thử lại** only after quota/version checks.
- `VIDEO_LANGUAGE_UNSUPPORTED` exposes **Chọn video khác**, not retry.
- Delete confirmation names affected data and prioritizes Cancel focus.

## State patterns

| State | Treatment |
| --- | --- |
| Cold load | Layout-matched skeleton |
| Signed out | Preserve intended URL, redirect to Sign in, return after OTP |
| Empty Library | “Chưa có bài học.” + `Tạo bài học` |
| URL invalid | Inline accepted-format guidance |
| Video unavailable | Explain private/deleted/restricted/non-embeddable and return to URL |
| Acquisition methods exhausted | Keep job and present the next permitted input/capture action |
| Permission denied/no audio | Keep job; retry capture or choose another input method |
| Language unsupported | Terminal copy + only `Chọn video khác` |
| Quality gate failure | Do not publish partial lesson; offer allowed regeneration/retry |
| Offline | Persisted state and clear unsynced actions |
| Delete pending | Do not claim completion until dependency cleanup succeeds |

## Accessibility floor

- WCAG 2.2 AA for core flows.
- Visible labels; placeholders are not labels.
- Visible focus and logical Tab order.
- `aria-live` announces concise state changes without rereading the full stepper.
- Minimum 44×44 CSS-pixel primary touch targets.
- `Esc` closes the topmost dialog/sheet and returns focus.
- Keyboard alternatives exist for matching/ordering interactions.
- Reduced motion is respected.
- Vietnamese UI and English source text use appropriate language attributes where practical.

## Responsive rules

| Width | Behavior |
| --- | --- |
| ≥1100px | Sticky split Lesson Viewer; Create remains single-column |
| 768–1099px | Narrow split or stacked based on viewport; phase navigation remains usable |
| <768px | Single-column surfaces; compact nav; transcript/map in Accordion/Sheet |

Caption-based Create, Generation, Lesson and Library work in modern browsers. Tab-audio availability is capability-detected and never promised where unsupported.

## Key flows

### Caption fast path

Sign in → paste English video → choose CEFR → create job → caption acquisition → normalize → **Kiểm tra tiếng Anh** → Lesson Engine → quality gate → Lesson Viewer.

### No-caption recovery

Server strategies fail → one recommended fallback → capture tab audio or provide transcript → same job resumes → normalize → **Kiểm tra tiếng Anh** → continue only if eligible.

### Unsupported source language

Transcript acquired → language gate concludes insufficient original English → terminal message → **Chọn video khác** → no Lesson Engine call and no translation substitute.

### Return and recover

Library → open saved lesson without regeneration, or reopen exact active/awaiting/retryable job state → delete after explicit confirmation.

## Handoff authority

- `DESIGN.md` owns visual identity.
- This document owns IA, states, interaction, responsive behavior and accessibility.
- PRD/architecture language amendments override stale language assumptions.
- `IMPLEMENTATION-DECISIONS.md` selects initial adapters but provider details remain hidden from learner UX.