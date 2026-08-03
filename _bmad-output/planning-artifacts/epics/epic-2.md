# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án

Người dùng tạo được một generation job bền vững; Vidlish thử các transcript strategies, chuẩn hóa lời nói gốc, kiểm tra ngôn ngữ và chỉ chuyển sang Lesson Engine khi có đủ original English speech.

**FRs covered:** FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5.  
**Implementation authority:** Architecture spine, Language Eligibility Amendment và `IMPLEMENTATION-DECISIONS.md`.

## Story 2.1 — Tạo generation job bền vững

**As a** người học đã xác nhận video và CEFR,  
**I want** tạo một generation job có URL và trạng thái được lưu,  
**So that** reload, retry hoặc double-submit không làm mất tiến trình hay tạo chi phí trùng.

**Requirements:** FR31–FR33 · NFR2, NFR5, NFR7, NFR12, NFR15–16 · AD-2–5, AD-13–16, AD-21 · UX-DR9, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Create command và redirect

**Given** authenticated beta user có validated `videoId`, `cefrLevel`, `metadataVersion`  
**When** chọn `Tạo bài học`  
**Then** server revalidate session, beta access, video và CEFR  
**And** persist job trước mọi transcript/AI provider call  
**And** trả opaque `jobId` và chuyển tới `/jobs/{jobId}`.

#### AC2 — Entity timing

**Given** Story 2.1 migration  
**When** áp dụng  
**Then** tạo/reuse `videos`, tạo `lesson_jobs` và persistence cần thiết cho workflow dispatch/audit  
**And** chưa tạo Transcript, Lesson hoặc Activity entities  
**And** mọi owner-scoped table bật RLS.

#### AC3 — Canonical lifecycle

**Given** job state contract  
**When** schema/domain/UI mapping được khai báo  
**Then** dùng canonical states:

```text
queued
validating_video
acquiring_transcript
awaiting_user_input
normalizing_transcript
checking_language
analyzing_video
mining_language
planning_lesson
composing_activities
validating_lesson
repairing_lesson
publishing
completed
failed
cancelled
```

**And** database, workflow và UI dùng cùng versioned enum.

#### AC4 — Idempotency và concurrency

**Given** cùng owner + video + CEFR + pipeline version có active job  
**When** create command được gửi lại hoặc hai request chạy đồng thời  
**Then** trả existing job  
**And** database constraint/transaction ngăn duplicate record và workflow.

#### AC5 — GenerationPolicy

**Given** create request  
**When** policy chạy  
**Then** kiểm tra beta access, active concurrency, rate limit và configured quota  
**And** denial không persist/dispatch job mới  
**And** trả stable error như `JOB_CONCURRENCY_LIMIT`, `ACCOUNT_QUOTA_EXCEEDED` hoặc `RATE_LIMITED`.

#### AC6 — Durable workflow dispatch

**Given** job commit thành công  
**When** dispatch  
**Then** phát `lesson.generation-requested.v1` với minimal payload  
**And** stable event ID derive từ job/pipeline version  
**And** dispatch failure giữ job ở `queued` để retry an toàn  
**And** Inngest concurrency key là `jobId`, limit một.

#### AC7 — Workflow ownership

**Given** workflow chạy  
**When** status/stage thay đổi  
**Then** chỉ `GenerateLessonWorkflow` được advance lifecycle  
**And** HTTP handlers chỉ create/read/cancel/attach input  
**And** Story 2.1 kết thúc ở durable `acquiring_transcript` chưa gọi provider.

#### AC8 — Generation page

**Given** owner mở `/jobs/{jobId}`  
**When** page render/poll  
**Then** đọc persisted state, video, CEFR và 8 learner-facing phases  
**And** reload/offline/reopen khôi phục cùng job  
**And** cross-owner request không tiết lộ resource tồn tại.

#### AC9 — Product errors, telemetry và accessibility

