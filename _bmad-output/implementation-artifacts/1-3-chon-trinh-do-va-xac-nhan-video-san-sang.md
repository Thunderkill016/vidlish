# Story 1.3: Chọn trình độ và xác nhận video sẵn sàng

Status: in-progress

## Story

As a người học có video đã xác nhận,
I want chọn CEFR và xác nhận lựa chọn,
so that Create flow có validated draft sẵn sàng cho Story 2.1.

## Business Value

Story này hoàn tất Epic 1 bằng cách ghép playable video với trình độ CEFR do người học chủ động chọn. Kết quả chỉ là validated draft trong phiên hiện tại; chưa tạo generation job, transcript, STT, provider call hoặc chi phí AI.

## Requirements Traceability

- Functional: FR4.
- Non-functional: NFR13, NFR14, NFR16.
- Architecture: AR21, AR23, AR26, AR27.
- UX: UX-DR6, UX-DR8, UX-DR27–UX-DR30, UX-DR32.

## Acceptance Criteria

### AC1 — Canonical CEFR selector

**Given** metadata video đã được xác nhận là `playable`
**When** CEFR selector hiển thị
**Then** có đúng A1, A2, B1, B2, C1 với mô tả tiếng Việt
**And** không có lựa chọn mặc định
**And** chỉ một level được chọn
**And** dữ liệu được kiểm tra bằng canonical Zod enum/schema.

### AC2 — Accessible và responsive selection

**Given** desktop hoặc mobile user
**When** thao tác selector
**Then** selector dùng group semantics và mỗi level dùng `aria-pressed`
**And** keyboard, visible focus và touch target tối thiểu 44×44 hoạt động
**And** desktop hiển thị nhóm cân đối
**And** mobile cuộn ngang trong container riêng, không làm tràn trang.

### AC3 — Session state và stale invalidation

**Given** CEFR đã chọn
**When** người học sửa URL hoặc chạy metadata validation mới
**Then** CEFR được giữ trong current component session
**And** playable metadata và readiness cũ bị xóa ngay khi URL thay đổi hoặc validation mới bắt đầu
**And** không persist CEFR vào profile, localStorage, database hoặc cookie.

### AC4 — Confirmed validated draft

**Given** URL chưa hợp lệ, metadata chưa `playable` hoặc CEFR chưa chọn
**When** Create flow đánh giá readiness
**Then** action `Xác nhận lựa chọn` bị vô hiệu hóa
**And** lý do thiếu được hiển thị gần video preview hoặc CEFR selector.

**Given** playable metadata và CEFR hợp lệ
**When** người học chọn `Xác nhận lựa chọn`
**Then** UI hiển thị `Sẵn sàng tạo bài học`
**And** validated draft chứa đúng `videoId`, `cefrLevel`, `metadataVersion`
**And** draft qua Zod trước khi được giữ trong client state.

### AC5 — Không tạo dead job CTA

**Given** Story 2.1 chưa được tích hợp
**When** Story 1.3 hiển thị confirmed state
**Then** không có action `Tạo bài học`
**And** không tạo `lesson_jobs`, event, workflow, transcript hoặc provider call
**And** confirmed state chỉ giải thích rằng bước tạo bài học sẽ được nối ở story tiếp theo.

### AC6 — Scope và privacy copy

**Given** draft đã được xác nhận
**When** readiness panel hiển thị
**Then** nêu Vidlish không lưu video
**And** nêu video vẫn cần đủ lời nói tiếng Anh gốc
**And** không hứa mọi video public đều tạo được lesson.

### AC7 — Test pyramid

**Given** Story 1.3 vào CI
**When** suite chạy
**Then** có tests cho CEFR enum/schema, selected/unselected/disabled states, stale invalidation, malformed draft và keyboard semantics
**And** có desktop/mobile E2E `Kiểm tra video → chọn CEFR → Xác nhận lựa chọn → Sẵn sàng tạo bài học`
**And** regression chứng minh không có request tạo job.

## Tasks / Subtasks

- [ ] Thêm canonical CEFR enum, Vietnamese descriptors và confirmed draft schema vào shared contracts.
- [ ] Tạo accessible CEFR selector không implicit default và responsive horizontal scroll trên mobile.
- [ ] Mở rộng Create form state để giữ CEFR trong phiên, invalidate metadata/readiness khi URL hoặc validation thay đổi.
- [ ] Thêm readiness validation và confirmed panel không có dead job CTA.
- [ ] Cập nhật privacy/scope copy cho original English speech invariant.
- [ ] Thêm unit/component tests cho schema, selector, draft validation và stale state.
- [ ] Thêm desktop/mobile Playwright journey và giữ toàn bộ Story 1.1–1.2 regression xanh.

## Validation Record

- Result: PASS.
- Scope phù hợp một development story và không phụ thuộc implementation tương lai để tạo giá trị.
- Không có quyết định sản phẩm mở: CEFR set, confirmed draft shape và no-job boundary đã được Epic 1 khóa.
- Story 1.2 đã cung cấp playable metadata contract, authenticated Create route, fixture adapter và CI foundation để reuse.
