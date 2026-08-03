---
title: Vidlish MVP
status: draft
created: 2026-08-03
updated: 2026-08-03
source: IDEA.md
track: Full BMad Method - Greenfield
working_mode: Fast path
---

# PRD: Vidlish MVP

## 0. Mục đích tài liệu

Tài liệu này khóa yêu cầu sản phẩm cho MVP Vidlish trước khi thực hiện UX, kiến trúc, chia epic/story hoặc viết code. Nguồn chính là `IDEA.md`. Các chi tiết nhỏ chưa được xác nhận được ghi bằng `[ASSUMPTION]`; các quyết định sản phẩm lớn, pháp lý, nhà cung cấp API, tài khoản và chi phí được giữ trong phần Câu hỏi mở để người sở hữu sản phẩm quyết định.

## 1. Tầm nhìn

Vidlish là ứng dụng web biến một video YouTube công khai có transcript thành một bài học tiếng Anh có cấu trúc dành cho người Việt Nam tự học.

Người học không cần tự chép transcript, chọn từ vựng hoặc soạn bài tập. Họ dán URL, chọn trình độ và nhận một bài học dựa trên nội dung thực tế của video, gồm tóm tắt, transcript có timestamp, từ vựng, cụm từ, ngữ pháp và bài tập ngắn.

MVP chỉ chứng minh một lời hứa: **một video người dùng quan tâm có thể trở thành một bài học tiếng Anh hữu ích, dễ hoàn thành và có thể mở lại sau này**.

## 2. Người dùng mục tiêu

### 2.1 Người dùng chính

Người Việt Nam tự học tiếng Anh ở trình độ A1-C1, thường xem YouTube và muốn biến nội dung họ chủ động lựa chọn thành tài liệu học có hướng dẫn.

### 2.2 Jobs To Be Done

- Khi tìm thấy một video tiếng Anh thú vị, tôi muốn nhanh chóng biết nội dung chính và những phần đáng học để không xem thụ động.
- Khi video nói nhanh hoặc có cách diễn đạt tự nhiên, tôi muốn xem transcript theo thời gian và hiểu các từ/cụm từ quan trọng.
- Khi học xong, tôi muốn làm một bài kiểm tra ngắn để biết mình có hiểu nội dung hay không.
- Khi quay lại, tôi muốn mở lại bài học đã tạo mà không cần xử lý lại video.

### 2.3 Không phải người dùng của MVP

- Giáo viên cần quản lý lớp học hoặc giao bài.
- Trẻ em cần chế độ kiểm soát nội dung chuyên biệt.
- Người cần luyện và chấm phát âm tự động.
- Người cần học từ video riêng tư, video trả phí hoặc video không có transcript.
- Người cần ứng dụng mobile native, extension hoặc học nhóm.

### 2.4 Hành trình người dùng

#### UJ-1. Minh biến một video thành bài học

- **Bối cảnh:** Minh là người Việt Nam học tiếng Anh trình độ Intermediate và vừa tìm thấy một video YouTube tiếng Anh muốn học.
- **Trạng thái vào:** Minh truy cập trang tạo bài học. `[ASSUMPTION: người dùng phải đăng nhập trước khi tạo bài học.]`
- **Luồng:** Minh dán URL → hệ thống kiểm tra video → Minh chọn trình độ → nhấn **Tạo bài học** → thấy trạng thái xử lý theo từng bước.
- **Khoảnh khắc giá trị:** Trang bài học xuất hiện với video, tóm tắt, transcript có timestamp, từ vựng, cụm từ, ngữ pháp và bài tập.
- **Kết quả:** Bài học được lưu tự động vào thư viện của Minh.
- **Lỗi chính:** Nếu video không hợp lệ, không công khai, quá dài hoặc không có transcript phù hợp, Minh nhận thông báo cụ thể và có thể nhập URL khác.

#### UJ-2. Minh học và kiểm tra hiểu biết

- **Trạng thái vào:** Minh mở một bài học đã tạo.
- **Luồng:** Minh xem tóm tắt → phát video hoặc bấm timestamp để nhảy đến đoạn tương ứng → đọc từ vựng/cụm từ/ngữ pháp → làm trắc nghiệm và bài điền từ.
- **Khoảnh khắc giá trị:** Minh nhận kết quả và lời giải ngay sau khi nộp bài.
- **Kết quả:** Minh có thể đánh dấu bài học đã hoàn thành.

