# Epic 1 — Truy cập Vidlish và chọn video phù hợp

Người học trong private beta có thể đăng nhập, dán URL YouTube, chọn CEFR và xác nhận video tồn tại, công khai và có thể phát trước khi tạo generation job.

**FRs covered:** FR1–FR5.  
**Implementation authority:** `architecture/.../IMPLEMENTATION-DECISIONS.md`.

## Story 1.1 — Truy cập private beta và đăng nhập an toàn

**As a** người Việt học tiếng Anh đã được mời vào private beta,  
**I want** đăng nhập bằng mã OTP và duy trì phiên riêng tư,  
**So that** tôi có thể dùng Vidlish mà dữ liệu không bị người khác truy cập.

**Requirements:** FR1, FR2 · NFR1, NFR2, NFR13, NFR14, NFR16, NFR18 · AD-1, AD-13, AD-14, AD-18, AD-19 · ID-1, ID-2, ID-10, ID-11 · UX-DR1–5, UX-DR28–32.

### Acceptance Criteria

#### AC1 — Scaffold greenfield

**Given** repository chưa có product code  
**When** Story 1.1 hoàn tất  
**Then** ứng dụng chạy bằng Next.js 16 App Router, Node.js 24 LTS, TypeScript, pnpm, Tailwind 4, shadcn/ui và Zod 4  
**And** patch versions được khóa trong `pnpm-lock.yaml`  
**And** cấu trúc ban đầu có `src/app`, `src/modules/identity`, `src/platform/config`, `src/adapters/supabase`, `src/shared/contracts` và `src/shared/errors`  
**And** chưa tạo bảng Job, Transcript, Lesson hoặc Activity.

#### AC2 — Beta allowlist

**Given** migration được áp dụng  
**When** private-beta access được cấu hình  
**Then** có bảng `beta_access` keyed by normalized email  
**And** browser client không thể insert/update/delete allowlist  
**And** chỉ reviewed migration hoặc service-role-only admin command được thay đổi dữ liệu  
**And** response đăng nhập không tiết lộ email có trong allowlist hay đã có account.

#### AC3 — Email OTP duy nhất

**Given** email hợp lệ và được phép beta  
**When** người dùng yêu cầu đăng nhập  
**Then** Supabase gửi mã OTP sáu chữ số  
**And** MVP không dùng magic link  
**And** resend/cooldown/expiry được xử lý bằng copy tiếng Việt rõ ràng  
**And** raw Supabase error không xuất hiện trên UI.

#### AC4 — Xác minh OTP và session

**Given** người dùng nhập OTP hợp lệ  
**When** server xác minh  
**Then** tạo cookie-based Supabase SSR session  
**And** kiểm tra lại allowlist trước khi cấp app access  
**And** quay lại intended route hoặc `/create`  
**And** refresh không làm mất session.

**Given** OTP sai, hết hạn hoặc vượt retry policy  
**When** verification thất bại  
**Then** hiển thị lỗi inline có thể hành động  
**And** không tiết lộ thông tin nội bộ.

#### AC5 — Route protection và app shell

**Given** route được bảo vệ  
**When** người dùng chưa có session hoặc không còn beta access  
**Then** chuyển đến `/sign-in` và giữ intended URL an toàn.

**Given** user hợp lệ  
**When** app shell hiển thị  
**Then** navigation chỉ có `Tạo bài học`, `Thư viện` và account menu  
**And** account menu trong Story 1.1 chỉ có `Đăng xuất`  
**And** chưa hiển thị quota, retention, feedback link, dashboard, streak, XP hoặc AI chat.

#### AC6 — Đăng xuất

**Given** user đang đăng nhập  
**When** chọn `Đăng xuất`  
**Then** session bị hủy và chuyển về `/sign-in`  
**And** back/refresh không mở lại protected content từ server cache.

#### AC7 — RLS và secrets