**Given** create/workflow failure hoặc stage update  
**When** UI/telemetry xử lý  
**Then** ProductError có code, Vietnamese copy, retryability và optional safe action  
**And** logs không chứa token, secrets, transcript hoặc raw URL query  
**And** stepper/loading/offline states dùng text/icon, visible focus, controlled `aria-live` và 44px targets.

#### AC10 — Tests

**Given** Story 2.1 vào CI  
**When** suite chạy  
**Then** có unit, transaction/concurrency, RLS, Inngest event-id, dispatch-retry, cross-owner và E2E create→redirect→reload tests  
**And** không gọi live providers.

## Story 2.2 — Lấy caption gốc và tạo canonical transcript

**As a** người học có video với caption dùng được,  
**I want** Vidlish lấy caption và chuẩn hóa thành transcript thống nhất,  
**So that** flow tiếp tục nhanh mà không cần input thủ công.

**Requirements:** FR7, FR12, FR13 · NFR2, NFR3, NFR6–9, NFR15–16 · AD-2–7, AD-13–17, AD-19 · ID-4 · UX-DR9–11, UX-DR20, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Initial caption strategy

**Given** job ở `acquiring_transcript`  
**When** caption fast path chạy  
**Then** gọi `TranscriptStrategy` ID `supadata-native-caption`  
**And** adapter dùng Supadata `mode=native`, timestamped chunks (`text=false`)  
**And** không ép `lang=en`, không gọi translation endpoint  
**And** disabled/config error map an toàn.

#### AC2 — Source preference và provenance

**Given** nhiều native tracks  
**When** chọn nguồn  
**Then** ưu tiên manual original track trước auto original track khi metadata cho phép  
**And** translated English track không được coi là original English  
**And** source/provider/track/declared language/confidence uncertainty được giữ.

#### AC3 — No-caption semantics

**Given** không có native caption dùng được  
**When** strategy kết thúc  
**Then** trả `not_applicable: NO_USABLE_CAPTIONS`  
**And** không tạo transcript rỗng  
**And** không trả `VIDEO_LANGUAGE_UNSUPPORTED`  
**And** workflow có thể thử strategy kế tiếp.

#### AC4 — Candidate boundary

**Given** provider trả dữ liệu  
**When** adapter map  
**Then** Zod validate canonical candidate gồm source, declared language, `isTranslated`, timestamp/text và optional confidence  
**And** raw provider payload không đi vào domain/persistence/UI.

#### AC5 — Deterministic normalization

**Given** candidate hợp lệ  
**When** normalize  
**Then** chuẩn hóa Unicode/whitespace, sort timestamp, loại empty/exact duplicate/corrupt, validate ranges  
**And** không sửa grammar, paraphrase, dịch hoặc bịa thiếu  
**And** cùng input + normalization version tạo cùng hash.

#### AC6 — Stable segments và transcript contract

**Given** normalized transcript  
**When** canonical artifact được tạo  
**Then** mỗi segment có stable ID, position, start/end, text, optional confidence/detected language  
**And** transcript lưu owner, video, source type/provider, declared language, hash và normalization version  
**And** không có transcript-level `language: en` trước Story 2.3.

#### AC7 — Atomic persistence và retry

**Given** artifact hợp lệ  
**When** commit  
**Then** transcript, segments và acquisition attempt được persist atomically  
**And** retry/dedup key ngăn duplicate  
**And** chỉ sau commit workflow chuyển `normalizing_transcript → checking_language`.

#### AC8 — Security, UX và telemetry

**Given** acquisition/normalization chạy  
**When** user theo dõi/logs ghi  
**Then** UI chỉ hiện `Lấy hoặc tạo transcript` rồi `Kiểm tra tiếng Anh`  
**And** logs chỉ có safe strategy/result/count/duration/latency metadata  
**And** không có transcript body/raw payload  
**And** RLS chặn cross-owner read/write.

#### AC9 — Tests

**Given** Story 2.2 vào CI  
**When** suite chạy  
**Then** có native adapter fixture, translated-track rejection, normalization/hash/segment-ID, atomic persistence, retry/RLS và state-transition tests  
**And** `NO_USABLE_CAPTIONS` không thành unsupported language.

