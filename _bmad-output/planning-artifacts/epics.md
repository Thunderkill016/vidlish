---
stepsCompleted: [1]
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
---

# Vidlish - Epic Breakdown

## Overview

Tài liệu này cung cấp bản phân rã epic và story đầy đủ cho Vidlish, chuyển các yêu cầu từ PRD, UX Design, Lesson Engine Spec và Architecture thành các story có thể triển khai và kiểm thử.

## Requirements Inventory

### Functional Requirements

FR1: Người dùng phải đăng ký, đăng nhập và đăng xuất; phải đăng nhập trước khi tạo generation job; mọi Job, Transcript và Lesson có owner và không thể bị người dùng khác truy cập hoặc thay đổi.

FR2: MVP được vận hành dưới dạng private beta để kiểm chứng transcript coverage, chất lượng lesson, chi phí và rủi ro trước public launch.

FR3: Người dùng có thể dán các dạng URL YouTube phổ biến; hệ thống chuẩn hóa và suy ra video ID, đồng thời từ chối URL không hợp lệ.

FR4: Người dùng phải chọn một trình độ CEFR A1–C1 trước khi tạo bài; đây là personalization control bắt buộc duy nhất của MVP.

FR5: Hệ thống lấy và lưu tối thiểu title, channel, thumbnail và duration khi có; phân biệt video không tồn tại, private, restricted hoặc không thể phát.

FR6: Hệ thống không từ chối video chỉ vì một giới hạn phút cố định; phải dùng token/cost budget, chunking và xử lý bất đồng bộ, không silently truncate, và có thể tạo overview cùng micro-lesson cho video dài.

FR7: Transcript acquisition ưu tiên manual caption và auto-caption có sẵn, giữ lại nguồn và confidence.

FR8: Khi caption fast path thất bại, hệ thống có thể gọi hosted transcript provider được cấu hình phía server.

FR9: Private beta có thể sử dụng unofficial extractor sau provider abstraction, với timeout, retry có giới hạn, feature flag và khả năng thay thế.

FR10: `NO_CAPTIONS` không phải lỗi cuối; hệ thống phải có ít nhất một audio-to-text fallback có sự đồng ý của người dùng, ưu tiên browser tab-audio capture trong web MVP.

FR11: Người dùng có thể paste transcript hoặc upload subtitle; upload audio/video chỉ áp dụng cho nội dung người dùng có quyền sử dụng.

FR12: Hệ thống chuẩn hóa transcript thành segment có stable ID, text, start timestamp, end/duration, source và confidence khi có; loại segment trống, duplicate/corrupt và không bịa phần thiếu.

FR13: Hệ thống lưu transcript chuẩn hóa cần thiết để mở lại lesson; không lưu video; audio capture chỉ tồn tại tạm thời và bị xóa sau transcription hoặc job failure; transcript phụ thuộc bị xóa theo retention khi lesson cuối cùng bị xóa.

FR14: Trước model call, transcript phải được normalize, hash, gắn segment ID, source/confidence và đánh dấu là untrusted input.

FR15: Lesson Engine phân loại genre, topic, structure, difficulty, semantic sections, listening challenges và low-confidence regions; mọi claim về video có evidence segment.

FR16: Engine tạo candidate pool ngôn ngữ lớn hơn số item sẽ publish, gồm form, kind, CEFR, register, context meaning, evidence, usefulness và transferability.

FR17: Engine chọn tối đa ba learning outcomes dựa trên video và level; mọi section và activity phải phục vụ ít nhất một outcome.

FR18: Engine chọn teachable moments theo teaching value, không chỉ độ khó; loại proper noun, item quá chuyên ngành hoặc không có khả năng chuyển giao trừ khi cần để hiểu video.

FR19: Core Lesson co giãn trong khoảng mục tiêu 10–20 phút theo progression activation, gist, summary/video map, noticing, guided practice/listening decoding, comprehension, retrieval, transfer và reflection; không bịa item để đủ quota.

FR20: Cùng một video phải tạo lesson khác biệt thực chất giữa A1–C1 về support, số item, loại câu hỏi, độ sâu giải thích và production demand.

FR21: Source quote, factual claim, detail question, grammar evidence và answer rationale phải tham chiếu segment ID tồn tại; generated example phải được phân biệt với source quote.

FR22: Mọi AI stage phải trả structured output theo schema version hóa; lesson lưu schema, pipeline, prompt, model, transcript hash và quality report versions.

