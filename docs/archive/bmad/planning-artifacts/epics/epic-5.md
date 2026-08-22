# Epic 5 — Quay lại và quản lý thư viện bài học

Người học có thể xem lesson/job theo trạng thái, mở lại không gọi provider, khôi phục job recoverable và xóa dữ liệu theo retention policy.

**FRs covered:** FR40, FR41.  
**Dependency:** immutable published lesson (Story 3.6) và readable viewer (Story 3.7). Epic 5 không hard-depend on Epic 4; completion metadata có thể null.

## Story 5.1 — Xem thư viện và mở lại lesson đã lưu

**As a** người học đã tạo bài,  
**I want** xem lesson và job của mình trong thư viện,  
**So that** tôi quay lại đúng nội dung mà không tạo lại.

**Requirements:** FR40, FR41 · NFR2, NFR7, NFR11, NFR13–16 · AD-2, AD-12–16, AD-19 · UX-DR5, UX-DR25, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Owner-scoped library

**Given** authenticated user mở `/library`  
**When** server query  
**Then** chỉ trả records thuộc user  
**And** gồm published lessons và jobs active/awaiting/failed theo policy  
**And** cross-owner title/count/timing không lộ.

#### AC2 — Canonical item fields

**Given** library có data  
**When** row/card render  
**Then** hiển thị safe thumbnail/title/channel, CEFR, created/updated, canonical status và completion khi có  
**And** mỗi item có một primary action phù hợp state.

#### AC3 — Reopen published lesson

**Given** item là published lesson  
**When** mở  
**Then** tới `/lessons/{id}` và đọc immutable saved version  
**And** không gọi transcript/STT/Gemini/Lesson Engine hoặc tạo job  
**And** attempt/completion state được khôi phục khi tồn tại.

#### AC4 — Reopen job states

**Given** item active  
**When** mở  
**Then** tới `/jobs/{id}` và polling persisted state, không resubmit create.

**Given** item `awaiting_user_input`  
**When** mở  
**Then** restore exact paste/upload/capture fallback của same job.

**Given** failed  
**When** render  
**Then** hiển thị Vietnamese ProductError/safe action, không raw provider detail.

#### AC5 — Empty, pagination and performance

**Given** library rỗng  
**When** render  
**Then** có `Chưa có bài học` + primary action `Tạo bài học`.

**Given** nhiều items  
**When** query  
**Then** cursor pagination và stable reverse-chronological sort  
**And** main data target khoảng 3 giây ở điều kiện bình thường  
**And** caching owner-safe.

#### AC6 — Responsive/accessibility

**Given** desktop/mobile/keyboard user  
**When** library hoạt động  
**Then** responsive list/cards, visible focus, labels, 44px targets, accessible truncation và no color-only status.

#### AC7 — Tests

**Given** Story 5.1 vào CI  
**When** suite chạy  
**Then** có RLS/cross-owner, reopen-no-provider, active/awaiting/failed/empty, pagination, performance-budget, accessibility and E2E completed lesson→library→reopen tests.

## Story 5.2 — Lọc thư viện và khôi phục job lỗi

**As a** người học có nhiều lesson/job,  
**I want** lọc theo trạng thái và thử lại job recoverable,  
**So that** tôi nhanh chóng tiếp tục đúng việc.

**Requirements:** FR41 · NFR2, NFR5, NFR7, NFR11, NFR13–16 · AD-2–5, AD-14–16, AD-19, AD-21 · UX-DR25, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Canonical filters

**Given** library có nhiều state  
**When** filter render  
**Then** hỗ trợ All, Ready, In progress, Needs action, Failed, Completed  
**And** filter phản ánh trong validated URL/query  
**And** unknown value normalize default.

#### AC2 — Owner-safe query

**Given** filter/sort/pagination request  
**When** server xử lý  
**Then** input qua schema  
**And** query owner-scoped và stable  
**And** UI mapping dùng canonical job state contract, không string tự phát.

#### AC3 — Filter UX

**Given** user đổi filter  
**When** results load/error/empty  
**Then** giữ filter context và logical focus  
**And** mobile controls accessible  
**And** loading không reset selection vô lý.

#### AC4 — Retry authorization and policy

