# Epic 1 — Truy cập Vidlish và chọn video phù hợp

Người học trong private beta có thể đăng nhập, dán URL YouTube, chọn CEFR và xác nhận video tồn tại, công khai và có thể phát trước khi tạo bài.

**FRs covered:** FR1, FR2, FR3, FR4, FR5.

## Story 1.1 — Truy cập private beta và đăng nhập an toàn

**As a** người Việt học tiếng Anh đã được mời vào private beta,  
**I want** đăng nhập không cần mật khẩu và duy trì phiên truy cập,  
**So that** tôi có thể sử dụng không gian Vidlish riêng tư và dữ liệu của tôi không bị người khác truy cập.

**Requirements:** FR1, FR2 · NFR1, NFR2, NFR13, NFR14, NFR18 · AD-1, AD-13, AD-14, AD-18 · UX-DR1–5, UX-DR28–32.

### Acceptance Criteria

#### AC1 — Khởi tạo nền ứng dụng

**Given** repository chưa có product code  
**When** Story 1.1 hoàn tất  
**Then** ứng dụng chạy bằng Next.js 16 App Router, Node.js 24 LTS, TypeScript, pnpm, Tailwind 4, shadcn/ui và Zod 4  
**And** patch versions được khóa trong `pnpm-lock.yaml`  
**And** cấu trúc ban đầu tuân thủ modular monolith:

```text
src/app
src/modules/identity
src/platform/config
src/adapters/supabase
src/shared/contracts
src/shared/errors
```

**And** story không tạo trước bảng Job, Transcript hoặc Lesson chưa cần dùng.

#### AC2 — Private-beta access

**Given** một địa chỉ email chưa được phép tham gia beta  
**When** người dùng yêu cầu đăng nhập  
**Then** hệ thống không cấp quyền truy cập ứng dụng  
**And** hiển thị thông báo tiếng Việt không tiết lộ cấu hình nội bộ  
**And** không cho phép client tự thêm mình vào danh sách beta.

**Given** email nằm trong danh sách beta hợp lệ  
**When** người dùng yêu cầu đăng nhập  
**Then** hệ thống gửi passwordless OTP hoặc magic link qua Supabase Auth.

#### AC3 — Kiểm tra email và phản hồi đăng nhập

**Given** trang đăng nhập  
**When** người dùng nhập email sai định dạng  
**Then** form hiển thị lỗi inline bằng tiếng Việt  
**And** không gửi request đăng nhập.

**Given** email có định dạng hợp lệ  
**When** người dùng gửi form  
**Then** giao diện xác nhận đã gửi hướng dẫn đăng nhập  
**And** không tiết lộ email đó có tài khoản tồn tại hay không  
**And** lỗi Supabase thô không xuất hiện trên UI.

#### AC4 — Session và redirect

**Given** người dùng mở một route được bảo vệ khi chưa đăng nhập  
**When** route guard chạy  
**Then** người dùng được chuyển đến `/sign-in`  
**And** URL dự định ban đầu được giữ an toàn để quay lại sau đăng nhập.

**Given** người dùng hoàn tất passwordless callback hợp lệ  
**When** session được tạo  
**Then** session được lưu bằng cookie theo Supabase SSR  
**And** người dùng quay lại route dự định hoặc `/create`  
**And** refresh trình duyệt không làm mất phiên.

#### AC5 — App shell được bảo vệ

**Given** người dùng đã đăng nhập  
**When** ứng dụng được mở  
**Then** top navigation chỉ hiển thị:

```text
Tạo bài học
Thư viện
Account menu
```

**And** giao diện dùng brand tokens Vidlish  
**And** desktop và mobile đều sử dụng được  
**And** không thêm dashboard, streak, XP, AI chat hoặc settings hierarchy.

#### AC6 — Đăng xuất

**Given** người dùng đang đăng nhập  
**When** chọn `Đăng xuất` trong account menu  
**Then** Supabase session bị hủy  
**And** người dùng được chuyển về trang đăng nhập  
**And** back/refresh không mở lại nội dung được bảo vệ từ server.

#### AC7 — Ownership và RLS nền

**Given** các bảng owner-scoped tồn tại trong phạm vi story này, như profile hoặc beta access  
**When** migration được áp dụng  
**Then** mọi bảng exposed đều bật RLS  
**And** người dùng chỉ đọc hoặc sửa dữ liệu thuộc `auth.uid()` của mình  
**And** beta-access administration không thể được thay đổi bằng browser client  
**And** integration test chứng minh người dùng A không đọc hoặc sửa dữ liệu người dùng B.

#### AC8 — Quản lý secrets và cấu hình

**Given** ứng dụng khởi động  
**When** environment variables được đọc  
**Then** chúng phải đi qua một typed config module được Zod validate  
**And** module sản phẩm không đọc `process.env` trực tiếp  
**And** service-role key và provider secrets không xuất hiện trong client bundle  
**And** production, staging và local sử dụng cấu hình tách biệt.

#### AC9 — Accessibility

**Given** người dùng chỉ sử dụng bàn phím  
**When** thao tác trang đăng nhập và app navigation  
**Then** thứ tự focus hợp lý, focus state nhìn thấy được và mọi control có visible label  
**And** lỗi form được liên kết với input cho screen reader  
**And** touch target chính đạt tối thiểu 44×44 CSS pixels  
**And** trạng thái không chỉ được phân biệt bằng màu.

#### AC10 — Kiểm thử

**Given** Story 1.1 được đưa vào CI  
**When** test suite chạy  
**Then** có unit test cho validation và error mapping  
**And** có integration test cho session, private-beta authorization và RLS  
**And** có E2E test cho đăng nhập thành công, email không được mời, refresh session, route redirect và đăng xuất  
**And** CI không gọi Gemini, YouTube hoặc transcript provider thật.

Story này chỉ tạo nền đăng nhập và app shell hoàn chỉnh; chưa xử lý URL YouTube hoặc generation job.
