# IDEA.md

## Tên ý tưởng

**Vidlish**

## Tagline

**Any video. Your English lesson.**

## Mô tả ngắn

Người dùng chỉ cần dán đường link của một video YouTube bất kỳ. Hệ thống sẽ phân tích nội dung video và tự động biến nó thành một bài học tiếng Anh có cấu trúc, phù hợp với trình độ của người học.

## Vấn đề cần giải quyết

Người học tiếng Anh thường:

- Muốn học qua nội dung thực tế nhưng không biết chọn từ vựng, ngữ pháp và đoạn hội thoại quan trọng.
- Khó hiểu video tiếng Anh khi người nói nói nhanh, dùng từ lóng hoặc phát âm không rõ.
- Mất nhiều thời gian tự tạo ghi chú, bài tập và flashcard.
- Dễ xem video một cách thụ động nhưng không thực sự ghi nhớ hoặc cải thiện kỹ năng.

## Giải pháp

Xây dựng một ứng dụng web cho phép người dùng:

1. Dán link video YouTube.
2. Chọn trình độ tiếng Anh hiện tại.
3. Hệ thống lấy transcript hoặc tạo transcript từ video.
4. AI phân tích nội dung.
5. Hệ thống tạo thành một bài học tiếng Anh hoàn chỉnh.
6. Người dùng học, làm bài tập và xem lại tiến độ.

## Đối tượng người dùng

- Người Việt Nam đang học tiếng Anh.
- Người học trình độ A1 đến C1.
- Người muốn học tiếng Anh qua YouTube, podcast, phỏng vấn, phim, tin tức hoặc video giáo dục.
- Người tự học và không có giáo viên hướng dẫn thường xuyên.

## Giá trị cốt lõi

**Biến bất kỳ video YouTube nào thành một bài học tiếng Anh cá nhân hóa trong vài phút.**

## Luồng sử dụng chính

1. Người dùng truy cập trang chủ.
2. Dán link YouTube.
3. Chọn trình độ:
   - Beginner
   - Elementary
   - Intermediate
   - Upper Intermediate
   - Advanced
4. Chọn mục tiêu học:
   - Từ vựng
   - Nghe hiểu
   - Phát âm
   - Ngữ pháp
   - Giao tiếp
   - Học toàn diện
5. Nhấn **Tạo bài học**.
6. Hệ thống xử lý video.
7. Người dùng nhận được bài học gồm:
   - Tóm tắt nội dung
   - Transcript
   - Từ vựng quan trọng
   - Cụm từ tự nhiên
   - Điểm ngữ pháp
   - Bài luyện nghe
   - Câu hỏi trắc nghiệm
   - Bài tập điền từ
   - Bài tập nói
   - Flashcard
8. Người dùng hoàn thành bài học và lưu tiến độ.

## Nội dung một bài học

### 1. Tổng quan video

- Tiêu đề video
- Kênh YouTube
- Thời lượng
- Chủ đề
- Độ khó ước tính
- Tóm tắt bằng tiếng Việt
- Tóm tắt bằng tiếng Anh

### 2. Transcript

- Transcript đầy đủ
- Chia transcript theo từng đoạn
- Có timestamp
- Cho phép bấm vào timestamp để mở đúng vị trí trong video
- Làm nổi bật câu hoặc từ đang học

### 3. Từ vựng quan trọng

Mỗi từ gồm:

- Từ hoặc cụm từ
- Phiên âm
- Loại từ
- Nghĩa tiếng Việt
- Định nghĩa tiếng Anh đơn giản
- Câu gốc trong video
- Ví dụ mới
- Mức độ phổ biến
- Nút thêm vào flashcard

### 4. Cụm từ và cách diễn đạt tự nhiên

- Collocations
- Phrasal verbs
- Idioms
- Slang
- Cách diễn đạt thường dùng trong giao tiếp
- Giải thích ngữ cảnh sử dụng

### 5. Ngữ pháp

- Cấu trúc ngữ pháp xuất hiện trong video
- Giải thích ngắn gọn
- Trích dẫn câu trong video
- Ví dụ bổ sung
- Bài tập áp dụng

### 6. Luyện nghe

- Nghe từng đoạn ngắn
- Ẩn transcript
- Điều chỉnh tốc độ phát
- Nghe và điền từ còn thiếu
- Nghe và sắp xếp câu
- Nghe và chọn đáp án đúng

