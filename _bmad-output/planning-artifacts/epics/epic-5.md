# Epic 5 — Quay lại và quản lý thư viện bài học

Người dùng có thể xem lesson/job theo trạng thái, mở lại không gọi AI, khôi phục job lỗi và xóa lesson cùng dữ liệu phụ thuộc theo retention policy.

**FRs covered:** FR40, FR41.

## Story 5.1 — Xem thư viện và mở lại lesson đã lưu

**As a** người học đã tạo bài,
**I want** xem lesson và job của mình trong thư viện,
**So that** tôi quay lại học mà không nhớ URL hoặc tạo lại bài.

**Requirements:** FR40, FR41 · NFR2, NFR7, NFR11, NFR13–16 · AR3–5, AR18, AR23–24, AR28 · UX-DR5, UX-DR25, UX-DR27–32.

**Acceptance Criteria:**

**Given** user đã đăng nhập
**When** mở `/library`
**Then** server chỉ trả records thuộc `auth.uid()`
**And** gồm published lessons và jobs active/needs-action theo policy
**And** cross-owner data không lộ qua count, title, URL hay timing.

**Given** library có data
**When** rows/cards render
**Then** mỗi item có thumbnail/title/channel, CEFR, trạng thái, created/updated và completion khi có
**And** external metadata render an toàn
**And** mỗi item có một primary action phù hợp state.

**Given** item là published lesson
**When** user mở
**Then** tới `/lessons/{id}` và đọc immutable saved version
**And** không gọi Gemini/transcript/STT hoặc tạo job mới
**And** activity/completion state được khôi phục.

**Given** item là active job
**When** user mở
**Then** tới `/jobs/{id}` và tiếp tục polling persisted state
**And** không resubmit create command
**And** reload khôi phục phase.

**Given** item `awaiting_user_input`
**When** mở
**Then** hiển thị đúng fallback surface của cùng job
**And** primary action quay lại paste/upload/capture tương ứng
**And** không tạo job mới.

**Given** item failed
**When** render
**Then** dùng Vietnamese ProductError copy và safe action khi có
**And** không lộ provider/stack
**And** retry interaction chi tiết thuộc Story 5.2.

**Given** library rỗng
**When** render
**Then** empty state có primary action `Tạo bài học`
**And** không dashboard/streak/XP.

**Given** nhiều items
**When** query
**Then** cursor pagination và stable default sort
**And** target render khoảng 3 giây trong điều kiện bình thường
**And** cache/data boundary owner-safe.

**Given** desktop/mobile/keyboard
**When** library hoạt động
**Then** responsive, visible focus, labels, 44px targets, accessible truncation và no color-only states.

**Given** Story 5.1 vào CI
**When** tests chạy
**Then** có RLS/cross-owner, published reopen no-provider, active/awaiting/failed, empty, pagination, performance-budget và accessibility tests
**And** có E2E completed lesson → library → reopen saved progress.

## Story 5.2 — Lọc thư viện và khôi phục job lỗi

**As a** người học có nhiều lesson và job,
**I want** lọc theo trạng thái và thử lại những job có thể phục hồi,
**So that** tôi nhanh chóng tìm đúng việc cần tiếp tục.

**Requirements:** FR41 · NFR2, NFR5, NFR7, NFR11, NFR13–16 · AR3–7, AR9, AR21–24, AR29–30 · UX-DR25, UX-DR27–32.

**Acceptance Criteria:**

**Given** library có nhiều state
**When** user dùng filter
**Then** hỗ trợ tối thiểu All, Ready, In progress, Needs action, Failed và Completed
**And** filter có thể phản ánh trong URL/query an toàn
**And** unknown filter normalize về default.

**Given** query filter/sort
**When** server xử lý
**Then** input qua schema validation
**And** query owner-scoped, pagination ổn định
**And** canonical job-state mapping là nguồn truth, không string UI tự phát.

**Given** user chọn một filter
**When** results load
**Then** loading/empty/error states giữ filter context
**And** keyboard/focus không reset vô lý
**And** mobile controls accessible.

**Given** job failed với `retryable: true`
**When** user chọn `Thử lại`
**Then** server kiểm tra ownership, terminal/current state, retry budget, quota, active concurrency và pipeline compatibility
**And** retry dùng same job hoặc explicit versioned retry relationship theo architecture
**And** double submit không tạo provider call trùng.