#### UJ-3. Minh quay lại thư viện

- **Trạng thái vào:** Minh đã có ít nhất một bài học.
- **Luồng:** Minh mở thư viện → xem danh sách bài học theo ngày tạo → mở lại hoặc xóa một bài học.
- **Kết quả:** Bài học đã mở giữ nguyên nội dung; bài học đã xóa không còn trong tài khoản.

## 3. Thuật ngữ

- **Video hợp lệ** — Video YouTube công khai, tồn tại, không bị chặn với hệ thống và có transcript được MVP hỗ trợ.
- **Transcript** — Danh sách đoạn văn bản của video, mỗi đoạn có thời điểm bắt đầu và nội dung.
- **Bài học** — Nội dung được tạo từ một Video hợp lệ cho một trình độ cụ thể và được lưu cho một người dùng.
- **Trình độ** — Một trong năm lựa chọn: Beginner, Elementary, Intermediate, Upper Intermediate, Advanced.
- **Nội dung bài học** — Tóm tắt, transcript, từ vựng, cụm từ, điểm ngữ pháp, câu hỏi trắc nghiệm và bài điền từ.
- **Thư viện** — Màn hình liệt kê các Bài học đã lưu của người dùng hiện tại.
- **Hoàn thành** — Trạng thái nhị phân do người dùng đặt cho một Bài học; MVP không tính phần trăm tiến độ.
- **Tạo bài học** — Quy trình kiểm tra video, lấy transcript, tạo Nội dung bài học, xác thực dữ liệu và lưu kết quả.

## 4. Tính năng và yêu cầu chức năng

### 4.1 Nhập và kiểm tra video

**Mô tả:** Người dùng nhập một URL YouTube và chọn Trình độ. MVP không yêu cầu các tùy chỉnh khác. `[ASSUMPTION: mục tiêu học mặc định là học toàn diện và không hiển thị thành lựa chọn trong MVP.]`

#### FR-1: Nhập URL YouTube

Người dùng có thể dán URL YouTube vào biểu mẫu tạo bài học.

**Hệ quả kiểm thử được:**
- Chấp nhận các dạng URL YouTube phổ biến có thể suy ra video ID.
- Loại bỏ khoảng trắng đầu/cuối.
- Không bắt đầu xử lý khi trường URL trống.

#### FR-2: Chọn Trình độ

Người dùng phải chọn một Trình độ trước khi tạo bài học.

**Hệ quả kiểm thử được:**
- Chỉ chấp nhận năm giá trị đã định nghĩa trong Thuật ngữ.
- Trình độ được lưu cùng Bài học và được dùng khi tạo nội dung.

#### FR-3: Kiểm tra tính hợp lệ của video

Hệ thống phải kiểm tra URL và điều kiện xử lý trước khi gửi transcript tới AI.

**Hệ quả kiểm thử được:**
- Phân biệt được URL sai định dạng, video không tồn tại, video riêng tư, video bị giới hạn, video không có transcript phù hợp và video vượt giới hạn.
- Không tạo bản ghi Bài học hoàn chỉnh khi kiểm tra thất bại.

#### FR-4: Hiển thị metadata cơ bản

Sau khi video được chấp nhận, hệ thống lưu và hiển thị tối thiểu tiêu đề, kênh, thumbnail và thời lượng khi dữ liệu có sẵn.

### 4.2 Lấy và chuẩn hóa Transcript

#### FR-5: Lấy Transcript có sẵn

Hệ thống lấy Transcript từ phụ đề có sẵn của Video hợp lệ.

**Hệ quả kiểm thử được:**
- Mỗi đoạn Transcript có nội dung và timestamp bắt đầu.
- Không tải hoặc lưu file video/audio.
- Video không có Transcript được hỗ trợ trả về lỗi rõ ràng.

#### FR-6: Chuẩn hóa Transcript

Hệ thống làm sạch Transcript trước khi gửi tới AI mà không làm thay đổi ý nghĩa của nội dung.

**Hệ quả kiểm thử được:**
- Bỏ đoạn trống và chuẩn hóa khoảng trắng.
- Giữ quan hệ giữa nội dung và timestamp.
- Không tự bịa đoạn bị thiếu.

