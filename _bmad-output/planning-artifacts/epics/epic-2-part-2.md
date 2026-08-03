# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án (phần 2)

Companion tiếp nối `epic-2.md`, bắt đầu từ Story 2.4.

## Story 2.4 — Thử các transcript provider phía server

**As a** người học có video không lấy được caption bằng fast path,  
**I want** Vidlish tự thử các phương án transcript phía server theo thứ tự an toàn,  
**So that** tôi vẫn có cơ hội tạo transcript mà không phải thao tác thủ công ngay lập tức.

**Requirements:** FR8, FR9, FR10, FR12, FR13, FR31–FR33 · NFR1, NFR3, NFR5–9, NFR12, NFR15–18 · AD-4–7, AD-9, AD-11, AD-14–19, AD-21 · UX-DR9–11, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Ordered strategy registry

**Given** caption fast path trả `NO_USABLE_CAPTIONS` hoặc lỗi không terminal  
**When** workflow tiếp tục acquisition  
**Then** `TranscriptAcquisitionService` chạy các strategy đang được bật theo thứ tự cấu hình: hosted transcript provider → policy-gated unofficial extractor → Gemini URL/audio transcription  
**And** workflow không hard-code vendor cụ thể  
**And** mỗi strategy khai báo stable ID, source class, policy class, permission requirement, estimated cost class và enabled state  
**And** thứ tự strategy được quản lý bằng typed config.

#### AC2 — Canonical strategy result

**Given** một strategy được gọi  
**When** nó hoàn tất  
**Then** kết quả thuộc versioned contract `success`, `not_applicable`, `retryable_failure` hoặc `terminal_failure`  
**And** raw provider responses không đi qua application boundary  
**And** mọi success candidate được Zod validate trước normalization.

#### AC3 — Hosted transcript provider

**Given** hosted provider được cấu hình và hỗ trợ video  
**When** strategy chạy  
**Then** request được gửi hoàn toàn từ server  
**And** provider credentials không xuất hiện trong browser  
**And** adapter giữ provenance gồm strategy ID, provider ID, provider request ID, track/source type, declared language, timing availability và confidence khi có  
**And** provider trả caption tiếng Anh được dịch từ ngôn ngữ khác không được đánh dấu là original English  
**And** translated track bị loại khỏi English-source eligibility.

#### AC4 — Unofficial extractor theo policy

**Given** unofficial extractor được cài đặt  
**When** `ENABLE_UNOFFICIAL_TRANSCRIPT_STRATEGIES=false`  
**Then** strategy không được đăng ký hoặc gọi  
**And** không có silent fallback sang extractor.

**Given** feature flag được bật trong private beta  
**When** extractor chạy  
**Then** nó vẫn nằm sau `TranscriptStrategy` port  
**And** có timeout, bounded retry và response validation  
**And** provider thay đổi hoặc hỏng không buộc domain contract thay đổi  
**And** telemetry ghi policy class `restricted`  
**And** public production không tự động bật strategy này nếu chưa có legal/policy approval.

#### AC5 — Gemini URL/audio transcription strategy

**Given** caption-based strategies không tạo được transcript  
**When** Gemini transcription strategy được bật và `GenerationPolicy` cho phép  
**Then** server có thể yêu cầu provider phân tích audio gốc từ public YouTube source  
**And** output phải là transcript của lời nói thực sự trong video  
**And** không được yêu cầu provider dịch lời nói sang tiếng Anh  
**And** không được tạo English rewrite, summary hoặc dubbed transcript  
**And** candidate source được ghi là `gemini-url-stt`  
**And** model/configuration được lưu theo exact model ID, không dùng alias `*-latest`.

#### AC6 — Timestamp và transcript integrity

**Given** STT provider trả transcript  
**When** candidate được tạo  
**Then** mỗi segment phải có timestamp đủ dùng cho canonical transcript  
**And** adapter không được bịa timestamp chính xác khi provider không cung cấp bằng chứng phù hợp  
**And** nội dung không được tự sửa grammar, paraphrase hoặc điền từ bị thiếu  
**And** confidence không được mặc định thành `1.0`.

**Given** output không đủ cấu trúc hoặc timing để tạo canonical transcript  
**When** validation chạy  
**Then** strategy trả failure an toàn  
**And** không persist transcript không đạt contract.

#### AC7 — Cost gate trước strategy tốn tiền

**Given** strategy có estimated cost class khác `free`  
**When** workflow chuẩn bị gọi provider  
**Then** `GenerationPolicy` kiểm tra account quota, per-job estimated cost, provider request budget, active concurrency và video size/duration information hiện có  
**And** khi policy từ chối, provider không được gọi  
**And** attempt được ghi với safe result `STRATEGY_SKIPPED_BY_COST_POLICY`  
**And** exact long-video budgeting được hoàn thiện trong Story 2.7.

#### AC8 — Timeout, retry và circuit breaker

**Given** provider timeout, rate limit hoặc lỗi mạng tạm thời  
**When** strategy thất bại  
**Then** workflow dùng bounded exponential retry theo config  
**And** không retry lỗi validation hoặc quyền truy cập terminal  
**And** một provider đang lỗi lặp lại có thể bị circuit breaker tạm ngừng  
**And** registry tiếp tục strategy kế tiếp khi policy cho phép  
**And** retry cùng attempt không tạo transcript hoặc provider job trùng ngoài ý muốn.

#### AC9 — Không để một provider chặn toàn bộ waterfall

