# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án (phần 3)

Companion tiếp nối `epic-2-part-2.md`, gồm Stories 2.7–2.10.

## Story 2.7 — Nhận transcript hoặc subtitle từ người dùng

**As a** người học khi automatic methods chưa tạo được transcript,  
**I want** dán transcript hoặc tải subtitle vào job hiện tại,  
**So that** tôi tiếp tục mà không phải bắt đầu lại.

**Requirements:** FR11–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 · NFR2–4, NFR7–9, NFR12–16 · AD-2–8, AD-13–17, AD-20 · UX-DR9–14, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Durable awaiting-input state

**Given** automatic strategies cạn nhưng job recoverable  
**When** workflow yêu cầu input  
**Then** job chuyển `awaiting_user_input` tại phase `Lấy hoặc tạo transcript`  
**And** dùng durable wait/event  
**And** reload giữ cùng job/video/CEFR.

#### AC2 — Supported inputs

**Given** fallback card  
**When** user mở `Cung cấp transcript`  
**Then** hỗ trợ pasted text, `.srt` và `.vtt`  
**And** tab-audio control chỉ xuất hiện sau Story 2.8  
**And** UX không đề xuất translation.

#### AC3 — Paste validation and timing quality

**Given** pasted input  
**When** parse  
**Then** empty/whitespace bị chặn  
**And** supported timestamps được giữ  
**And** plain text ghi `timingQuality: none`  
**And** không bịa timestamps hoặc dùng source không timing cho exact seek/scored listening.

#### AC4 — Secure subtitle upload

**Given** subtitle upload  
**When** server validate  
**Then** kiểm tra extension, MIME/signature, size, encoding, cue structure/count và timestamp ranges  
**And** unsafe markup/executable/archive/mismatch bị từ chối  
**And** parser không rewrite, dịch hoặc paraphrase speech.

#### AC5 — Rights confirmation and ownership

**Given** user submit  
**When** request xử lý  
**Then** user xác nhận có quyền sử dụng input  
**And** server kiểm tra owner/job state/Zod schema  
**And** cross-owner attach bị chặn  
**And** browser không tự advance workflow.

#### AC6 — Durable resume and canonical pipeline

**Given** input commit thành công  
**When** resume  
**Then** phát versioned signal chứa job ID + opaque artifact ID, không transcript body  
**And** stable event ID chống resume trùng  
**And** candidate validation → normalization → canonical persistence → `checking_language`.

#### AC7 — Error correction in same job

**Given** parse/validation lỗi  
**When** UI hiển thị  
**Then** job vẫn `awaiting_user_input`  
**And** user sửa/chọn file khác không tạo job mới  
**And** stable errors gồm empty, unsupported, too large, parse failed, invalid timestamps và already used.

#### AC8 — Privacy, race and tests

**Given** temporary input hoặc concurrent submissions  
**When** process/cancel/cleanup  
**Then** only first valid input attaches, stale artifact is deleted, canonical data is owner-scoped/RLS-protected, logs omit content  
**And** tests cover parsers, security, MIME/size, rights, durable resume, concurrency, language gate and E2E correction.

## Story 2.8 — Tạo transcript từ audio của tab

**As a** người học không có transcript/subtitle,  
**I want** cho phép Vidlish thu audio của tab YouTube tôi chọn,  
**So that** hệ thống transcribe lời nói thật mà không lưu video.

**Requirements:** FR10, FR12, FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 · NFR1, NFR3–8, NFR12–16 · AD-4–8, AD-13–19 · ID-8 · UX-DR11–14, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Capability and consent

**Given** job chờ input  
**When** browser capability detection chạy  
**Then** `Ghi âm tab video` chỉ hiển thị khi supported  
**And** giải thích scope/start-stop/retention trước picker  
**And** không capture trước direct consent  
**And** unsupported browser vẫn có paste/upload.

#### AC2 — Tab selection and errors

**Given** user bắt đầu capture  
**When** browser picker mở  
**Then** user tự chọn YouTube tab và share audio  
**And** Vidlish không tự chọn tab.

**Given** denied/no-audio/ended stream  
**When** client phát hiện  
**Then** job vẫn recoverable với stable error  
**And** không tạo empty transcript hoặc unsupported-language result.

#### AC3 — Bounded private chunks

**Given** capture chạy  
**When** audio thu  
**Then** chia bounded chunks có session/sequence/duration/checksum  
**And** upload private authorized storage  
**And** không lưu video hoặc giữ blob lớn trong memory  
**And** retry cùng chunk ID deduplicate.

#### AC4 — Manifest and durable resume

**Given** capture stop/completed  
**When** manifest validate  
**Then** manifest thuộc đúng owner/job và có complete ordered chunk set  
**And** workflow resume bằng event chỉ chứa job/capture-session ID  
**And** STT không chạy trước manifest validation.

#### AC5 — Initial STT adapter

**Given** valid capture session  
**When** transcription chạy  
**Then** dùng `SpeechToTextProvider` initial Google Cloud STT V2 model `chirp_3` tại configured region  
**And** original-language transcription, bounded requests, exact model/location/version được ghi  
**And** no translation, summary, grammar correction hoặc English rewrite.

#### AC6 — Merge and canonical handoff

**Given** nhiều STT chunks  
**When** merge  
**Then** deterministic theo sequence/timestamp, overlap dedup versioned, gaps không được bịa  
**And** source `tab-audio-stt`  
**And** normalization → persistence → `checking_language`.

#### AC7 — Cleanup, reload and security