#### FR-7: Áp dụng giới hạn đầu vào

Hệ thống từ chối hoặc cắt xử lý theo chính sách rõ ràng khi video/transcript vượt giới hạn cho phép. `[ASSUMPTION: giới hạn ban đầu là video tối đa 30 phút; cần xác nhận ở OQ-3.]`

### 4.3 Tạo Nội dung bài học bằng AI

#### FR-8: Tạo đầu ra có cấu trúc

Hệ thống gửi Transcript và Trình độ tới AI, yêu cầu đầu ra JSON theo schema được phiên bản hóa.

#### FR-9: Tạo tóm tắt

Mỗi Bài học có một tóm tắt tiếng Việt và một tóm tắt tiếng Anh ngắn, bám sát Transcript.

#### FR-10: Tạo từ vựng

Mỗi Bài học có 10-20 mục từ vựng hoặc cụm từ quan trọng.

Mỗi mục tối thiểu gồm:
- thuật ngữ;
- loại từ khi phù hợp;
- nghĩa tiếng Việt;
- định nghĩa tiếng Anh đơn giản;
- câu gốc từ Transcript;
- một ví dụ mới phù hợp Trình độ.

#### FR-11: Tạo cụm từ tự nhiên

Mỗi Bài học có đúng 5 collocation, phrasal verb, idiom, slang hoặc cách diễn đạt tự nhiên lấy từ hoặc được chứng minh bởi Transcript.

#### FR-12: Tạo điểm ngữ pháp

Mỗi Bài học có 1-3 điểm ngữ pháp xuất hiện trong Transcript, gồm giải thích ngắn, câu trích dẫn và ví dụ bổ sung.

#### FR-13: Tạo câu hỏi trắc nghiệm

Mỗi Bài học có đúng 5 câu hỏi trắc nghiệm kiểm tra hiểu nội dung, mỗi câu có đáp án đúng và lời giải.

#### FR-14: Tạo bài điền từ

Mỗi Bài học có một bài điền từ ngắn dựa trên Transcript, kèm đáp án.

#### FR-15: Ràng buộc chống bịa đặt

Trích dẫn được gắn là “câu trong video” phải tồn tại trong Transcript hoặc khớp với một đoạn sau chuẩn hóa.

#### FR-16: Xác thực và phục hồi đầu ra AI

Hệ thống phải xác thực JSON trước khi lưu hoặc hiển thị.

**Hệ quả kiểm thử được:**
- Dữ liệu thiếu trường hoặc sai kiểu không được coi là Bài học hoàn chỉnh.
- Hệ thống được phép thử sửa/tạo lại theo giới hạn cấu hình.
- Khi vẫn thất bại, người dùng nhận trạng thái lỗi có thể thử lại.

### 4.4 Trạng thái xử lý

#### FR-17: Hiển thị tiến trình

Trong khi Tạo bài học, giao diện hiển thị các trạng thái:
1. Đang kiểm tra video.
2. Đang lấy transcript.
3. Đang phân tích nội dung.
4. Đang tạo từ vựng và bài tập.
5. Đang hoàn thiện bài học.
6. Bài học đã sẵn sàng.

#### FR-18: Phục hồi sau tải lại trang

Nếu người dùng tải lại trang trong khi xử lý, hệ thống phải có thể hiển thị lại trạng thái hiện tại hoặc kết quả cuối cùng thay vì làm mất yêu cầu đã tạo.

### 4.5 Trải nghiệm Bài học

#### FR-19: Hiển thị Bài học

Trang Bài học hiển thị:
- metadata và video nhúng;
- tóm tắt tiếng Việt và tiếng Anh;
- Transcript có timestamp;
- từ vựng;
- cụm từ;
- điểm ngữ pháp;
- câu hỏi trắc nghiệm;
- bài điền từ.

#### FR-20: Điều hướng bằng timestamp

Người dùng có thể bấm một timestamp để mở hoặc điều khiển video đến vị trí tương ứng trong khả năng của trình phát nhúng.

#### FR-21: Làm bài tập

Người dùng có thể chọn đáp án, nộp bài và xem kết quả cùng lời giải trong phiên hiện tại.

