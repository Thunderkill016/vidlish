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

## Story 1.2 — Dán và kiểm tra video YouTube

**As a** người học đã đăng nhập,  
**I want** dán một liên kết YouTube và xem thông tin video được xác nhận,  
**So that** tôi biết video tồn tại, có thể phát và phù hợp để chuyển sang bước tạo bài.

**Requirements:** FR3, FR5 · NFR6, NFR10, NFR13, NFR14, NFR16 · AD-1, AD-5, AD-14, AD-17 · UX-DR6, UX-DR7, UX-DR27, UX-DR29–32.

### Acceptance Criteria

#### AC1 — Nhập URL trên Create Lesson

**Given** người dùng đã đăng nhập và mở `/create`  
**When** trang hiển thị  
**Then** có một trường URL YouTube với visible label và paste affordance  
**And** validation chỉ chạy khi blur hoặc submit, không báo lỗi trong lúc người dùng đang gõ  
**And** giao diện giữ bố cục một cột, tối đa 720px.

#### AC2 — Hỗ trợ các dạng URL phổ biến

**Given** người dùng nhập một URL YouTube được hỗ trợ  
**When** URL được parse  
**Then** hệ thống hỗ trợ tối thiểu `watch`, `youtu.be`, `shorts`, `embed` và mobile watch URL  
**And** trả về canonical YouTube video ID  
**And** loại bỏ playlist, timestamp và tracking parameters không ảnh hưởng  
**And** không dùng regex phía client làm nguồn xác nhận duy nhất.

#### AC3 — Từ chối input không hợp lệ

**Given** người dùng nhập chuỗi trống, domain giả, URL không phải YouTube hoặc video ID sai định dạng  
**When** validation chạy  
**Then** hiển thị lỗi inline bằng tiếng Việt  
**And** không gọi metadata provider  
**And** lỗi được liên kết với input để screen reader xác định đúng trường lỗi.

#### AC4 — Provider-independent metadata lookup

**Given** URL đã được parse thành video ID hợp lệ  
**When** hệ thống kiểm tra video  
**Then** application gọi `VideoMetadataProvider` qua port  
**And** domain/application không import trực tiếp YouTube SDK hoặc response object của vendor  
**And** adapter output được Zod validate trước khi đi vào application layer  
**And** canonical result tối thiểu chứa `videoId`, `title`, `channelName`, optional thumbnail/duration và availability enum.

#### AC5 — Hiển thị metadata thành công

**Given** provider trả video `playable`  
**When** metadata được tải  
**Then** trang hiển thị thumbnail, title, channel và duration khi có  
**And** metadata preview nằm gần URL field  
**And** không hứa rằng caption đã tồn tại hoặc lesson chắc chắn sẽ được tạo  
**And** title/thumbnail không được render như HTML không kiểm soát.

#### AC6 — Phân biệt các trạng thái video lỗi

**Given** provider xác định video không tồn tại, private, restricted hoặc unavailable  
**When** kết quả được hiển thị  
**Then** mỗi trạng thái được map sang product error ổn định như `VIDEO_NOT_FOUND`, `VIDEO_PRIVATE`, `VIDEO_RESTRICTED`, `VIDEO_UNAVAILABLE` hoặc `VIDEO_METADATA_FAILED`  
**And** hiển thị thông báo tiếng Việt phù hợp  
**And** không hiển thị raw provider error hoặc stack trace  
**And** người dùng có thể sửa hoặc thay URL mà không reload trang.

#### AC7 — Loading và retry

**Given** metadata request đang chạy  
**When** người dùng chờ kết quả  
**Then** UI hiển thị skeleton hoặc trạng thái kiểm tra rõ ràng  
**And** không khóa toàn bộ trang  
**And** không gửi request trùng khi người dùng submit liên tục.

**Given** provider gặp lỗi retryable  
**When** request kết thúc  
**Then** người dùng thấy hành động `Thử lại`  
**And** retry sử dụng cùng canonical video ID.

#### AC8 — Hiệu năng và timeout

**Given** điều kiện mạng và provider bình thường  
**When** người dùng submit URL hợp lệ  
**Then** metadata response hoặc loading acknowledgement bắt đầu trong khoảng 2 giây  
**And** provider call có timeout cấu hình  
**And** request không treo vô hạn.

#### AC9 — Bảo mật

**Given** metadata lookup được thực hiện  
**When** request tới server  
**Then** server xác nhận session hợp lệ  
**And** URL/video ID được validate lại phía server  
**And** client không được truyền arbitrary provider endpoint hoặc command  
**And** secrets không xuất hiện trong browser bundle.

#### AC10 — Accessibility và responsive

**Given** màn hình desktop hoặc mobile  
**When** người dùng thao tác URL field và metadata preview  
**Then** flow dùng được hoàn toàn bằng bàn phím  
**And** loading/error/success state được công bố bằng `aria-live` hợp lý  
**And** trạng thái không chỉ phân biệt bằng màu  
**And** preview không gây horizontal overflow trên màn hình nhỏ.

#### AC11 — Kiểm thử

**Given** Story 1.2 được đưa vào CI  
**When** test suite chạy  
**Then** có unit test cho URL parser với input hợp lệ, sai và độc hại  
**And** có unit test cho metadata result/error mapping  
**And** có integration test cho authenticated metadata lookup và schema boundary  
**And** có component/E2E test cho loading, success và unavailable states  
**And** CI dùng fixture metadata provider, không gọi YouTube thật.

Story này kết thúc khi metadata của video đã được xác nhận; chưa tạo generation job, chưa lấy transcript và chưa gọi Gemini.