FR23: Production generation bắt buộc là multi-stage: Video Analyst → Language Miner → Objective Planner → Activity Composer → Validators → Reviewer → Targeted Repair → Final Gate; cấm one-shot transcript-to-published-lesson.

FR24: Gemini chỉ là implementation của `LessonGenerationProvider`; có thể đổi provider mà không đổi domain lesson schema hoặc deterministic validators.

FR25: Lesson sai schema, field type, enum hoặc relationship không được coi là lesson hoàn chỉnh hoặc publish.

FR26: Segment ID không tồn tại, source quote không khớp hoặc claim thiếu evidence là hard failure.

FR27: Mỗi scored activity phải có answer key, rationale và evidence hoặc acceptance criteria; multiple-choice có đúng một đáp án tốt nhất.

FR28: Lesson chỉ publish khi vượt mọi hard gate và đạt quality score tối thiểu 14/16; grounding và exercise validity phải đạt mức tối đa.

FR29: Khi module lỗi, hệ thống thực hiện targeted repair với lỗi validation cụ thể; tối đa một structural repair và một semantic repair trước khi fail closed.

FR30: Mọi thay đổi model, prompt, schema hoặc selector phải chạy regression evaluation trên ít nhất 10 video đa genre và nhiều CEFR level trước production.

FR31: Hệ thống tạo generation job có ID và idempotency key trước khi gọi provider; reload/retry không làm mất trạng thái hoặc tạo job trùng ngoài ý muốn.

FR32: UI hiển thị các stage người dùng hiểu được: kiểm tra video, lấy/tạo transcript, kiểm tra tiếng Anh, phân tích video, chọn nội dung học, tạo hoạt động, kiểm định và hoàn tất.

FR33: Mỗi lỗi đã biết được map thành thông báo tiếng Việt và hành động cụ thể như retry, capture audio, provide transcript hoặc choose another video; không lộ raw provider error.

FR34: Lesson Viewer hiển thị player, learning outcomes, summary/video map, timestamped transcript, language items, activities, answers/explanations và provenance tối thiểu cho debug nội bộ.

FR35: Evidence/timestamp interaction phải seek player tới đoạn tương ứng khi player hỗ trợ.

FR36: Người dùng có thể làm gist, comprehension, listening và retrieval activities, submit scored items và xem feedback; MVP không cần lưu mọi câu trả lời dài hạn.

FR37: Lesson có ít nhất một transfer/production prompt và một exit ticket; open prompt có self-check criteria nhưng không giả vờ AI chấm chính xác.

FR38: Người dùng có thể đánh dấu lesson completed hoặc incomplete.

FR39: Lesson chỉ được publish và lưu tự động sau Final Quality Gate pass.

FR40: Người dùng mở lesson đã lưu mà không gọi lại transcript provider hoặc Lesson Engine.

FR41: Library hiển thị title, thumbnail, CEFR, created date, status và transcript/generation source cơ bản; người dùng có thể mở, lọc trạng thái và xóa lesson sau xác nhận.

FR-LANG-1: Sau transcript acquisition và normalization, hệ thống detect language ở cả transcript và segment level trước mọi Lesson Engine generation stage.

FR-LANG-2: Hệ thống chỉ tiếp tục khi video có đủ lời nói tiếng Anh gốc, đáng tin cậy và liền mạch để hỗ trợ grounding, listening, language mining và scored activities; vài từ tiếng Anh rời rạc không đủ điều kiện.

FR-LANG-3: Video mixed-language chỉ được chấp nhận khi phần tiếng Anh tự nó đủ cho một lesson hợp lệ; phần không phải tiếng Anh chỉ là context và không được dùng làm English evidence.

FR-LANG-4: Khi không đủ tiếng Anh gốc, job phải dừng trước các Lesson Engine/model call tốn kém và trả `VIDEO_LANGUAGE_UNSUPPORTED` với action `choose_another_video`.

FR-LANG-5: MVP không được dịch video không phải tiếng Anh để thay thế, không synthesize English audio, không tạo listening/grammar/pronunciation evidence từ generated English và không gắn generated/translated text thành source quote.

### NonFunctional Requirements

NFR1: API keys, Supabase service-role credentials và provider secrets chỉ tồn tại phía server, không nằm trong client bundle hoặc public logs.

NFR2: Ownership phải được kiểm tra ở application layer và bằng database/storage policy; mọi exposed owner-scoped table và bucket phải có RLS.