**Given** owner-scoped table được tạo trong story  
**When** migration/test chạy  
**Then** RLS bắt buộc và cross-owner access bị chặn  
**And** service-role/provider secrets chỉ ở server  
**And** config được Zod validate tập trung  
**And** module sản phẩm không đọc `process.env` trực tiếp.

#### AC8 — Accessibility và responsive

**Given** keyboard/screen-reader/mobile user  
**When** thao tác sign-in và navigation  
**Then** visible labels, logical focus, linked errors, visible focus và 44×44 touch targets tồn tại  
**And** trạng thái không chỉ dùng màu  
**And** core flow đáp ứng WCAG 2.2 AA floor.

#### AC9 — Pull-request CI floor

**Given** pull request được mở  
**When** GitHub Actions chạy  
**Then** pipeline thực hiện `pnpm install --frozen-lockfile`, typecheck, lint, unit/integration tests và production build  
**And** CI chỉ dùng fixtures/fakes  
**And** preview deployment/branch protection chưa bị tuyên bố là hoàn tất nếu repo settings chưa được cấu hình.

#### AC10 — Kiểm thử

**Given** Story 1.1 vào CI  
**When** suite chạy  
**Then** có unit test cho email/OTP/error mapping  
**And** integration test cho allowlist, session, route guard và RLS  
**And** E2E cho allowed login, non-allowed neutral response, invalid/expired OTP, refresh, intended redirect và logout.

Story 1.1 hoàn tất với scaffold, OTP auth, beta boundary và protected shell; chưa xử lý YouTube URL.

## Story 1.2 — Dán và kiểm tra video YouTube

**As a** người học đã đăng nhập,  
**I want** dán một liên kết YouTube và xem metadata/playability đã xác nhận,  
**So that** tôi biết video có thể tiếp tục vào Create flow.

**Requirements:** FR3, FR5 · NFR1, NFR6, NFR10, NFR13, NFR14, NFR16 · AD-1, AD-5, AD-14, AD-17 · ID-3 · UX-DR6, UX-DR7, UX-DR27, UX-DR29–32.

### Acceptance Criteria

#### AC1 — URL input và parser

**Given** user mở `/create`  
**When** dán URL YouTube  
**Then** hỗ trợ `watch`, `youtu.be`, `shorts`, `embed` và mobile watch URL  
**And** suy ra canonical video ID  
**And** loại tracking/playlist/timestamp không ảnh hưởng  
**And** invalid/non-YouTube/malicious input bị chặn trước provider call.

#### AC2 — Initial metadata adapter

**Given** video ID hợp lệ  
**When** metadata lookup chạy  
**Then** application gọi `VideoMetadataProvider`  
**And** initial adapter dùng YouTube Data API v3 `videos.list` với `snippet`, `contentDetails`, `status`  
**And** output qua Zod thành canonical DTO  
**And** raw Google response không đi vào domain/UI.

#### AC3 — Canonical availability mapping

**Given** provider response  
**When** adapter map kết quả  
**Then** dùng resource existence, privacy/upload status, `embeddable` và region restriction để xác định availability  
**And** map ổn định tới `playable`, `not_found`, `private`, `restricted`, `unavailable` hoặc `metadata_failed`  
**And** không coi caption indicator là bằng chứng video đủ tiếng Anh.

#### AC4 — Metadata preview

**Given** video `playable`  
**When** lookup thành công  
**Then** hiển thị thumbnail, title, channel và duration khi có  
**And** external text render an toàn  
**And** copy không hứa lesson chắc chắn thành công.

#### AC5 — Error/retry/performance

**Given** known unavailable state  
**When** hiển thị  
**Then** có product error tiếng Việt và user sửa URL không cần reload.

**Given** transient provider failure  
**When** timeout/retry policy kết thúc  
**Then** có một action `Thử lại`  
**And** acknowledgement/loading bắt đầu trong khoảng 2 giây ở điều kiện bình thường  
**And** request không treo vô hạn hoặc nhân đôi do submit liên tục.

#### AC6 — Security và ownership