**Given** success/failure/cancel/TTL/reload  
**When** cleanup  
**Then** raw chunks/manifest bị xóa idempotently  
**And** reload dừng browser capture và cho start lại cùng job  
**And** no hidden recording  
**And** audio/transcript body không vào logs.

#### AC8 — Tests

**Given** Story 2.8 vào CI  
**When** suite chạy  
**Then** có capability, consent, permission, no-audio, stop/reload, chunk ordering/idempotency, manifest ownership, `chirp_3` fixture, merge, cleanup and language-gate tests  
**And** CI không capture/call live STT.

## Story 2.9 — Xử lý video dài bằng budget và chunking

**As a** người học dùng video dài,  
**I want** Vidlish chia công việc có kiểm soát và không cắt nội dung âm thầm,  
**So that** phạm vi xử lý luôn trung thực.

**Requirements:** FR6, FR12, FR31, FR32 · NFR7, NFR12, NFR15–17, NFR20 · AD-4, AD-9, AD-15–16, AD-19, AD-21 · UX-DR9–10, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Versioned budgets

**Given** long video/transcript  
**When** GenerationPolicy đánh giá  
**Then** không dùng một product duration cap cố định  
**And** dùng typed/versioned budgets cho characters/tokens, segments, chunks, requests, estimated cost và wall-clock.

#### AC2 — Deterministic chunk plan

**Given** source vượt một request  
**When** planner chạy  
**Then** chunk theo timestamps/semantic boundaries  
**And** mỗi chunk có stable ID, ordinal và source range  
**And** same input/policy version tạo same plan.

#### AC3 — No silent truncation

**Given** budget không đủ toàn bộ source  
**When** policy dừng/chọn phạm vi  
**Then** không claim toàn video được xử lý  
**And** partial source được đánh dấu/provenance rõ  
**And** không đi Lesson Engine như complete source nếu coverage không đủ.

#### AC4 — Merge coverage

**Given** chunk results  
**When** aggregate  
**Then** coverage tính từ canonical ranges  
**And** overlap/gap được phát hiện  
**And** missing coverage vượt threshold chặn handoff.

#### AC5 — Per-chunk retry/cache

**Given** workflow retry  
**When** chunk đã pass  
**Then** reuse persisted result bằng source hash + plan/provider/schema versions  
**And** không gọi lại expensive step không cần thiết.

#### AC6 — Honest UX and handoff

**Given** long-source processing  
**When** user theo dõi  
**Then** UI nói video đang được chia phần  
**And** không hứa 15 phút dạy toàn bộ video  
**And** eligible complete handoff giữ source hash, coverage, timing quality và allowed English set.

#### AC7 — Tests

**Given** Story 2.9 vào CI  
**When** suite chạy  
**Then** có budget, stable boundary, no-truncation, partial rejection, overlap/gap, per-chunk retry/cache and deterministic plan tests.

## Story 2.10 — Kiểm soát quota, retry, circuit breaker và cancellation

**As a** người học đang tạo bài,  
**I want** job chịu lỗi, không nhân chi phí và có thể hủy,  
**So that** tôi không bị kẹt hoặc bị gọi provider ngoài ý muốn.

**Requirements:** FR31–FR33 · NFR5–8, NFR12, NFR15–16 · AD-4, AD-14–16, AD-19, AD-21 · UX-DR5, UX-DR9–11, UX-DR27–28, UX-DR32.

### Acceptance Criteria

#### AC1 — Central GenerationPolicy

**Given** job/provider/AI stage sắp chạy  
**When** policy evaluate  
**Then** kiểm tra per-user/global concurrency, quota, rate limit, cost estimate, active jobs và stage budget trước expensive call  
**And** denial dùng stable ProductError  
**And** Inngest throttle chỉ defense in depth.

#### AC2 — Retry classification

**Given** timeout/rate-limit/network error  
**When** workflow xử lý  
**Then** bounded exponential retry với stable attempt ID  
**And** validation, permission, unsupported language, cancellation và policy denial không retry vô hạn.

#### AC3 — Circuit and provider fallback

**Given** provider lỗi lặp lại  
**When** circuit threshold đạt  
**Then** provider tạm ngừng theo configured window  
**And** registry thử strategy khác nếu hợp lệ  
**And** user-facing phase không lộ provider.

#### AC4 — End-to-end dedup

**Given** double submit, event redelivery, workflow retry hoặc provider poll retry  
**When** xử lý  
**Then** active-job key, stable event/attempt/step keys ngăn duplicate job/call/result  
**And** reload không tạo run mới.

#### AC5 — Cancellation

**Given** active job  
**When** authorized user chọn hủy  
**Then** cancel persisted idempotently  
**And** workflow kiểm tra trước expensive/publish step tiếp theo  
**And** không publish sau cancel  
**And** artifacts được đánh dấu cleanup  
**And** reload hiển thị `cancelled`.

#### AC6 — Actionable states

**Given** failure/cancel/needs action  
**When** UI render  
**Then** phân biệt exhausted methods, input required/invalid, capture/STT failure, budget exceeded, quota/rate limit, cancelled và unsupported language  
**And** mỗi state tối đa một primary action  
**And** raw provider error không lộ.

#### AC7 — Account quota summary

**Given** quota data tồn tại  
**When** account menu mở  
**Then** có compact quota summary phù hợp beta  
**And** không hiển thị fake precision hoặc billing UI ngoài scope  
**And** Story 1.1 vẫn độc lập khi data chưa tồn tại.

#### AC8 — Tests

**Given** Story 2.10 vào CI  
**When** suite chạy  
**Then** có quota/concurrency/cost-gate, retry classification, circuit, dedup, cancellation race/idempotency, account-summary and E2E cancel tests  
**And** dùng fakes.