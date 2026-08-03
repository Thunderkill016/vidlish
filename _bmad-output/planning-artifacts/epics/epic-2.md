# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án

Người dùng có thể tạo một job bền vững; hệ thống thử caption/provider/STT và user-input fallbacks, chuẩn hóa transcript, kiểm tra ngôn ngữ và chỉ tiếp tục khi video có đủ tiếng Anh gốc.

**FRs covered:** FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5.

## Story 2.1 — Tạo generation job bền vững

**As a** người học đã xác nhận video và chọn CEFR,  
**I want** bắt đầu một generation job có URL và trạng thái được lưu,  
**So that** tôi có thể rời trang, tải lại hoặc gửi nhầm nhiều lần mà không mất tiến trình hay tạo thêm chi phí ngoài ý muốn.

**Requirements:** FR31, FR32, FR33 · NFR2, NFR5, NFR7, NFR12, NFR15 · AD-2–5, AD-13–16, AD-21 · UX-DR9–11, UX-DR27–30.

### Acceptance Criteria

#### AC1 — Tạo job từ dữ liệu đã xác nhận

**Given** người dùng đã đăng nhập, video có trạng thái `playable` và đã chọn CEFR  
**When** nhấn `Tạo bài học`  
**Then** server xác thực lại session, video ID và CEFR  
**And** tạo một `lesson_jobs` record trước khi gọi bất kỳ transcript hoặc AI provider nào  
**And** trả về opaque `jobId`  
**And** trình duyệt chuyển ngay đến `/jobs/{jobId}`  
**And** client không được tự gửi title, channel hoặc metadata để ghi đè nguồn sự thật phía server.

#### AC2 — Mô hình dữ liệu tối thiểu

**Given** Story 2.1 được triển khai  
**When** migrations được áp dụng  
**Then** story chỉ tạo các entity `videos`, `lesson_jobs` và `job_events` cần cho generation lifecycle  
**And** `lesson_jobs` tối thiểu lưu ID, owner, video, CEFR, status, current stage, pipeline version, idempotency key, optional error code/action và timestamps  
**And** chưa tạo Transcript, Lesson hoặc activity tables trong story này.

#### AC3 — Canonical job states

**Given** job lifecycle được khai báo  
**When** schema và domain contract được tạo  
**Then** dùng canonical states `queued`, `validating_video`, `acquiring_transcript`, `awaiting_user_input`, `normalizing_transcript`, `checking_language`, `analyzing_video`, `mining_language`, `planning_lesson`, `composing_activities`, `validating_lesson`, `repairing_lesson`, `publishing`, `completed`, `failed`, `cancelled`  
**And** database value, domain enum, workflow event và UI mapping dùng cùng một versioned contract  
**And** trạng thái không được biểu diễn bằng string tự phát trong từng component.

#### AC4 — Idempotent submission

**Given** một người dùng gửi cùng video, CEFR và pipeline version nhiều lần trong khi job cũ còn active  
**When** command `CreateLessonJob` chạy  
**Then** hệ thống trả lại job đang tồn tại  
**And** không tạo thêm record hoặc workflow run  
**And** active-job key là owner + video + CEFR + pipeline version  
**And** database constraint hoặc transaction lock chống được hai request đồng thời, không chỉ debounce ở client.

#### AC5 — GenerationPolicy trước khi tạo job

**Given** người dùng yêu cầu tạo job  
**When** application đánh giá request  
**Then** `GenerationPolicy` kiểm tra quyền private beta, active-job concurrency, rate limit, video và CEFR hợp lệ  
**And** khi bị từ chối, không tạo job hoặc phát Inngest event  
**And** trả product error ổn định như `JOB_CONCURRENCY_LIMIT`, `ACCOUNT_QUOTA_EXCEEDED` hoặc `RATE_LIMITED`  
**And** exact cost budgets được mở rộng ở Story 2.7.

#### AC6 — Phát workflow event an toàn

**Given** job đã được persist thành công  
**When** application bắt đầu xử lý  
**Then** phát versioned event `lesson.generation-requested.v1` với `jobId` và `pipelineVersion`  
**And** event ID derive từ `jobId + pipelineVersion`  
**And** nếu việc gửi event tạm thời thất bại, job vẫn tồn tại ở `queued`  
**And** retry dùng cùng event ID, không tạo workflow trùng.

#### AC7 — Một workflow duy nhất được điều khiển trạng thái

