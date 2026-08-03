# Epic 5 — Quay lại và quản lý thư viện bài học

Người dùng có thể xem lesson/job theo trạng thái, mở lại không gọi AI, khôi phục job lỗi và xóa lesson cùng dữ liệu phụ thuộc theo retention policy.

**FRs covered:** FR40, FR41.

## Story 5.1 — Xem thư viện và mở lại lesson đã lưu

**As a** người học đã tạo bài,
**I want** xem các lesson và job của mình trong một thư viện,
**So that** tôi có thể quay lại học mà không phải nhớ URL hoặc tạo lại bài.

**Requirements:** FR40, FR41 · NFR2, NFR7, NFR11, NFR13–16 · AR3–5, AR19–20, AR23, AR25, AR29 · UX-DR6, UX-DR25–32.

**Acceptance Criteria:**

**Given** người dùng đã đăng nhập
**When** mở `/library`
**Then** server chỉ trả records thuộc `auth.uid()`
**And** danh sách bao gồm published lessons và jobs chưa hoàn tất/cần hành động theo product policy
**And** cross-owner data không bị lộ qua count, title, URL hoặc timing.

**Given** library có dữ liệu
**When** cards/rows hiển thị
**Then** mỗi item có tối thiểu video thumbnail/title/channel, CEFR, trạng thái, ngày tạo/cập nhật và completion state khi có
**And** title/thumbnail từ external metadata được render an toàn
**And** item có một primary action phù hợp với state.

**Given** item là published lesson
**When** người dùng chọn mở
**Then** điều hướng tới `/lessons/{id}` và đọc immutable saved version
**And** không gọi Gemini, transcript provider, STT hoặc tạo generation job mới
**And** activity/completion state của người dùng được khôi phục.

**Given** item là active job
**When** người dùng chọn mở
**Then** điều hướng tới `/jobs/{id}` và tiếp tục polling persisted state
**And** không submit lại create command
**And** reload vẫn khôi phục đúng phase.

**Given** item đang `awaiting_user_input`
**When** người dùng mở
**Then** hiển thị đúng fallback card và input đã chờ
**And** primary action quay lại flow paste/upload/capture của cùng job
**And** không tạo job mới.

**Given** item failed nhưng retryable
**When** library hiển thị
**Then** trạng thái lỗi dùng product copy tiếng Việt và safe action
**And** raw provider/error stack không lộ
**And** retry phải tuân idempotency và GenerationPolicy.

**Given** library rỗng
**When** trang hiển thị
**Then** có empty state giải thích ngắn và một primary action `Tạo bài học`
**And** không thêm dashboard metrics, streak hoặc gamification ngoài scope.

**Given** thư viện có nhiều item
**When** query chạy
**Then** dùng pagination/cursor ổn định, sort mặc định theo updated/created policy đã định nghĩa
**And** saved lesson/library target response/render khoảng 3 giây trong điều kiện bình thường
**And** cache/data boundary không chia sẻ dữ liệu giữa users.

**Given** desktop hoặc mobile
**When** library render
**Then** card/list responsive, keyboard navigable, labels/focus rõ và touch target tối thiểu 44×44
**And** loading/error/empty state không chỉ phân biệt bằng màu
**And** line lengths/title truncation có accessible full label khi cần.

**Given** Story 5.1 được đưa vào CI
**When** tests chạy
**Then** có RLS/cross-owner, published reopen without provider, active/awaiting/failed state, empty, pagination, performance-budget và accessibility tests
**And** có E2E create-completed lesson → library → reopen với saved progress
**And** CI không gọi provider thật.

## Story 5.2 — Lọc, khôi phục và xóa dữ liệu theo policy

**As a** người học có nhiều lesson và job,
**I want** lọc thư viện, xử lý item lỗi và xóa dữ liệu mình không cần,
**So that** thư viện luôn dễ quản lý và tôi kiểm soát dữ liệu cá nhân của mình.

**Requirements:** FR41 · NFR2–4, NFR7, NFR13–15, NFR19, NFR21 · AR3–5, AR20, AR23, AR25, AR29–30 · UX-DR25–32.