## Story 1.3 — Chọn trình độ và xác nhận video sẵn sàng

**As a** người học đã xác nhận được video YouTube,  
**I want** chọn trình độ tiếng Anh phù hợp và thấy trạng thái sẵn sàng rõ ràng,  
**So that** bài học sau này được cá nhân hóa đúng mức của tôi và không bắt đầu với dữ liệu thiếu.

**Requirements:** FR4 · NFR13, NFR14 · AD-14 · UX-DR6, UX-DR8, UX-DR27–30, UX-DR32.

### Acceptance Criteria

#### AC1 — Hiển thị CEFR selector

**Given** người dùng mở Create Lesson  
**When** form hiển thị  
**Then** có năm lựa chọn A1, A2, B1, B2 và C1  
**And** mỗi level có nhãn tiếng Anh thân thiện cùng mô tả ngắn bằng tiếng Việt  
**And** dữ liệu được lưu bằng enum `A1 | A2 | B1 | B2 | C1`.

#### AC2 — Trải nghiệm responsive

**Given** màn hình desktop  
**When** selector hiển thị  
**Then** năm level được trình bày thành các nút có kích thước cân đối.

**Given** màn hình nhỏ  
**When** selector không đủ chiều ngang  
**Then** nó trở thành hàng segmented có thể cuộn ngang  
**And** không làm tràn trang  
**And** mỗi lựa chọn có touch target tối thiểu 44×44 CSS pixels.

#### AC3 — Trạng thái lựa chọn

**Given** người dùng chưa chọn level  
**When** form được kiểm tra  
**Then** không level nào được ngầm chọn thay người dùng  
**And** hành động tiếp tục chưa khả dụng.

**Given** người dùng chọn một level  
**When** selection thay đổi  
**Then** chỉ một level được chọn  
**And** trạng thái selected dùng text, icon hoặc `aria-pressed`, không chỉ màu  
**And** screen reader đọc được tên và mô tả level.

#### AC4 — Giữ lựa chọn trong phiên

**Given** người dùng đã chọn CEFR  
**When** sửa URL, kiểm tra lại metadata hoặc điều hướng tạm thời trong Create flow  
**Then** lựa chọn vẫn được giữ trong phiên hiện tại  
**And** chưa tạo learner profile hoặc preference dài hạn ngoài scope MVP.

#### AC5 — Điều kiện sẵn sàng

**Given** form Create Lesson  
**When** URL chưa hợp lệ, metadata chưa hoàn tất, video không `playable` hoặc CEFR chưa được chọn  
**Then** nút `Tạo bài học` bị vô hiệu hóa  
**And** lý do thiếu được thể hiện gần trường liên quan.

**Given** video `playable` và CEFR hợp lệ  
**When** form đạt mọi điều kiện  
**Then** nút `Tạo bài học` được bật  
**And** giao diện hiển thị rõ video và level sắp được sử dụng.

#### AC6 — Thay đổi URL làm mất readiness cũ

**Given** video A đã được kiểm tra thành công  
**When** người dùng sửa URL thành video B  
**Then** metadata và trạng thái readiness của video A bị loại bỏ  
**And** hệ thống không cho phép tiếp tục bằng metadata cũ  
**And** CEFR đã chọn có thể được giữ lại.

#### AC7 — Payload chuẩn hóa

**Given** form đã sẵn sàng  
**When** application tạo command chuẩn bị cho Epic 2  
**Then** payload chỉ gồm `videoId`, `cefrLevel` và `metadataVersion` đã xác nhận  
**And** payload đi qua Zod schema  
**And** title, channel hoặc URL raw từ client không được xem là nguồn sự thật.

#### AC8 — Không tạo generation job trong Story 1.3

**Given** Story 1.3 đã hoàn tất  
**When** người dùng đạt trạng thái sẵn sàng  
**Then** Create flow có đủ validated inputs để Epic 2 tạo job  
**And** Story này chưa tạo `lesson_jobs`, chưa gọi transcript provider, STT hoặc Gemini  
**And** không phát sinh provider cost.

#### AC9 — Privacy và scope copy

**Given** Create Lesson form  
**When** người dùng chuẩn bị tiếp tục  
**Then** UI hiển thị ghi chú rằng Vidlish không lưu video  
**And** không hứa rằng mọi video đều tạo bài thành công  
**And** lời hứa sản phẩm nêu rõ video cần có đủ nội dung tiếng Anh gốc.

#### AC10 — Accessibility

**Given** người dùng chỉ sử dụng bàn phím  
**When** chọn CEFR và kiểm tra form  
**Then** thứ tự focus theo URL → CEFR → primary action  
**And** Tab/Space/Enter hoặc arrow keys hoạt động nhất quán theo component semantics  
**And** thông báo readiness hoặc lỗi được công bố mà không spam `aria-live`  
**And** visible focus luôn tồn tại.

#### AC11 — Kiểm thử

**Given** Story 1.3 được đưa vào CI  
**When** test suite chạy  
**Then** có unit test cho CEFR enum và validation schema  
**And** có component test cho selected, unselected và disabled states  
**And** có test cho việc đổi URL làm mất metadata readiness cũ  
**And** có responsive/accessibility test cho selector  
**And** E2E test xác nhận nút chỉ bật khi video và CEFR đều hợp lệ.

Epic 1 hoàn tất ở trạng thái: người dùng đã đăng nhập, video `playable` đã được xác nhận và CEFR đã được chọn; hệ thống sẵn sàng tạo generation job trong Epic 2.