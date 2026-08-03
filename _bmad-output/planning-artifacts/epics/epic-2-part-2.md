# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án (phần 2)

Companion tiếp nối `epic-2.md`, gồm Stories 2.4–2.6.

## Story 2.4 — Lấy transcript qua hosted generated-transcript provider

**As a** người học có video không có native caption,  
**I want** Vidlish thử một hosted transcription provider phía server,  
**So that** tôi vẫn có transcript mà chưa cần thao tác thủ công.

**Requirements:** FR8, FR10, FR12, FR13, FR31–FR33 · NFR1, NFR3, NFR5–9, NFR12, NFR15–18 · AD-4–7, AD-14–19, AD-21 · ID-5 · UX-DR9–11, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Registry integration

**Given** native caption strategy trả `NO_USABLE_CAPTIONS`  
**When** automatic registry tiếp tục  
**Then** gọi `TranscriptStrategy` ID `supadata-generated-transcript`  
**And** workflow/domain không hard-code Supadata SDK/shape  
**And** strategy chỉ đăng ký khi `SUPADATA_API_KEY` tồn tại và policy cho phép.

#### AC2 — Generated transcription request

**Given** strategy chạy  
**When** gọi Supadata  
**Then** dùng `mode=generate` với validated public video URL  
**And** không ép dịch sang English  
**And** transcript phải phản ánh ngôn ngữ được nói trong video  
**And** server-only credentials không lộ client.

#### AC3 — Async provider job

**Given** provider trả HTTP 202/job ID  
**When** workflow chờ result  
**Then** poll trong durable Inngest step với bounded interval/timeout  
**And** provider job ID chỉ nằm trong internal attempt metadata  
**And** reload browser không tạo provider job mới.

#### AC4 — Adapter boundary và provenance

**Given** provider result  
**When** adapter map  
**Then** Zod validate timestamped candidate/source/provider/request ID/declared language/confidence availability  
**And** raw response không đi vào domain/UI  
**And** empty no-speech result không tạo canonical transcript.

#### AC5 — Local failure behavior

**Given** timeout, rate-limit hoặc network error  
**When** local adapter policy xử lý  
**Then** trả retryable safe code với bounded adapter retry  
**And** schema/permission/unsupported-resource error không retry vô hạn  
**And** shared cross-provider retry/circuit/cost rules thuộc Story 2.10.

#### AC6 — Canonical pipeline

**Given** candidate success  
**When** workflow tiếp tục  
**Then** adapter validation → deterministic normalization → atomic canonical persistence → `checking_language`  
**And** provider không được tự đánh dấu English eligibility  
**And** duplicate hash không tạo transcript duplicate.

#### AC7 — UX, telemetry và security

**Given** hosted strategy chạy/fail  
**When** Generation page/logs cập nhật  
**Then** UI chỉ nói Vidlish đang thử cách khác để lấy lời thoại  
**And** không lộ Supadata/API errors  
**And** telemetry có strategy/result/latency/cost band nhưng không có transcript body  
**And** arbitrary remote URL/SSRF path bị chặn.

#### AC8 — Tests

**Given** Story 2.4 vào CI  
**When** suite chạy  
**Then** có adapter contract, 200/202 polling, disabled-without-key, timeout/error mapping, no-translation prompt/behavior, dedup và canonical-pipeline tests  
**And** CI dùng fixtures.

## Story 2.5 — Tích hợp unofficial extractor theo policy

**As a** product team vận hành private beta,  
**I want** một unofficial transcript strategy chỉ tồn tại sau explicit approval,  
**So that** coverage có thể mở rộng mà không âm thầm chấp nhận legal/maintenance risk.

**Requirements:** FR9, FR12, FR13, FR31–FR33 · NFR1, NFR3, NFR6–9, NFR15–18, NFR21 · AD-5–7, AD-14–19 · ID-9 · UX-DR9–11, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Default blocked state

**Given** repository và mọi environment mặc định  
**When** registry khởi tạo  
**Then** unofficial strategy không được đăng ký/call  
**And** `ENABLE_UNOFFICIAL_TRANSCRIPT_STRATEGIES` mặc định false  
**And** Story 2/private-beta acceptance không phụ thuộc story này.

#### AC2 — Approval prerequisites

**Given** team muốn bật strategy  
**When** implementation bắt đầu  
**Then** phải có explicit legal/policy approval record  
**And** exact package/service/version và owner được ghi trong implementation decision update  
**And** nếu thiếu bất kỳ prerequisite nào, story giữ trạng thái blocked chứ không chọn package tùy ý.