**Acceptance Criteria:**

**Given** library có nhiều trạng thái
**When** người dùng dùng filters
**Then** hỗ trợ tối thiểu All, Ready, In progress, Needs action, Failed và Completed theo taxonomy sản phẩm
**And** filter state có thể phản ánh trong URL/query an toàn
**And** unknown filter bị normalize về default, không tạo arbitrary database query.

**Given** người dùng tìm/ lọc theo dữ liệu được hỗ trợ
**When** query chạy
**Then** filter/sort được server validate
**And** kết quả vẫn owner-scoped và pagination ổn định
**And** trạng thái active/failed được tính từ canonical job state mapping, không từ string UI tự phát.

**Given** job failed với error retryable
**When** người dùng chọn `Thử lại`
**Then** server kiểm tra ownership, current terminal state, retry budget, quota và pipeline compatibility
**And** resume/retry dùng cùng job hoặc versioned retry relationship theo architecture policy
**And** không tạo provider call trùng do double submit
**And** non-retryable `VIDEO_LANGUAGE_UNSUPPORTED` chỉ có action chọn video khác.

**Given** job/lesson có schema/pipeline version quá cũ để resume an toàn
**When** người dùng yêu cầu retry
**Then** hệ thống giải thích cần tạo job mới thay vì tự chạy với contract không tương thích
**And** saved lesson cũ vẫn mở được bằng immutable version nếu chưa bị xóa.

**Given** người dùng chọn xóa lesson hoặc job
**When** delete confirmation hiển thị
**Then** dialog nêu rõ dữ liệu nào sẽ bị xóa và dữ liệu nào có thể được giữ theo legal/audit policy
**And** destructive action cần xác nhận rõ ràng
**And** cancel trả focus về trigger.

**Given** người dùng xác nhận xóa published lesson
**When** deletion transaction/workflow chạy
**Then** xóa hoặc tombstone lesson pointer, activities/attempts/completion/reflections và owner-linked dependent data theo documented policy
**And** canonical transcript/video metadata chỉ xóa khi không còn dependency hoặc retention policy yêu cầu
**And** raw/temporary audio luôn được cleanup theo TTL, không chờ library deletion.

**Given** người dùng xác nhận xóa active job
**When** operation chạy
**Then** job được cancel trước, không có provider/ publish step mới
**And** temporary artifacts được cleanup
**And** deletion idempotent và phục hồi rõ khi cleanup đang pending.

**Given** deletion gồm nhiều resources
**When** một dependency cleanup tạm thất bại
**Then** UI không tuyên bố hoàn tất sai
**And** record chuyển safe pending-deletion/tombstone state theo policy
**And** background retry/telemetry xử lý cleanup
**And** item không còn hiển thị như lesson dùng được.

**Given** user A gửi delete/read request với ID của user B
**When** server xử lý
**Then** phản hồi không tiết lộ resource tồn tại
**And** RLS/server authorization ngăn mọi thay đổi
**And** service role chỉ dùng trong server deletion workflow có owner check.

**Given** backup/restore policy hoạt động
**When** deletion đã qua irreversible boundary
**Then** product copy không hứa khôi phục nếu không thể
**And** restore test cho durable job/lesson data không vô tình khôi phục resource đã purge theo privacy policy
**And** retention/legal terms phải được hoàn tất trước public launch.

**Given** deletion/filter/retry telemetry được ghi
**When** event xảy ra
**Then** log safe IDs, state transition, result code, latency và cleanup status
**And** không log transcript/reflection text hoặc credentials.

**Given** Story 5.2 được đưa vào CI
**When** tests chạy
**Then** có filter/query validation, retry idempotency/quota, stale-version, delete dependency, cancel-active-job, partial-cleanup, RLS và accessibility tests
**And** có E2E delete confirmation/cancel/success và unsupported-language action
**And** có retention/restore rehearsal phù hợp môi trường test.

Epic 5 hoàn tất khi người dùng có thư viện owner-scoped để mở lại, lọc, phục hồi trạng thái phù hợp và xóa dữ liệu theo policy mà không regeneration ngoài ý muốn.