NFR3: Transcript, captured audio và prompt chứa transcript được coi là dữ liệu nhạy cảm do người dùng lựa chọn; hệ thống không log toàn bộ content body.

NFR4: Temporary audio phải private, có retention ngắn, bị xóa ngay sau transcription/failure và có sweeper TTL làm defense in depth.

NFR5: Hệ thống phải có account/job rate limits, quota, concurrency và estimated-cost gates trước các tác vụ tốn tiền.

NFR6: External providers phải nằm sau adapters có timeout, bounded retry, error mapping và circuit-breaker/fallback behavior phù hợp.

NFR7: Generation state phải được persist, không chỉ nằm trong memory của browser, request handler hoặc workflow worker.

NFR8: Hệ thống fail closed khi transcript eligibility hoặc lesson quality gate chưa đạt; không publish partial lesson.

NFR9: Provider, model, prompt, pipeline và schema versions phải được ghi để có thể tái tạo và điều tra lỗi.

NFR10: URL/metadata validation phải phản hồi hoặc bắt đầu phản hồi trong khoảng 2 giây ở điều kiện bình thường.

NFR11: Saved Lesson và Library phải hiển thị dữ liệu chính trong khoảng 3 giây ở điều kiện bình thường.

NFR12: Long-running generation phải asynchronous, có persisted status và không giữ HTTP request mở vô thời hạn.

NFR13: Core flows phải dùng được bằng bàn phím, có visible labels, focus states, transcript support và responsive behavior.

NFR14: Core responsive web phải đạt WCAG 2.2 AA theo UX floor; tối thiểu không dùng color-only feedback, hover-only core actions hoặc inaccessible modal flows.

NFR15: Mỗi job phải ghi stage latency, acquisition strategy, transcript source/confidence, language eligibility result, provider/model, token usage, retry/repair, quality result và cost estimate mà không log secrets/full transcript.

NFR16: CI mặc định không gọi live YouTube, transcript, STT hoặc Gemini providers; dùng fixtures/fakes/sandboxes.

NFR17: Pipeline/model/prompt changes phải vượt deterministic tests và golden evaluation set trước production promotion.

NFR18: Local, staging/private-beta và production phải dùng data, secrets và provider environments tách biệt.

NFR19: Production phải có managed database backups và restore procedure được kiểm thử trước public launch.

NFR20: Processing video dài phải bị giới hạn bằng semantic/token/request/cost budgets, không bằng silent truncation hoặc một duration cap tùy tiện.

NFR21: Public launch phải có Privacy Policy, Terms of Use và legal review cho transcript acquisition, retention, embeds và AI-generated educational content.

### Additional Requirements