**Given** job `VIDEO_LANGUAGE_UNSUPPORTED`
**When** render
**Then** không có `Thử lại`
**And** primary action là chọn video khác
**And** không translation mode.

**Given** job/schema/pipeline quá cũ để resume an toàn
**When** retry requested
**Then** system giải thích cần tạo job mới
**And** không chạy contract không tương thích
**And** saved lesson cũ vẫn mở nếu tồn tại.

**Given** retry accepted
**When** workflow resume
**Then** persisted job URL/state được giữ hoặc relation mới được hiển thị rõ
**And** progress page phục hồi sau reload
**And** retry không xóa diagnostics/provenance cũ cần thiết.

**Given** telemetry ghi filter/retry
**When** event xảy ra
**Then** log safe state/action/result/latency
**And** không log transcript/reflection text hoặc credentials.

**Given** Story 5.2 vào CI
**When** tests chạy
**Then** có filter/query validation, pagination, retry quota/idempotency, unsupported-language, stale-version, cross-owner và accessibility tests
**And** có E2E filter needs-action → resume same job.

## Story 5.3 — Xóa lesson và dữ liệu phụ thuộc theo policy

**As a** người học,
**I want** xóa lesson hoặc job mình không cần,
**So that** tôi kiểm soát dữ liệu cá nhân và thư viện luôn gọn.

**Requirements:** FR41 · NFR2–4, NFR7, NFR13–15, NFR19, NFR21 · AR3–5, AR18–19, AR23, AR27–28 · UX-DR26–28, UX-DR32.

**Acceptance Criteria:**

**Given** user chọn xóa lesson/job
**When** confirmation dialog mở
**Then** nêu rõ dữ liệu sẽ xóa và dữ liệu có thể giữ theo legal/audit policy
**And** destructive action cần xác nhận rõ
**And** Cancel được focus ưu tiên và focus trả trigger khi đóng.

**Given** user xác nhận xóa published lesson
**When** deletion workflow chạy
**Then** owner authorization được kiểm tra server-side
**And** lesson pointer/version visibility, attempts, completion và reflections được xóa/tombstone theo policy
**And** transcript/video metadata chỉ xóa khi không còn dependency hoặc policy yêu cầu
**And** operation idempotent.

**Given** user xóa active job
**When** operation chạy
**Then** cancel job trước
**And** workflow không gọi provider/publish step mới
**And** temporary artifacts được cleanup
**And** UI phân biệt deletion pending với completed.

**Given** cleanup dependency tạm thất bại
**When** transaction/workflow xử lý
**Then** không tuyên bố xóa hoàn tất sai
**And** resource chuyển safe pending-deletion/tombstone state
**And** background retry + telemetry xử lý cleanup
**And** item không mở như lesson dùng được.

**Given** user A gửi ID của user B
**When** delete/read xử lý
**Then** response không tiết lộ resource tồn tại
**And** RLS/server authorization chặn thay đổi
**And** service role chỉ dùng trong authorized server workflow.

**Given** deletion qua irreversible boundary
**When** UI phản hồi
**Then** không hứa restore nếu không thể
**And** restore/backup procedure không vô tình khôi phục resource đã purge theo privacy policy
**And** public-launch legal/retention text phải hoàn tất trước release.

**Given** raw temporary audio tồn tại
**When** lesson/job bị xóa
**Then** cleanup được yêu cầu ngay nhưng vẫn có TTL sweeper defense in depth
**And** temporary audio không được giữ cùng lesson archive.

**Given** deletion telemetry
**When** operation chạy
**Then** log safe IDs, transition, result, latency và cleanup status
**And** không log content bodies.

**Given** Story 5.3 vào CI
**When** tests chạy
**Then** có confirmation/cancel, dependency deletion, active-job cancel, partial cleanup, idempotency, RLS, retention và accessibility tests
**And** có E2E delete success/pending/failure-safe paths.

Epic 5 hoàn tất khi user có thư viện owner-scoped để mở lại, lọc, phục hồi và xóa dữ liệu theo policy mà không regeneration ngoài ý muốn.