**Given** metadata request  
**When** tới server  
**Then** session/beta access và video ID được revalidate  
**And** client không truyền arbitrary endpoint  
**And** API key chỉ ở server.

#### AC7 — Accessibility và responsive

**Given** desktop/mobile/keyboard user  
**When** dùng URL field và preview  
**Then** visible label, linked error, `aria-live` có kiểm soát, visible focus và no horizontal overflow tồn tại.

#### AC8 — Kiểm thử

**Given** Story 1.2 vào CI  
**When** suite chạy  
**Then** có URL parser fixtures, adapter contract, availability mapping, timeout/error, authenticated route, loading/success/unavailable E2E và no-live-provider assertion.

Story 1.2 kết thúc khi metadata/playability đã xác nhận; chưa tạo job hoặc transcript.

## Story 1.3 — Chọn trình độ và xác nhận video sẵn sàng

**As a** người học có video đã xác nhận,  
**I want** chọn CEFR và xác nhận lựa chọn,  
**So that** Create flow có validated draft sẵn sàng cho Story 2.1.

**Requirements:** FR4 · NFR13, NFR14, NFR16 · AD-14 · UX-DR6, UX-DR8, UX-DR27–30, UX-DR32.

### Acceptance Criteria

#### AC1 — CEFR selector

**Given** Create form  
**When** selector hiển thị  
**Then** có A1, A2, B1, B2, C1 với mô tả tiếng Việt  
**And** không có implicit default  
**And** chỉ một level được chọn  
**And** data dùng enum canonical.

#### AC2 — Responsive và accessible selection

**Given** desktop  
**When** hiển thị  
**Then** các level là nhóm nút cân đối.

**Given** mobile  
**When** thiếu chiều ngang  
**Then** selector cuộn ngang, không tràn trang và mỗi target ít nhất 44×44  
**And** `aria-pressed`/group semantics, keyboard và visible focus hoạt động.

#### AC3 — Session persistence và stale invalidation

**Given** CEFR đã chọn  
**When** user sửa URL hoặc kiểm tra lại metadata  
**Then** CEFR có thể giữ trong current session  
**And** thay video làm mất metadata/readiness cũ  
**And** không tạo preference/profile dài hạn.

#### AC4 — Điều kiện xác nhận

**Given** URL chưa hợp lệ, metadata chưa `playable` hoặc CEFR chưa chọn  
**When** form đánh giá  
**Then** action `Xác nhận lựa chọn` chưa khả dụng và lý do thiếu nằm gần control liên quan.

**Given** video `playable` và CEFR hợp lệ  
**When** user chọn `Xác nhận lựa chọn`  
**Then** UI hiển thị `Sẵn sàng tạo bài học`  
**And** giữ validated draft gồm `videoId`, `cefrLevel`, `metadataVersion`  
**And** payload qua Zod.

#### AC5 — Không có dead job CTA

**Given** Story 2.1 chưa tồn tại  
**When** Story 1.3 được demo  
**Then** không hiển thị action job-creating `Tạo bài học`  
**And** không tạo `lesson_jobs`, workflow, transcript, STT hoặc provider cost.

**Given** Story 2.1 được tích hợp sau này  
**When** Create flow được nâng cấp  
**Then** Story 2.1 thay confirmed state bằng action `Tạo bài học` và persist job.

#### AC6 — Scope/privacy copy

**Given** confirmed draft  
**When** UI hiển thị  
**Then** nêu Vidlish không lưu video  
**And** video cần đủ original English speech  
**And** không hứa mọi public video đều tạo lesson được.

#### AC7 — Kiểm thử

**Given** Story 1.3 vào CI  
**When** suite chạy  
**Then** có enum/schema, selected/unselected/disabled, mobile/keyboard, stale metadata invalidation và E2E `Xác nhận lựa chọn → Sẵn sàng tạo bài học`  
**And** test chứng minh không tạo generation job.

Epic 1 hoàn tất tại trạng thái: authenticated user + playable video + chosen CEFR + confirmed validated draft.