- Scaffold một Next.js 16 App Router application trong một TypeScript repository; dùng Node.js 24 LTS, pnpm 10, Tailwind 4, shadcn/ui và Zod 4; exact patch versions được lock trong `pnpm-lock.yaml` tại scaffold.
- Dùng kiến trúc hexagonal modular monolith: product module tách `domain`, `application`, `ports`; framework/vendor code chỉ ở `app`, `platform`, `adapters`; dependency direction đi vào trong.
- Dùng Supabase hosted Postgres/Auth/Storage; Postgres là system of record cho jobs, transcripts, lesson versions, current lesson pointer và completion state.
- Dùng cookie-based Supabase SSR auth; server kiểm tra user cho mọi command; browser không ghi trực tiếp lesson/transcript tables.
- Mọi exposed user-owned table và private Storage bucket phải bật RLS với owner policy; service-role chỉ dùng phía server.
- Dùng Inngest TypeScript SDK v4 cho durable generation workflow, checkpoint, retry, concurrency one per `job_id` và durable wait for user input.
- Chỉ `GenerateLessonWorkflow` được advance `lesson_jobs.status/current_stage`; HTTP handlers chỉ tạo/cancel job hoặc attach input.
- Mọi externally visible workflow stage có stable step ID và phải idempotent hoặc được guard bằng persisted result key.
- Job event ID phải derive từ `job_id + pipeline_version`; active job dedup key là owner + video + CEFR + pipeline version.
- Transcript acquisition phải là ordered strategy registry phía sau `TranscriptStrategy`; mỗi strategy khai báo source, permission, policy, cost và canonical result class.
- Unofficial extraction bị feature-flag bằng `ENABLE_UNOFFICIAL_TRANSCRIPT_STRATEGIES` và không tự bật trong public production.
- Mọi transcript source phải map về một canonical DTO với stable segment IDs, millisecond offsets, normalized text, source type, provider, language và confidence.
- Thêm language eligibility evaluator/port sau normalization và trước Lesson Engine; eligibility phải xét language share, absolute coherent English duration, confidence và evidence suitability.
- `VIDEO_LANGUAGE_UNSUPPORTED` là terminal MVP result; `NO_CAPTIONS` chỉ là strategy result khi còn permitted fallback.
- Browser tab audio được chia bounded chunks, upload bằng signed URL vào private temporary bucket và xóa sau transcript commit/failure hoặc TTL.
- Long videos được chunk deterministically theo semantic/token/cost budgets và có thể tạo overview + micro-lesson candidates.
- Lesson generation tuân thủ Lesson Engine companions; deterministic code sở hữu hard gates, quote hydration, segment existence và answerability.
- Default model adapter dùng stable configured Gemini model qua `@google/genai`; model name không dùng `*-latest`; `GEMINI_API_KEY` server-only.
- Published lesson content immutable và versioned; regeneration tạo `lesson_version` mới; completion state lưu riêng.
- Publish version, update current pointer và complete job phải là một database transaction/SQL function nguyên tử.
- External payloads, commands, events và provider outputs phải qua versioned Zod schemas; raw provider objects không vào domain/application.
- User-facing errors dùng stable uppercase product codes, Vietnamese copy, retryability và safe next action; provider details chỉ trong redacted logs.
- Cache keys phải chứa transcript hash, CEFR, lesson mode, pipeline, prompt, model và quality/schema versions; stale incompatible cache không được dùng.
- Dùng typed config module validate environment variables khi startup; module không đọc `process.env` trực tiếp.
- MVP progress transport là polling persisted `lesson_jobs`; realtime có thể thêm sau mà không đổi state ownership.
- Test pyramid gồm unit domain tests, Postgres/RLS integration tests, Inngest step tests, adapter fixture tests, Playwright E2E và separate live-provider evaluation suite.
- Source tree phải giữ các module identity, video, transcript, lesson-engine, lessons, library; workflows generate-lesson/retention; adapters youtube/transcript/stt/gemini/supabase; platform config/inngest/telemetry.
- Environments local, staging và production dùng Supabase/Inngest/provider keys riêng; production compute và database region co-located khi khả dụng.
- Deleting lesson là owner-authorized transaction/workflow, xóa versions/state và transcript khi không còn dependency; temporary audio luôn bị xóa.
- `GenerationPolicy` là một domain gate duy nhất cho quota, concurrency và estimated cost; exact limits là typed environment config.

### UX Design Requirements

UX-DR1: Implement brand-layer tokens: Learning Indigo `#4338CA`, Evidence Teal `#0F766E`, Timestamp Amber `#B45309` cùng dark variants; các token shadcn khác được kế thừa.

UX-DR2: Implement typography roles `display`, `display-sm`, body Geist Sans và `timestamp` Geist Mono; reading content tối đa 720px và application shell tối đa 1280px.

UX-DR3: Implement radii 8/12/16px và spacing rules: 16px internal gap, 24–32px section gap, 32px giữa lesson phases và 16px giữa activities.

UX-DR4: Giao diện phải content-first, calm, grounded; không gradients, AI glow, mascot, streak, XP, confetti, decorative learning illustrations hoặc dense dashboard.

UX-DR5: Primary authenticated navigation chỉ có `Tạo bài học`, `Thư viện` và account menu; không thêm dashboard/settings hierarchy ngoài scope.

UX-DR6: Create Lesson là centered single-column max 720px với brand promise, paste-friendly URL field, CEFR selector, primary action, privacy note và optional recent-lesson shortcut.

UX-DR7: Video URL field có visible label, paste affordance, validation sau blur/submit và compact metadata preview mà không đẩy primary action quá xa.

UX-DR8: CEFR selector có năm lựa chọn A1–C1 với mô tả thân thiện; desktop dùng equal buttons, mobile dùng horizontally scrollable segmented row; selection dùng primary token.

UX-DR9: Generation job có persisted URL và phase stepper; desktop compact/horizontal, mobile vertical; completed, active, fallback-required, failed và language-unsupported states khác biệt bằng text/icon/semantics chứ không chỉ màu.