`[ASSUMPTION: MVP không lưu từng đáp án hoặc điểm kiểm tra; chỉ lưu trạng thái Hoàn thành của Bài học.]`

#### FR-22: Đánh dấu Hoàn thành

Người dùng có thể chuyển Bài học giữa hai trạng thái chưa hoàn thành và Hoàn thành.

### 4.6 Lưu và quản lý Bài học

#### FR-23: Lưu Bài học

Bài học được lưu tự động sau khi đầu ra AI vượt qua xác thực.

#### FR-24: Xem Thư viện

Người dùng có thể xem Bài học của chính mình, tối thiểu gồm tiêu đề video, thumbnail, Trình độ, ngày tạo và trạng thái Hoàn thành.

#### FR-25: Mở lại Bài học

Người dùng có thể mở lại một Bài học đã lưu mà không gọi lại AI.

#### FR-26: Xóa Bài học

Người dùng có thể xóa một Bài học sau bước xác nhận.

**Hệ quả kiểm thử được:**
- Không còn truy cập được Bài học từ tài khoản sau khi xóa.
- Dữ liệu phụ thuộc được xóa hoặc vô hiệu hóa theo chính sách dữ liệu.

### 4.7 Danh tính và quyền sở hữu

#### FR-27: Xác thực người dùng

Hệ thống cung cấp cơ chế đăng ký, đăng nhập và đăng xuất. `[ASSUMPTION: email magic link là cơ chế mặc định để giảm scope; cần xác nhận ở OQ-1.]`

#### FR-28: Cô lập dữ liệu

Người dùng chỉ có thể xem, sửa trạng thái hoặc xóa Bài học thuộc tài khoản của mình.

## 5. Kiến trúc thông tin và bề mặt sản phẩm

MVP có đúng ba bề mặt chính:

1. **Tạo bài học** — URL, Trình độ, nút Tạo bài học, trạng thái xử lý và lỗi.
2. **Bài học** — video, Nội dung bài học, bài tập và trạng thái Hoàn thành.
3. **Thư viện** — danh sách, mở lại và xóa Bài học.

Các màn hình xác thực tối thiểu được xem là bề mặt hỗ trợ, không phải tính năng sản phẩm độc lập.

## 6. Yêu cầu phi chức năng

### 6.1 Khả dụng và responsive

- Các luồng chính sử dụng được trên trình duyệt desktop và mobile hiện đại.
- Biểu mẫu, trạng thái lỗi và nội dung bài học phải dùng được bằng bàn phím.
- Mục tiêu accessibility ban đầu: các thành phần cốt lõi đáp ứng WCAG 2.1 AA ở mức thực dụng.

### 6.2 Hiệu năng

- Phản hồi kiểm tra URL phải bắt đầu trong vòng 2 giây ở điều kiện bình thường.
- Trang Thư viện và Bài học đã lưu phải hiển thị dữ liệu chính trong vòng 3 giây ở điều kiện bình thường.
- Tạo bài học có thể mất lâu hơn nhưng phải luôn hiển thị trạng thái và không để request treo vô thời hạn.

### 6.3 Độ tin cậy

- Một yêu cầu tạo Bài học phải có định danh để tránh tạo trùng khi người dùng tải lại trang.
- Lỗi từ transcript provider hoặc AI provider phải được phân loại và ghi log.
- Không hiển thị đầu ra AI chưa qua schema validation.

### 6.4 Bảo mật

- API key chỉ tồn tại phía server và không được gửi tới trình duyệt.
- Mọi truy cập Bài học đều phải kiểm tra quyền sở hữu phía server.
- Có rate limit cơ bản cho thao tác Tạo bài học.
- Không ghi API key, token đăng nhập hoặc toàn bộ nội dung nhạy cảm vào log.

### 6.5 Quan sát hệ thống

Tối thiểu phải ghi nhận:
- yêu cầu tạo bài học bắt đầu/thành công/thất bại;
- loại lỗi;
- thời gian từng giai đoạn;
- số lần AI phải tạo lại do schema lỗi;
- lượng đầu vào/đầu ra nếu provider cung cấp để theo dõi chi phí.

## 7. Ràng buộc và guardrail

### 7.1 Nội dung và tính trung thực