**Given** hosted provider trả `not_applicable` hoặc hết retry  
**When** strategy kế tiếp đang được bật  
**Then** workflow tiếp tục extractor hoặc STT strategy  
**And** job vẫn ở user-facing phase `Lấy hoặc tạo transcript`  
**And** UI không hiện tên provider hoặc lỗi kỹ thuật.

**Given** một strategy trả terminal failure chỉ áp dụng riêng cho strategy đó  
**When** strategy khác vẫn có thể chạy  
**Then** toàn bộ job chưa bị đánh dấu failed  
**And** chỉ lỗi cấp video, quyền hoặc policy thực sự không thể phục hồi mới được phép dừng toàn bộ acquisition.

#### AC10 — Acquisition attempt provenance

**Given** mỗi strategy được thử  
**When** attempt hoàn tất  
**Then** `transcript_acquisition_attempts` lưu job ID, strategy ID, provider ID, policy class, attempt number, result code, timestamps, latency, optional estimated cost và optional provider request ID  
**And** không lưu raw transcript body hoặc raw provider payload trong attempt log  
**And** provider request ID chỉ hiển thị trong internal diagnostics.

#### AC11 — Success đi qua cùng canonical pipeline

**Given** bất kỳ server strategy nào trả success  
**When** workflow nhận candidate  
**Then** candidate đi qua Zod adapter validation → deterministic normalization → canonical transcript persistence → `checking_language`  
**And** không có strategy nào được bỏ qua normalization hoặc language eligibility  
**And** không có provider nào được trực tiếp đánh dấu video `eligible`  
**And** Story 2.3 là nguồn quyết định duy nhất về đủ tiếng Anh gốc.

#### AC12 — Idempotency và transcript deduplication

**Given** workflow retry hoặc hai strategy trả cùng nội dung transcript  
**When** normalization tạo cùng hash  
**Then** hệ thống không tạo canonical transcript trùng  
**And** vẫn giữ acquisition attempts riêng để truy vết  
**And** job chỉ liên kết với một transcript result được chọn  
**And** lựa chọn result tuân theo deterministic priority và quality policy, không phụ thuộc strategy nào trả về nhanh hơn do race condition.

#### AC13 — Khi automatic strategies cạn

**Given** toàn bộ automatic server strategies đều `not_applicable`, failed after bounded retry, disabled by policy hoặc không được cấu hình  
**When** registry kết thúc  
**Then** không trả `VIDEO_LANGUAGE_UNSUPPORTED` vì chưa có transcript để kiểm tra ngôn ngữ  
**And** không đề xuất dịch video  
**And** trong phạm vi Story 2.4, job kết thúc an toàn với `TRANSCRIPT_AUTOMATIC_METHODS_EXHAUSTED`  
**And** thông báo cho biết Vidlish chưa thể tự tạo transcript từ video này  
**And** người dùng có thể thử lại hoặc chọn video khác  
**And** Story 2.5 và 2.6 có thể thay terminal handoff này bằng user-provided và tab-audio fallback mà không thay đổi strategy contract.

#### AC14 — Generation UX

**Given** workflow chuyển qua nhiều automatic strategies  
**When** người dùng theo dõi job  
**Then** UI vẫn chỉ hiển thị `Lấy hoặc tạo transcript`  
**And** có thể dùng copy bình tĩnh `Vidlish đang thử một cách khác để lấy lời thoại từ video.`  
**And** không hiển thị tên vendor, unofficial extractor, Gemini, retry count kỹ thuật hoặc API error  
**And** fallback transition có warning semantics nhưng không dùng màu làm tín hiệu duy nhất.

#### AC15 — Bảo mật

**Given** provider request được tạo  
**When** server gửi request  
**Then** API key và provider credentials chỉ được lấy từ typed server config  
**And** không nhận arbitrary provider URL từ client  
**And** public YouTube URL/video ID được validate trước khi dùng  
**And** redirect và remote-resource behavior phải chống SSRF  
**And** raw provider response không được render trực tiếp ra UI.

#### AC16 — Telemetry và chi phí

**Given** strategy attempt hoàn tất  
**When** telemetry được ghi  
**Then** lưu strategy/provider ID, result code, latency, retry count, cost estimate, transcript segment count khi thành công, duration coverage, source/confidence summary và circuit-breaker state  
**And** không log transcript text, API keys hoặc full request body  
**And** metrics cho phép so sánh coverage, cost và reliability giữa các strategy.

#### AC17 — Kiểm thử

**Given** Story 2.4 được đưa vào CI  
**When** test suite chạy  
**Then** có adapter contract test cho hosted provider  
**And** feature-flag test chứng minh unofficial extractor mặc định bị tắt  
**And** có test policy class/legal flag của unofficial strategy  
**And** Gemini fixture chứng minh output là transcription, không phải translation  
**And** mọi success result đều đi qua normalization và language eligibility  
**And** retryable failure chuyển sang strategy kế tiếp  
**And** circuit breaker ngăn provider lỗi bị gọi liên tục  
**And** cost gate chặn request trước provider call  
**And** dedup hoạt động khi hai strategy tạo cùng transcript hash  
**And** all-strategies-exhausted không trả `VIDEO_LANGUAGE_UNSUPPORTED`  
**And** CI chỉ dùng fixtures/fakes, không gọi provider thật.

Story 2.4 hoàn tất với `automatic strategy success → canonical transcript → checking_language` hoặc `automatic strategies exhausted → TRANSCRIPT_AUTOMATIC_METHODS_EXHAUSTED`.
