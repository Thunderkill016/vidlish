# Vidlish Project Context

Cập nhật: 2026-08-18.

Đọc theo thứ tự:

1. `HANDOVER.md` — các bẫy và số liệu đắt tiền đã biết.
2. `_bmad-output/planning-artifacts/continuous-development-plan.md` — trạng thái vận hành, ưu tiên và blocker hiện tại.
3. File này — lời hứa sản phẩm, invariant và kiến trúc ổn định.

`_bmad-output/implementation-artifacts/sprint-status.yaml` là tracker BMAD ban đầu và hiện chậm hơn code production; không dùng nó một mình để quyết định task tiếp theo.

## Current stage

- Research, PRD, UX, architecture, epics/stories và readiness: hoàn tất.
- Product code: đã chạy trên production private beta.
- Core path đã được triển khai: auth → YouTube metadata → durable job → native transcript → original-English gate → grounded lesson generation → atomic publish → study workspace/library.
- Trải nghiệm học (M3): activities có chấm điểm, flashcard, luyện nghe theo câu và tiến độ được lưu ở `lesson_progress`.
- Giai đoạn hiện tại: **production stabilization and regression hardening**.
- Ưu tiên hiện tại: acceptance production sau PR #39 và structured observability.
- Blocker: acceptance production cần quyền ghi dữ liệu thật và tiêu Gemini quota.

## Product promise

Vidlish turns a public, playable **English-language YouTube video** into a personalized English lesson for Vietnamese learners.

Canonical tagline:

> **Any English video. Your English lesson.**

## Non-negotiable grounding invariant

Mọi trích dẫn phải đến từ lời thoại thật trong video.

- Model không trả text trích dẫn; chỉ trả `sourceSegmentIds`/segment labels.
- Server hydrate câu gốc và timestamp từ `transcript_segments`.
- `hydrateLessonCitations` từ chối ID ngoài allowlist.
- Chỉ `language_eligible_segments` của canonical transcript hiện tại được đưa vào Lesson Engine.
- Không được nới invariant này để làm test hoặc provider pass.

## Non-negotiable language eligibility invariant

Một video chỉ eligible khi nội dung nói gốc có đủ tiếng Anh đáng tin cậy để tạo Core Lesson từ chính video.

1. Primary spoken language là English, hoặc có một phần English coherent đủ lớn.
2. Non-English incidental speech chỉ là context, không phải source evidence.
3. Vocabulary, grammar, listening và scored evidence đến từ actual English speech.
4. Vidlish không dịch video non-English rồi trình bày như source speech.
5. Insufficient original English kết thúc với `VIDEO_LANGUAGE_UNSUPPORTED`.
6. Caption absence là recoverable; confirmed insufficient English là terminal cho MVP.

## Canonical flow

```text
YouTube URL
→ validate metadata/playability
→ create durable owner-scoped job
→ acquire original-language transcript
→ deterministic normalization and persistence
→ evaluate sufficient coherent original English
   → eligible: persist transcript-scoped allowed segment IDs
   → ineligible: VIDEO_LANGUAGE_UNSUPPORTED
→ generate grounded Core Lesson
→ hydrate and validate citations
→ atomic publish
→ learn / reopen / delete
```

## Architecture

Hexagonal boundaries:

- `src/modules/*/ports`: interfaces;
- `src/modules/*/application`: use cases;
- `src/adapters/*`: Supabase, Gemini, Supadata, YouTube and fixtures;
- `src/platform/*`: composition roots;
- `src/workflows/*`: durable orchestration and terminal invariants.

Persistent flow:

```text
videos
→ lesson_jobs
→ transcripts + transcript_segments
→ language_eligibility_reports + language_eligible_segments
→ lessons
→ lesson_progress
```

Provider changes belong in adapters/composition roots, not in use cases.

## Current implementation decisions

- Auth: Supabase email-password sign-in/sign-up, email confirmation/recovery and optional TOTP MFA.
- Private beta: server-managed Postgres allowlist.
- Metadata: YouTube Data API v3 `videos.list`.
- Native captions: Supadata `mode=native` only on Free plan.
- Language detector: `franc-min@6.2.0` behind a port with fail-closed policy.
- Lesson generation: `gemini-3.5-flash-lite`, `ThinkingLevel.HIGH`, Standard service tier.
- Orchestration: Vercel Workflow with step retries and terminal boundary invariant.
- Persistence: Supabase with RLS, security-definer RPCs and pg_cron watchdog.
- Watchdog: every 2 minutes; terminalizes active jobs idle over 5 minutes.
- Local/CI: fixtures; provider truth requires integration/full-real or authorized production acceptance.
- Study progress: separate owner-scoped table written only through `save_lesson_progress`; learner input never touches the published lesson artifact.

## Core MVP scope

```text
input eligible English video
→ obtain original-language transcript
→ verify sufficient original English
→ generate grounded Core Lesson
→ learn: listen per line, answer graded activities, drill vocabulary
→ save progress / reopen where you stopped / delete
```

No translation-based lesson mode, tutor chat, pronunciation scoring, gamification, payment, classroom management, mobile-native app or public sharing before the MVP core is stable.

## Definition of done pointer

Use the Definition of Done, verification matrix, prioritized backlog and current blockers in:

`_bmad-output/planning-artifacts/continuous-development-plan.md`