#### AC3 — Port isolation

**Given** approved implementation tồn tại  
**When** adapter chạy  
**Then** nằm sau `TranscriptStrategy`  
**And** response qua Zod canonical candidate  
**And** provider/package change không đổi domain contract  
**And** source được đánh dấu policy class `restricted`.

#### AC4 — Safety and failure

**Given** extractor request  
**When** chạy  
**Then** có timeout, bounded retry, validated video ID và no arbitrary endpoint  
**And** translated/generated English không được coi là source speech  
**And** failure không chặn strategy khác.

#### AC5 — Environment control

**Given** public production  
**When** deploy  
**Then** strategy vẫn disabled trừ khi production-specific legal approval/config tồn tại  
**And** staging/local flags không tự lan sang production.

#### AC6 — Observability and tests

**Given** strategy được bật trong approved environment  
**When** attempt chạy  
**Then** telemetry ghi restricted policy class/result/version mà không log transcript body  
**And** tests chứng minh default-off, missing-approval block, contract isolation, safe failure và production isolation.

Story 2.5 là optional/risk-gated. Nó không chặn các stories tiếp theo.

## Story 2.6 — Tạo transcript từ public YouTube URL bằng Gemini

**As a** người học có video không lấy được transcript qua caption/hosted path,  
**I want** Vidlish thử transcription trực tiếp từ public YouTube URL,  
**So that** tôi có thêm một automatic fallback trước khi phải cung cấp input.

**Requirements:** FR10, FR12, FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 · NFR1, NFR3, NFR5–9, NFR12, NFR15–18 · AD-4–7, AD-11, AD-14–19, AD-21 · ID-7 · UX-DR9–11, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Feature-gated strategy

**Given** hosted paths không thành công  
**When** automatic registry tiếp tục  
**Then** gọi strategy `gemini-public-youtube-transcription` chỉ khi `GEMINI_API_KEY` và feature flag tồn tại  
**And** exact model ID là `gemini-3.6-flash`  
**And** không dùng `*-latest` alias.

#### AC2 — Validated public URL only

**Given** strategy request  
**When** adapter chuẩn bị Gemini input  
**Then** chỉ dùng canonical public YouTube URL/video ID đã qua Story 1.2  
**And** không nhận arbitrary URL từ client  
**And** private/unlisted/restricted resource failure map an toàn.

#### AC3 — Verbatim original-language contract

**Given** prompt/output schema  
**When** provider chạy  
**Then** yêu cầu transcript lời nói gốc, segment timing khi supportable và no translation  
**And** cấm summary, paraphrase, grammar correction, English rewrite, dubbing và invented timestamp  
**And** model instructions không cho source transcript điều khiển tools/policy.

#### AC4 — Output integrity

**Given** Gemini output  
**When** adapter validate  
**Then** candidate có source `gemini-url-stt`, exact model/prompt/schema versions và optional confidence/timing quality  
**And** không mặc định confidence 1.0  
**And** output thiếu timing/cấu trúc cần thiết fail safely.

#### AC5 — Preview-risk isolation

**Given** public YouTube URL capability là provider feature có thể thay đổi  
**When** adapter lỗi/không còn support  
**Then** domain/workflow contract không đổi  
**And** strategy trả stable result để registry tiếp tục user-input/tab-audio path  
**And** provider-specific detail chỉ ở redacted logs.

#### AC6 — Cost and retry boundary

**Given** strategy tốn tiền  
**When** chuẩn bị call  
**Then** GenerationPolicy kiểm tra configured quota/cost allowance trước request  
**And** local timeout/bounded retry áp dụng  
**And** shared circuit/retry/cancellation behavior thuộc Story 2.10.

#### AC7 — Canonical and language gates

**Given** candidate hợp lệ  
**When** workflow tiếp tục  
**Then** normalize/persist rồi chạy Story 2.3 language gate  
**And** Gemini không được tự kết luận source English  
**And** translated/generated output bị validators từ chối.

#### AC8 — UX, telemetry and tests

**Given** strategy chạy/fail  
**When** user/logs cập nhật  
**Then** UI vẫn ở `Lấy hoặc tạo transcript`, không hiện Gemini  
**And** telemetry có model/result/latency/token/cost band nhưng không full transcript/prompt  
**And** fixture tests bao phủ disabled key, exact model, no-translation, invalid output, preview failure, canonical pipeline và language gate.

Story 2.6 kết thúc bằng canonical transcript tại `checking_language` hoặc registry tiếp tục fallback khác.