**Given** Inngest nhận generation event  
**When** workflow chạy  
**Then** concurrency key là `jobId` với limit một  
**And** mỗi step có stable step ID  
**And** chỉ `GenerateLessonWorkflow` được thay đổi `status` và `currentStage`  
**And** route handler chỉ được tạo/đọc/cancel job hoặc attach user input, không được tự đặt job thành completed/failed hay nhảy stage.

#### AC8 — Handoff của Story 2.1

**Given** workflow mới được tạo trong story này  
**When** job chạy  
**Then** workflow có thể đi `queued → validating_video → acquiring_transcript`  
**And** bước kiểm tra video dùng metadata đã xác nhận hoặc kiểm tra lại khi dữ liệu stale  
**And** story kết thúc tại durable handoff `acquiring_transcript`  
**And** chưa gọi caption, STT, transcript provider hoặc Gemini.

#### AC9 — Generation page phục hồi được

**Given** người dùng mở `/jobs/{jobId}`  
**When** job thuộc tài khoản hiện tại  
**Then** trang đọc trạng thái đã persist từ Postgres  
**And** hiển thị metadata video, CEFR và phase stepper  
**And** polling cập nhật trạng thái mà không giữ một HTTP request mở dài hạn.

**Given** người dùng reload, đóng tab hoặc mất mạng tạm thời  
**When** quay lại cùng URL  
**Then** trang khôi phục đúng job và stage  
**And** không tự submit lại Create Lesson command.

#### AC10 — User-facing phases

**Given** Generation page hiển thị tiến trình  
**When** job thay đổi stage  
**Then** UI dùng các phase `Kiểm tra video`, `Lấy hoặc tạo transcript`, `Kiểm tra tiếng Anh`, `Phân tích nội dung`, `Chọn phần đáng học`, `Tạo hoạt động`, `Kiểm định bài học`, `Hoàn tất`  
**And** không hiển thị tên Inngest step, provider, model call hoặc database state thô  
**And** completed, active, waiting và failed dùng text/icon cùng màu semantic  
**And** stage update được công bố bằng `aria-live` nhưng không đọc lại toàn bộ stepper mỗi lần polling.

#### AC11 — Ownership và RLS

**Given** `lesson_jobs` và `job_events` được exposed qua Supabase  
**When** migrations được áp dụng  
**Then** RLS được bật  
**And** người dùng chỉ đọc được job của `auth.uid()`  
**And** browser không được update trực tiếp trạng thái workflow  
**And** người dùng A truy cập URL job của người dùng B nhận phản hồi không tiết lộ job tồn tại  
**And** service-role chỉ được dùng trong server workflow/repository adapter.

#### AC12 — Error contract

**Given** tạo job, phát event hoặc workflow validation thất bại  
**When** lỗi được trả về UI  
**Then** lỗi có `code`, `messageVi`, `retryable`, optional safe action và optional `jobId`  
**And** raw Inngest, Supabase hoặc provider error không xuất hiện trên UI  
**And** retry không tạo job mới khi job cũ còn hợp lệ.

#### AC13 — Telemetry an toàn

**Given** job lifecycle diễn ra  
**When** telemetry được ghi  
**Then** có tối thiểu `job_created`, `workflow_dispatched`, `stage_started`, `stage_completed`, `stage_failed`  
**And** telemetry gồm job ID, user ID đã pseudonymize, stage, duration, safe error category, retry count và pipeline version  
**And** không log auth token, raw URL query, transcript, API key hoặc full sensitive event body.

#### AC14 — Accessibility và responsive

**Given** desktop hoặc mobile browser  
**When** người dùng tạo và theo dõi job  
**Then** primary action có loading state rõ ràng  
**And** submit trùng bị chặn nhưng không làm mất keyboard focus  
**And** stepper desktop/mobile đều đọc được  
**And** trạng thái offline không làm mất persisted job URL  
**And** touch targets chính đạt tối thiểu 44×44 CSS pixels.

#### AC15 — Kiểm thử

**Given** Story 2.1 được đưa vào CI  
**When** test suite chạy  
**Then** có unit test cho job command, state mapping và ProductError  
**And** có concurrency test chứng minh hai submit đồng thời chỉ tạo một job  
**And** có integration test cho transaction, idempotency và RLS  
**And** có Inngest test chứng minh một workflow/job và stable event ID  
**And** có E2E test cho create → redirect → reload → đúng job và cross-owner denial  
**And** event-dispatch failure giữ job ở `queued` và retry không tạo bản sao  
**And** CI dùng fixture metadata và local Inngest, không gọi provider thật.

Story 2.1 kết thúc khi job đã được persist, workflow đã bắt đầu, progress page phục hồi được và chưa phát sinh transcript/AI cost.