### 7. Kiểm tra hiểu nội dung

- Câu hỏi trắc nghiệm
- Câu hỏi đúng hoặc sai
- Câu hỏi trả lời ngắn
- Giải thích đáp án

### 8. Luyện nói

- Shadowing theo từng câu
- Gợi ý câu để người dùng đọc lại
- Ghi âm giọng nói
- So sánh phát âm với câu gốc
- Chấm điểm phát âm trong phiên bản nâng cao

### 9. Flashcard

- Từ vựng
- Nghĩa
- Ví dụ
- Âm thanh
- Ôn tập theo spaced repetition

## MVP

Phiên bản đầu tiên chỉ cần có:

1. Ô nhập link YouTube.
2. Kiểm tra link hợp lệ.
3. Lấy transcript có sẵn của video.
4. Cho người dùng chọn trình độ.
5. AI tạo:
   - Tóm tắt video
   - 10 đến 20 từ vựng quan trọng
   - 5 cụm từ tự nhiên
   - 1 đến 3 điểm ngữ pháp
   - 5 câu hỏi trắc nghiệm
   - 1 bài tập điền từ
6. Hiển thị transcript có timestamp.
7. Cho phép lưu bài học.
8. Trang lịch sử các bài học đã tạo.

## Không thuộc phạm vi MVP

Các tính năng sau chưa cần làm trong phiên bản đầu:

- Tự động chấm phát âm.
- Ứng dụng mobile native.
- Học nhóm.
- Giáo viên AI nói chuyện trực tiếp.
- Tạo transcript cho mọi video không có phụ đề.
- Thanh toán.
- Spaced repetition nâng cao.
- Extension trình duyệt.

## Yêu cầu chức năng

### Tạo bài học

- Người dùng nhập một URL YouTube.
- Hệ thống xác thực URL.
- Hệ thống lấy thông tin video.
- Hệ thống lấy transcript.
- Hệ thống gửi transcript cho AI.
- Hệ thống tạo nội dung bài học theo trình độ.
- Hệ thống lưu kết quả vào cơ sở dữ liệu.

### Quản lý bài học

- Xem danh sách bài học.
- Mở lại bài học.
- Xóa bài học.
- Đánh dấu hoàn thành.
- Hiển thị ngày tạo và tiến độ.

### Cá nhân hóa

- Chọn trình độ.
- Chọn ngôn ngữ giải thích.
- Chọn mục tiêu học.
- Chọn số lượng từ vựng.
- Chọn độ dài bài học.

## Yêu cầu phi chức năng

- Giao diện dễ sử dụng trên điện thoại và máy tính.
- Thời gian phản hồi cần được tối ưu.
- Hiển thị trạng thái xử lý rõ ràng.
- Không làm mất bài học nếu người dùng tải lại trang.
- Có xử lý lỗi khi video riêng tư, bị xóa hoặc không có transcript.
- Không lưu nội dung video trái phép ngoài phạm vi cần thiết.
- Hạn chế độ dài transcript gửi tới AI để kiểm soát chi phí.

## Trạng thái xử lý đề xuất

Khi tạo bài học, giao diện hiển thị lần lượt:

1. Đang kiểm tra video.
2. Đang lấy transcript.
3. Đang phân tích nội dung.
4. Đang tạo từ vựng và bài tập.
5. Đang hoàn thiện bài học.
6. Bài học đã sẵn sàng.

## Các trường hợp lỗi

- Link không hợp lệ.
- Video không tồn tại.
- Video riêng tư.
- Video giới hạn độ tuổi.
- Video không có transcript.
- Transcript quá dài.
- Ngôn ngữ video không được hỗ trợ.
- AI trả về dữ liệu sai cấu trúc.
- Vượt giới hạn sử dụng.
- Mất kết nối trong lúc xử lý.

## Mô hình dữ liệu sơ bộ

### User

- id
- email
- name
- english_level
- learning_goal
- created_at

### Video

- id
- youtube_video_id
- url
- title
- channel_name
- thumbnail_url
- duration
- source_language
- transcript
- created_at

### Lesson

- id
- user_id
- video_id
- level
- learning_goal
- summary_vi
- summary_en
- vocabulary
- phrases
- grammar_points
- exercises
- status
- progress
- created_at
- updated_at

