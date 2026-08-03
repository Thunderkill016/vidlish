# Vidlish Architecture and UX Requirements

## Architecture Requirements

AR1: Scaffold Next.js 16 App Router, Node.js 24 LTS, TypeScript 6, pnpm 10, Tailwind 4, shadcn/ui và Zod 4; lock exact patches.

AR2: Dùng hexagonal modular monolith; module tách domain/application/ports và dependency hướng vào trong.

AR3: Supabase Postgres/Auth/Storage là persistence platform; Postgres là product truth.

AR4: Cookie-based Supabase SSR auth; server xác thực mọi command; browser không ghi trực tiếp lesson/transcript tables.

AR5: Mọi owner-scoped table/bucket bật RLS; service role chỉ ở server.

AR6: Inngest v4 điều phối durable workflow, retry, checkpoint, one-run-per-job và durable wait.

AR7: Chỉ `GenerateLessonWorkflow` được advance job state.

AR8: Workflow step có stable ID và idempotency/persisted result guard.

AR9: Event identity derive từ job + pipeline version; active-job dedup theo owner + video + CEFR + pipeline.

AR10: Transcript acquisition là ordered strategy registry sau provider ports.

AR11: Mọi strategy trả canonical transcript DTO; raw provider objects không qua domain boundary.

AR12: Thêm language eligibility evaluator sau normalization và trước Lesson Engine.

AR13: `VIDEO_LANGUAGE_UNSUPPORTED` là terminal; `NO_CAPTIONS` chỉ là strategy result khi còn fallback.

AR14: Tab audio chia chunks, upload signed URL vào private temporary bucket và xóa theo commit/failure/TTL.

AR15: Video dài chunk theo semantic/token/cost budgets và có thể tạo overview + micro-lessons.

AR16: Lesson Engine tuân thủ multi-stage spec; deterministic code sở hữu hard gates.

AR17: Gemini adapter dùng stable configured model qua `@google/genai`; không dùng `*-latest`; key server-only.

AR18: Published lesson immutable/versioned; regeneration tạo version mới; completion state tách riêng.

AR19: Publish version + update pointer + complete job là atomic transaction.

AR20: External payloads, commands, events và provider outputs qua versioned Zod schemas.

AR21: Product errors có uppercase code, Vietnamese copy, retryability và safe action.

AR22: Cache key gồm transcript hash, CEFR, lesson mode, pipeline, prompt, model và schema/quality versions.

AR23: Typed config module validate env at startup; module không đọc `process.env` trực tiếp.

AR24: MVP progress dùng persisted polling; transport có thể thay mà không đổi state model.

AR25: Test pyramid gồm unit, Postgres/RLS integration, Inngest/adapters, Playwright E2E và live evaluation riêng.

AR26: Source tree giữ boundaries identity/video/transcript/lesson-engine/lessons/library/workflows/adapters/platform/shared.

AR27: Local, staging và production tách Supabase/Inngest/provider keys; co-locate compute/database khi có thể.

AR28: Delete lesson là owner-authorized transaction/workflow và dọn dependent transcript/temp audio.

AR29: `GenerationPolicy` là domain gate duy nhất cho quota, concurrency và estimated cost.

AR30: CI không gọi live providers; production promotion yêu cầu golden evaluation.

## UX Design Requirements

UX-DR1: Implement Learning Indigo, Evidence Teal, Timestamp Amber và dark variants trên nền shadcn tokens.

UX-DR2: Dùng Geist Sans/Mono với display/display-sm/timestamp roles; reading width 720px, app shell 1280px.

UX-DR3: Dùng radii 8/12/16px và spacing 16/24–32/32px theo design spine.

UX-DR4: Giao diện calm, grounded, content-first; không gradients, mascot, streak, XP, confetti hoặc dense dashboard.

UX-DR5: Navigation chỉ có Tạo bài học, Thư viện và account menu.

UX-DR6: Create Lesson centered single-column 720px với URL, CEFR, CTA, privacy note và recent shortcut tùy trạng thái.

UX-DR7: URL field có label, paste affordance, blur/submit validation và metadata preview gọn.

UX-DR8: CEFR selector A1–C1 có mô tả; equal buttons desktop và scrollable segmented row mobile.

UX-DR9: Job có persisted URL và phase stepper responsive; state không phụ thuộc màu đơn thuần.

UX-DR10: User-facing phases gồm video, transcript, language, analysis, selection, activities, validation, completion.

UX-DR11: Fallback card chỉ có một recommended action; alternatives dưới “Cách khác”; không provider jargon.

UX-DR12: Tab capture giải thích purpose, selected-tab scope, retention và non-storage trước picker; picker từ direct action.

UX-DR13: Capture UI có waiting/capturing/transcribing/completed/denied/no-audio và stop behavior.

UX-DR14: Unsupported language hiển thị copy chuẩn và CTA chọn video khác; không translation mode.

UX-DR15: Lesson desktop split sticky media 38–42%/content 58–62%; mobile stacked, player không sticky lâu.

UX-DR16: Lesson mở bằng title, CEFR, time, tối đa ba outcomes, activation và gist trước full transcript.

UX-DR17: Phase nav scroll tới Bắt đầu, Gist, Ngôn ngữ, Luyện tập, Nhớ lại, Vận dụng, Kết thúc.

UX-DR18: Transcript modes Hidden/Keywords/Full English/Vietnamese help on demand; gist mặc định hidden.

UX-DR19: Evidence chip keyboard-operable, accessible timestamp name, seek player và focus transcript row.

UX-DR20: Transcript row có timestamp/source text/current state; low confidence không hỗ trợ scored evidence.

UX-DR21: Language item card có form, register, nghĩa Việt, definition Anh, source quote, timestamp, context và “Ví dụ mới”.

UX-DR22: Activity card theo attempt → submit → feedback; Xem đáp án tách khỏi Nộp.

UX-DR23: Retrieval ẩn target trước attempt; transfer có 2–4 self-check criteria và không fake grading.

UX-DR24: Completion có exit ticket, tối đa ba takeaways, mark-complete và Library link; không gamification.

UX-DR25: Library reverse chronological với metadata/status; ready/job/failed rows mở đúng surface.

UX-DR26: Delete dialog nêu rõ dependent transcript, focus Cancel và CTA “Xóa bài học”.

UX-DR27: Có skeleton, URL/unavailable/language/fallback/capture/low-confidence/schema/quality/offline/delete states.

UX-DR28: WCAG 2.2 AA: labels, keyboard order, focus return, aria-live, text/icon status, 44px touch target, reduced motion, lang attrs.

UX-DR29: Responsive: ≥1100 split lesson; 768–1099 adaptive; <768 single column + Accordion/Sheet.

UX-DR30: Chromium desktop là primary tab-audio target; caption flows hoạt động trên modern browsers khác và capability-detect capture.

UX-DR31: YouTube player giữ native controls; không overlay che controls; test iframe keyboard focus.

UX-DR32: Microcopy bình tĩnh, cụ thể, action-oriented; UI tiếng Việt và source English có language attributes.