**Given** failed job có `retryable: true`  
**When** user chọn `Thử lại`  
**Then** server kiểm tra ownership, current/terminal state, retry budget, quota, concurrency và pipeline compatibility  
**And** retry dùng same job hoặc explicit versioned retry relation  
**And** double submit không tạo provider call trùng.

#### AC5 — Non-retryable/stale cases

**Given** `VIDEO_LANGUAGE_UNSUPPORTED`  
**When** render  
**Then** không có `Thử lại`; sole primary action `Chọn video khác` và no translation mode.

**Given** pipeline/schema quá cũ  
**When** retry requested  
**Then** giải thích cần tạo job mới  
**And** không chạy incompatible contract  
**And** saved lesson cũ vẫn mở được.

#### AC6 — Retry recovery and telemetry

**Given** retry accepted  
**When** workflow resume  
**Then** job URL/state hoặc retry relation hiển thị rõ và reload-safe  
**And** diagnostics/provenance cũ không bị xóa  
**And** telemetry chỉ ghi safe state/action/result/latency.

#### AC7 — Tests

**Given** Story 5.2 vào CI  
**When** suite chạy  
**Then** có filter/query, pagination, retry quota/idempotency, unsupported-language, stale-version, cross-owner, accessibility and E2E needs-action→resume tests.

## Story 5.3 — Xóa lesson và dữ liệu phụ thuộc theo policy

**As a** người học,  
**I want** xóa lesson/job mình không cần,  
**So that** tôi kiểm soát dữ liệu cá nhân và thư viện gọn.

**Requirements:** FR41 · NFR2–4, NFR7, NFR13–15, NFR19, NFR21 · AD-2, AD-8, AD-12–13, AD-20 · UX-DR26–28, UX-DR32.

### Acceptance Criteria

#### AC1 — Explicit destructive confirmation

**Given** user chọn xóa lesson/job  
**When** dialog mở  
**Then** nêu resource/dependent data sẽ bị xóa hoặc giữ theo policy  
**And** confirm có nhãn cụ thể  
**And** Cancel được focus ưu tiên, Esc/close trả focus trigger.

#### AC2 — Published lesson deletion

**Given** owner xác nhận xóa lesson  
**When** deletion workflow chạy  
**Then** authorize server-side  
**And** lesson pointer/version visibility, attempts, completion và reflections được purge/tombstone theo policy  
**And** transcript/video metadata chỉ xóa khi không còn dependency  
**And** operation idempotent.

#### AC3 — Active job deletion

**Given** user xóa active job  
**When** workflow chạy  
**Then** cancel trước, không gọi provider/publish mới  
**And** temporary artifacts enqueue cleanup  
**And** UI phân biệt pending vs complete.

#### AC4 — Failure-safe tombstone

**Given** dependency cleanup thất bại  
**When** delete process kết thúc tạm thời  
**Then** không tuyên bố success sai  
**And** resource chuyển pending-deletion/tombstone  
**And** background retry/telemetry tiếp tục  
**And** item không mở như usable lesson.

#### AC5 — Ownership and irreversible boundary

**Given** user A gửi ID user B  
**When** delete/read xử lý  
**Then** không tiết lộ tồn tại và không mutate  
**And** service role chỉ dùng trong authorized workflow.

**Given** irreversible purge qua  
**When** UI phản hồi  
**Then** không hứa restore nếu không thể  
**And** backup/restore process tôn trọng privacy purge policy.

#### AC6 — Temporary audio and telemetry

**Given** raw temporary audio tồn tại  
**When** lesson/job delete  
**Then** cleanup yêu cầu ngay và TTL sweeper defense in depth  
**And** temporary audio không vào lesson archive  
**And** logs chỉ có safe IDs/transition/result/latency/cleanup status.

#### AC7 — Tests

**Given** Story 5.3 vào CI  
**When** suite chạy  
**Then** có confirmation/cancel, dependency deletion, active-job cancel, partial cleanup/tombstone, idempotency, RLS, retention, accessibility and E2E success/pending/failure-safe tests.

Epic 5 hoàn tất khi user có owner-scoped Library để mở lại, lọc, recover và xóa dữ liệu mà không regeneration ngoài ý muốn.