### Flashcard

- id
- user_id
- lesson_id
- term
- meaning
- example
- next_review_at
- review_count
- created_at

## Kiến trúc gợi ý cho MVP

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend

- Next.js Route Handlers hoặc Server Actions
- Supabase cho database và authentication
- Một AI API để phân tích transcript và tạo bài học

### Dịch vụ ngoài

- YouTube Data API để lấy metadata video
- Transcript API hoặc thư viện lấy phụ đề YouTube
- AI model để tạo nội dung bài học

## Nguyên tắc tạo bài học bằng AI

AI phải:

- Dựa trên nội dung thực tế của transcript.
- Không bịa câu không xuất hiện trong video khi trích dẫn.
- Điều chỉnh độ khó theo trình độ người dùng.
- Giải thích bằng tiếng Việt rõ ràng.
- Ưu tiên từ và cụm từ hữu ích trong giao tiếp.
- Trả về dữ liệu có cấu trúc JSON.
- Tạo đáp án và lời giải cho từng bài tập.
- Tránh tạo nội dung không phù hợp với người học nhỏ tuổi nếu chưa xác định độ tuổi.

## Cấu trúc đầu ra AI đề xuất

```json
{
  "video_summary": {
    "vi": "",
    "en": ""
  },
  "difficulty": "",
  "vocabulary": [],
  "phrases": [],
  "grammar_points": [],
  "comprehension_questions": [],
  "fill_in_the_blank": [],
  "speaking_practice": []
}
```

## Tiêu chí hoàn thành MVP

MVP được xem là hoàn thành khi:

- Người dùng có thể dán một link YouTube hợp lệ.
- Hệ thống lấy được transcript.
- Hệ thống tạo được một bài học phù hợp với trình độ.
- Bài học hiển thị đầy đủ, dễ đọc.
- Người dùng có thể lưu và mở lại bài học.
- Hệ thống xử lý được các lỗi phổ biến.
- Nội dung AI trả về ổn định theo đúng cấu trúc.

## Chỉ số đánh giá ban đầu

- Tỷ lệ tạo bài học thành công.
- Thời gian trung bình để tạo một bài học.
- Tỷ lệ người dùng hoàn thành bài học.
- Số bài học trung bình mỗi người dùng tạo.
- Tỷ lệ người dùng quay lại.
- Số từ được thêm vào flashcard.
- Điểm trung bình của bài kiểm tra sau bài học.

## Hướng phát triển sau MVP

- Tạo transcript bằng speech-to-text khi video không có phụ đề.
- Phân tích và chấm phát âm.
- Hội thoại với AI dựa trên chủ đề video.
- Lộ trình học tự động.
- Flashcard spaced repetition.
- Extension học trực tiếp trên YouTube.
- Chế độ học cho trẻ em.
- Chế độ dành cho IELTS, TOEIC và giao tiếp.
- Chia sẻ bài học công khai.
- Marketplace bài học do cộng đồng tạo.
- Gói miễn phí và gói trả phí.

## Giả thuyết cần kiểm chứng

1. Người học thực sự muốn học từ video họ tự chọn.
2. Một bài học ngắn từ 10 đến 20 phút có tỷ lệ hoàn thành cao hơn bài học dài.
3. Từ vựng lấy từ nội dung người dùng quan tâm sẽ dễ ghi nhớ hơn từ vựng ngẫu nhiên.
4. Người dùng sẵn sàng quay lại nếu lịch sử học và tiến độ được lưu.
5. Chất lượng transcript ảnh hưởng trực tiếp đến chất lượng bài học.

## Phiên bản sản phẩm đầu tiên nên xây

Một trang web đơn giản gồm ba màn hình:

1. **Trang nhập video**
   - Ô dán link YouTube
   - Chọn trình độ
   - Chọn mục tiêu
   - Nút tạo bài học

2. **Trang bài học**
   - Video nhúng
   - Tóm tắt
   - Transcript
   - Từ vựng
   - Ngữ pháp
   - Bài tập

3. **Trang thư viện**
   - Danh sách bài học đã tạo
   - Trạng thái hoàn thành
   - Nút mở lại hoặc xóa

## Tuyên bố sản phẩm

> Dán một video YouTube. Nhận một bài học tiếng Anh được cá nhân hóa.