- Nội dung phải dựa trên Transcript.
- Không tuyên bố một câu nằm trong video nếu không đối chiếu được với Transcript.
- Ví dụ mới do AI tạo phải được phân biệt rõ với câu gốc.
- MVP dùng tiếng Việt để giải thích và tiếng Anh cho nội dung học.

### 7.2 Pháp lý và dữ liệu

- Không tải hoặc lưu video/audio.
- Chỉ xử lý video công khai mà hệ thống được phép truy cập.
- Cần quyết định chính thức về việc lưu toàn bộ Transcript trước khi PRD được final. Xem OQ-4.
- Khi người dùng xóa Bài học, dữ liệu liên quan phải tuân theo chính sách xóa được xác nhận.
- Trước public launch phải có Privacy Policy và Terms of Use phù hợp với cách dùng YouTube, Transcript và AI provider.

### 7.3 Chi phí và lạm dụng

- Transcript phải có giới hạn trước khi gửi AI.
- Yêu cầu tạo bài học phải có quota/rate limit.
- MVP không có thanh toán.
- Nhà cung cấp AI, model và ngân sách chưa được khóa trong PRD; sẽ được quyết định ở Architecture khi có tài khoản/API key.

## 8. Không phải mục tiêu

MVP không:

- tạo transcript bằng speech-to-text;
- hỗ trợ video không có transcript phù hợp;
- chấm hoặc phân tích phát âm;
- ghi âm người dùng;
- cung cấp hội thoại với giáo viên AI;
- cung cấp flashcard độc lập hoặc spaced repetition;
- lưu điểm chi tiết, streak hoặc gamification;
- hỗ trợ học nhóm, giáo viên hoặc lớp học;
- chia sẻ Bài học công khai;
- có thanh toán hoặc subscription;
- có ứng dụng mobile native;
- có browser extension;
- hỗ trợ podcast URL hoặc nguồn video ngoài YouTube;
- cung cấp marketplace;
- cho phép tùy chỉnh số từ vựng, độ dài bài hoặc ngôn ngữ giải thích trong MVP.

## 9. Phạm vi MVP

### 9.1 Trong phạm vi

- Web responsive.
- Xác thực tối thiểu và dữ liệu riêng theo người dùng.
- Nhập URL YouTube và chọn Trình độ.
- Kiểm tra Video hợp lệ.
- Lấy và hiển thị Transcript có timestamp.
- Tạo Nội dung bài học có cấu trúc.
- Trạng thái xử lý và lỗi rõ ràng.
- Video nhúng và timestamp điều hướng.
- Làm trắc nghiệm và bài điền từ trong phiên.
- Lưu, mở lại, đánh dấu Hoàn thành và xóa Bài học.
- Thư viện Bài học.

### 9.2 Ngoài phạm vi

Mọi mục trong §8 và mọi tính năng không trực tiếp phục vụ vòng giá trị:

`nhập video → tạo bài học → học → lưu/mở lại/xóa`.

## 10. Tiêu chí thành công

### Chỉ số chính

- **SM-1 — Tỷ lệ tạo bài học thành công:** ít nhất 80% đối với tập video thử nghiệm đáp ứng điều kiện Video hợp lệ. Xác thực FR-3 đến FR-18.
- **SM-2 — Thời gian tạo bài học:** median dưới 90 giây đối với video trong giới hạn MVP, không tính sự cố provider. Xác thực FR-5 đến FR-18.
- **SM-3 — Hoàn thành vòng giá trị:** ít nhất 60% phiên tạo thành công dẫn đến việc người dùng mở phần bài tập hoặc đánh dấu Hoàn thành trong giai đoạn beta. Xác thực FR-19 đến FR-22.

### Chỉ số phụ

- **SM-4 — Mở lại:** ít nhất 25% người dùng beta mở lại một Bài học đã lưu trong vòng 7 ngày. Xác thực FR-23 đến FR-25.
- **SM-5 — Ổn định schema AI:** ít nhất 95% lượt tạo nhận đầu ra hợp lệ sau tối đa số lần retry cho phép. Xác thực FR-8 và FR-16.
- **SM-6 — Tỷ lệ lỗi có thể hiểu:** 100% lỗi đã biết trong `IDEA.md` được ánh xạ thành thông báo người dùng cụ thể. Xác thực FR-3, FR-5, FR-7, FR-16 và FR-18.