UX-DR10: User-facing phases là kiểm tra video, lấy/tạo transcript, kiểm tra ngôn ngữ, phân tích nội dung, chọn phần đáng học, tạo hoạt động, kiểm định và hoàn tất; không lộ từng model call.

UX-DR11: Fallback decision card chỉ hiển thị một recommended action và đặt alternatives dưới `Cách khác`; không hiển thị provider jargon.

UX-DR12: Tab Audio Capture phải giải thích purpose, selected-tab scope, temporary retention và non-storage trước browser picker; picker chỉ mở từ direct user action.

UX-DR13: Capture UI phải có states waiting for playback, capturing, transcribing, completed, permission denied và no audio track; user có thể stop và completed chunks vẫn usable.

UX-DR14: Khi video không có đủ tiếng Anh, hiển thị message: `Video này không có đủ nội dung tiếng Anh để tạo bài học. Hãy chọn một video chủ yếu nói tiếng Anh.` và một primary action quay lại chọn video khác; không đề xuất translation mode.

UX-DR15: Lesson Viewer desktop dùng sticky media rail khoảng 38–42% và reading rail 58–62%; mobile stack player, phase navigation và content, player không sticky sau scroll dài.

UX-DR16: Lesson mở bằng title, CEFR, estimated time, tối đa ba outcomes, activation/prediction và gist trước khi full transcript được mở tự động.

UX-DR17: Phase navigation hiển thị Bắt đầu, Hiểu ý chính, Ngôn ngữ đáng học, Luyện tập, Nhớ lại, Vận dụng, Kết thúc và scroll tới phase thay vì chia thành unrelated tabs.

UX-DR18: Transcript support có Hidden, Keywords, Full English và Vietnamese explanation/translation on demand; gist mặc định hidden; evidence link có thể mở riêng segment liên quan.

UX-DR19: Evidence chip dùng timestamp + play icon, keyboard-operable, accessible name như `Mở video tại 02:14`, seek player và focus transcript row.

UX-DR20: Transcript row hiển thị timestamp + source text; current row dùng accent background/border; confidence chỉ hiện khi thấp hoặc internal debug; low-confidence segments không hỗ trợ scored evidence.

UX-DR21: Language item card hiển thị term, type/register, Vietnamese meaning, level-fit English definition, source quote + timestamp, context explanation và generated example có nhãn `Ví dụ mới`.

UX-DR22: Activity card tuân theo attempt → submit → feedback; `Xem đáp án` tách khỏi `Nộp`; feedback có text giải thích và evidence khi phụ thuộc video.

UX-DR23: Retrieval task phải ẩn target content trước attempt; transfer/open production task có 2–4 self-check criteria và không giả vờ tự động chấm speaking/writing.

UX-DR24: Completion hiển thị exit ticket, tối đa ba takeaways, mark-complete action và Library link; không confetti, streak hoặc forced share.

UX-DR25: Library reverse chronological, row/card có thumbnail, title/channel, CEFR, date và processing/ready/failed/completed status; ready mở lesson, processing mở job, failed khôi phục fallback state.

UX-DR26: Delete dialog phải nêu rõ lesson và dependent transcript sẽ bị xóa, focus mặc định vào Cancel và confirm button ghi `Xóa bài học`.

UX-DR27: Implement layout-matched Skeleton, inline URL error, unavailable-video state, language-unsupported state, caption fallback, permission denial, no-audio, low-confidence, AI/schema failure, quality-gate failure, offline và delete-success states.

UX-DR28: Accessibility floor WCAG 2.2 AA: visible labels, logical Tab order, Esc close + focus return, aria-live job updates không spam, text/icon status, minimum 44×44px touch targets, reduced motion và language attributes cho Vietnamese/English.

UX-DR29: Responsive rules: ≥1100px lesson split layout; 768–1099px adaptive narrower/stacked layout; <768px single column, compact nav, transcript/video map bằng Accordion/Sheet.

UX-DR30: Chromium desktop là primary beta target cho tab-audio; caption-based Create/Lesson/Library vẫn phải hoạt động trên modern browsers khác và capture availability phải capability-detected.

UX-DR31: YouTube player giữ native controls; không có custom overlay che controls; iframe focus behavior phải được test bằng keyboard.

UX-DR32: Microcopy bình tĩnh, cụ thể, action-oriented và không anthropomorphize AI; system navigation/explanations dùng tiếng Việt, English source content giữ đúng language attributes.

### FR Coverage Map

{{requirements_coverage_map}}

## Epic List

{{epics_list}}