## Story 2.3 — Kiểm tra video có đủ tiếng Anh gốc

**As a** người học đang chờ tạo bài,  
**I want** Vidlish xác nhận video có đủ original English speech,  
**So that** bài học chỉ dựa trên tiếng Anh thực sự được nói trong nguồn.

**Requirements:** FR-LANG-1–FR-LANG-5, FR32, FR33 · NFR8, NFR9, NFR15–17 · AD-3, AD-7, AD-10, AD-14 · Architecture Language Eligibility Amendment · AR7, AR13, AR14, AR22 · ID-6 · UX-DR9–12, UX-DR20, UX-DR27, UX-DR31–32.

### Acceptance Criteria

#### AC1 — Mandatory gate position

**Given** canonical transcript commit thành công  
**When** workflow tới `checking_language`  
**Then** gate chạy trước `analyzing_video` và mọi Lesson Engine/provider generation stage  
**And** CI chứng minh Lesson Engine fixture không được gọi trước pass.

#### AC2 — Initial language adapter

**Given** transcript segments  
**When** language analysis chạy  
**Then** `FrancLanguageAnalysisAdapter` dùng exact `franc-min@6.2.0` sau `LanguageAnalysisPort`  
**And** phân tích coherent windows/segment groups  
**And** `eng` map `en`, ambiguous/short result map `und`/low reliability  
**And** Franc ranking không được trình bày như calibrated probability.

#### AC3 — Versioned eligibility report

**Given** detector results  
**When** evaluator chạy  
**Then** report liên kết transcript hash, detector version và policy version  
**And** eligible report có English segment IDs, excluded IDs, English share, coherent duration, reliable word count và confidence band  
**And** ineligible report có stable reason/detected languages.

#### AC4 — Sufficient-English policy

**Given** transcript  
**When** quyết định eligibility  
**Then** xét đồng thời English share, absolute coherent English duration, reliable words, transcript/detector reliability và evidence usability  
**And** isolated words, names, brands hoặc short code-switch không đủ  
**And** thresholds nằm trong typed versioned config.

#### AC5 — Mixed-language boundary

**Given** video mixed-language  
**When** English portion tự nó đủ  
**Then** result `eligible` và chỉ permitted English segment IDs đi downstream  
**And** non-English segments chỉ giữ context/traceability, không dùng cho English quote, grammar, listening hoặc scored evidence.

#### AC6 — Eligible handoff

**Given** report `eligible`  
**When** commit  
**Then** persist owner-scoped eligible set  
**And** workflow chuyển `checking_language → analyzing_video`  
**And** retry với cùng keys deterministic/idempotent.

#### AC7 — Unsupported-language terminal state

**Given** insufficient original English được xác nhận tin cậy  
**When** evaluator kết thúc  
**Then** job fail closed trước Lesson Engine với:

```text
code: VIDEO_LANGUAGE_UNSUPPORTED
action: choose_another_video
retryable: false
```

**And** UI hiển thị preferred Vietnamese message và sole primary action `Chọn video khác`  
**And** không có translation mode, dubbing hoặc generated-English substitute.

#### AC8 — Low-confidence distinction

**Given** transcript/detection quá yếu  
**When** evaluator không thể kết luận tin cậy  
**Then** không giả định English và không phát unsupported-language conclusion chỉ vì acquisition kém  
**And** workflow có thể yêu cầu transcript method tốt hơn theo registry/policy.

#### AC9 — Security, telemetry và tests

**Given** eligibility chạy  
**When** persist/log/test  
**Then** RLS bảo vệ report/segment set, browser không sửa result  
**And** telemetry không chứa segment text  
**And** fixtures bao phủ fully English, incidental non-English, coherent mixed-language, incidental-English-only, non-English, translated-caption và low-confidence cases.

Story 2.3 kết thúc tại `eligible → analyzing_video`, recoverable low-confidence state, hoặc terminal `VIDEO_LANGUAGE_UNSUPPORTED`.