### Counter-metrics

- **SM-C1 — Không tối ưu số bài học bằng cách bỏ chất lượng:** số bài học tạo ra không được đánh đổi bằng trích dẫn sai hoặc nội dung không bám Transcript.
- **SM-C2 — Không tối ưu tốc độ bằng cách bỏ xác thực:** đầu ra AI chưa hợp lệ không được hiển thị để giảm thời gian chờ.
- **SM-C3 — Không tối ưu retention bằng thông báo gây phiền:** MVP không thêm email marketing hoặc notification ngoài luồng cốt lõi.

## 11. Tiêu chí chấp nhận MVP

MVP được xem là sẵn sàng sử dụng thật khi:

1. Người dùng có thể hoàn thành UJ-1, UJ-2 và UJ-3 trên desktop và mobile browser.
2. Tất cả FR-1 đến FR-28 được triển khai hoặc một FR được loại bỏ bằng quyết định sản phẩm có ghi nhận.
3. Các lỗi phổ biến trong `IDEA.md` có hành vi và thông báo rõ ràng.
4. Đầu ra AI được schema-validation và không bịa trích dẫn được gắn là câu gốc.
5. Dữ liệu Bài học được cô lập theo tài khoản.
6. Bài học đã lưu mở lại được mà không gọi lại AI.
7. Có kiểm thử tự động cho URL parsing, schema AI, quyền sở hữu và luồng E2E cốt lõi.
8. Privacy Policy/Terms of Use và quyết định lưu Transcript đã được xử lý trước public launch.

## 12. Câu hỏi mở

### Câu hỏi chặn final PRD

- **OQ-1 — Mô hình đăng nhập:** bắt buộc đăng nhập trước khi tạo Bài học, hay cho phép khách tạo một bài rồi yêu cầu đăng nhập để lưu? Đây là quyết định sản phẩm lớn ảnh hưởng UX, dữ liệu và chống lạm dụng.
- **OQ-2 — Chế độ phát hành đầu tiên:** private beta có danh sách người dùng hay public beta? Quyết định này ảnh hưởng quota, abuse protection, pháp lý và mức độ observability.
- **OQ-3 — Giới hạn video:** xác nhận thời lượng tối đa. PRD đang giả định 30 phút.
- **OQ-4 — Lưu Transcript:** lưu toàn bộ Transcript để mở lại Bài học, chỉ lưu các đoạn được dùng, hay lấy lại Transcript khi mở? Đây là quyết định pháp lý, dữ liệu và trải nghiệm.
- **OQ-5 — Phụ đề tự động:** MVP có chấp nhận auto-generated captions của YouTube hay chỉ phụ đề do chủ kênh cung cấp? Điều này ảnh hưởng coverage và chất lượng.

### Câu hỏi được trì hoãn tới Architecture

- **OQ-6 — AI provider/model/API key và ngân sách hàng tháng.**
- **OQ-7 — Transcript provider hoặc thư viện cụ thể.**
- **OQ-8 — Tài khoản Supabase/database và hosting/deployment.**
- **OQ-9 — Chính sách quota cụ thể cho mỗi tài khoản/ngày.**

## 13. Chỉ mục giả định

- §2.4 — Người dùng đăng nhập trước khi tạo Bài học.
- §4.1 — Mục tiêu học mặc định là học toàn diện và không có selector trong MVP.
- FR-7 — Video tối đa 30 phút.
- FR-21 — Không lưu đáp án hoặc điểm chi tiết; chỉ lưu trạng thái Hoàn thành.
- FR-27 — Email magic link là cơ chế xác thực mặc định.
- Toàn tài liệu — Giải thích cố định bằng tiếng Việt trong MVP.
- Toàn tài liệu — Chỉ hỗ trợ YouTube công khai có Transcript phù hợp.

## 14. Cổng chuyển pha

Không viết code và không scaffold ứng dụng trước khi:

1. OQ-1 đến OQ-5 được quyết định;
2. PRD được cập nhật, review và chuyển `status: final`;
3. `bmad-ux` hoàn tất ba bề mặt chính;
4. `bmad-architecture`, `bmad-create-epics-and-stories` và `bmad-check-implementation-readiness` hoàn tất.
