---
id: SPEC-vidlish-lesson-engine
companions:
  - lesson-schema.md
  - selection-algorithm.md
  - cefr-rubrics.md
  - activity-catalog.md
  - generation-quality-pipeline.md
  - language-eligibility.md
sources:
  - ../../../IDEA.md
  - ../../planning-artifacts/prds/prd-vidlish-2026-08-03/prd.md
  - ../../planning-artifacts/prds/prd-vidlish-2026-08-03/language-eligibility-amendment.md
  - ../../planning-artifacts/research/domain-youtube-lesson-content-design-2026-08-03.md
---

> **Canonical contract.** SPEC này và các companion trong `companions:` là contract đầy đủ cho việc thiết kế, triển khai và kiểm thử Lesson Engine. Không tự mở rộng ngoài contract nếu chưa cập nhật SPEC.

# Vidlish Lesson Engine

## Why

Vidlish chỉ có giá trị khi biến nội dung tiếng Anh thực sự xuất hiện trong video thành một bài học giúp người Việt hiểu, ghi nhớ và sử dụng tiếng Anh. Một lời gọi AI đơn lẻ dễ tạo summary, danh sách từ khó và quiz ngẫu nhiên nhưng không đảm bảo level fit, evidence, progression hoặc hiệu quả học. Lesson Engine phải biến video đủ điều kiện tiếng Anh thành một chuỗi học có mục tiêu, có bằng chứng và có quality gate trước khi publish.

## Capabilities

- **CAP-1 — Phân tích video như nguồn học**
  - **intent:** Hệ thống có thể phân loại genre, cấu trúc nội dung, độ khó và các semantic segment để biết video có thể dạy gì.
  - **success:** Với mỗi video thử nghiệm, engine tạo video analysis có genre, topic, difficulty, segment map và ít nhất một evidence segment cho mỗi claim nội dung.

- **CAP-2 — Lập learning outcomes**
  - **intent:** Hệ thống có thể chọn tối đa ba learning outcomes phù hợp với video và CEFR của người học.
  - **success:** Mọi section và activity trong lesson truy được về ít nhất một learning outcome; không có section mồ côi.

- **CAP-3 — Chọn teachable moments**
  - **intent:** Hệ thống có thể chọn đúng từ, chunk, grammar/pragmatics và đoạn nghe đáng học thay vì chọn mọi thứ khó.
  - **success:** Mỗi item được publish có evidence segment, teaching-value score, level fit và lý do chọn; proper noun hoặc item quá chuyên ngành bị loại trừ trừ khi cần để hiểu video.

- **CAP-4 — Cá nhân hóa theo CEFR**
  - **intent:** Hệ thống có thể thay đổi độ khó giải thích, mức hỗ trợ, loại câu hỏi và mức production theo A1–C1.
  - **success:** Cùng một video tạo ra lesson khác biệt thực chất giữa A1, B1 và C1 theo rubric trong `cefr-rubrics.md`, không chỉ đổi wording.

- **CAP-5 — Tạo Core Lesson có progression**
  - **intent:** Hệ thống có thể tạo một Core Lesson 10–20 phút theo progression activation → gist → noticing → practice → retrieval → transfer → reflection.
  - **success:** Lesson hoàn chỉnh có đủ các phase bắt buộc, estimated duration nằm trong budget và không vượt cognitive-load limits của level.

- **CAP-6 — Grounding tuyệt đối về nguồn video**
  - **intent:** Hệ thống có thể chứng minh mọi source quote, detail question và claim về video bằng transcript segment ID.
  - **success:** Không publish lesson nếu có segment ID không tồn tại, quote không khớp transcript chuẩn hóa hoặc câu hỏi không có evidence.

- **CAP-7 — Tạo exercise có đáp án hợp lệ**
  - **intent:** Hệ thống có thể tạo gist, detail, inference, listening-decoding, retrieval và transfer activities có mục đích học rõ ràng.
  - **success:** Mỗi scored activity có answer key, rationale và evidence; validator xác nhận đáp án duy nhất hoặc acceptance criteria rõ ràng.

- **CAP-8 — Co giãn theo video**
  - **intent:** Hệ thống có thể rút ngắn lesson khi video nghèo teachable content và chia video dài thành overview + micro-lessons khi cần.
  - **success:** Engine không bịa item để đủ quota và không nhồi video dài vào một lesson vượt budget.

- **CAP-9 — Kiểm định trước publish**
  - **intent:** Hệ thống có thể chấm và sửa lesson qua structural, grounding, pedagogy, CEFR, naturalness và exercise-validity gates.
  - **success:** Lesson chỉ được publish khi vượt mọi hard gate và đạt quality score tối thiểu quy định trong `generation-quality-pipeline.md`.

- **CAP-10 — Traceability và versioning**
  - **intent:** Hệ thống có thể lưu model, prompt, schema, rubric và source versions để tái tạo hoặc so sánh lesson.
  - **success:** Mỗi lesson lưu `schema_version`, `pipeline_version`, `prompt_version`, `model_id`, `transcript_hash` và quality report.

- **CAP-11 — Provider independence**
  - **intent:** Hệ thống có thể thay Gemini bằng provider khác mà không thay đổi lesson domain contract.
  - **success:** Domain schema và validators không phụ thuộc field hoặc response format riêng của một model provider.

- **CAP-12 — Benchmark chất lượng**
  - **intent:** Hệ thống có thể đánh giá thay đổi prompt/model bằng một bộ video và golden expectations ổn định.
  - **success:** Mọi thay đổi pipeline chạy regression evaluation trên ít nhất 10 video đa genre × nhiều level trước khi được dùng cho production.

- **CAP-13 — Xác nhận nguồn tiếng Anh trước Lesson Engine**
  - **intent:** Hệ thống chỉ tạo bài học khi video có đủ lời nói tiếng Anh gốc, đáng tin cậy và liền mạch để làm nguồn học.
  - **success:** Video không đủ tiếng Anh dừng trước mọi model call của Lesson Engine với `VIDEO_LANGUAGE_UNSUPPORTED`; không có lesson nào dùng bản dịch hoặc tiếng Anh do AI tạo làm source evidence.

## Constraints

- `language-eligibility.md` được thực thi trước Video Analyst và là hard gate.
- Transcript segment IDs là nguồn sự thật cho mọi nội dung gắn với video.
- Source quote, listening, grammar noticing và scored evidence chỉ dùng segment chứa lời nói tiếng Anh gốc.
- Không dịch video không phải tiếng Anh, không tạo English track/TTS thay thế và không coi generated English là nội dung video.
- Không dùng one-shot `transcript → complete lesson → publish` làm production path.
- Deterministic validators, không phải LLM reviewer, quyết định hard gates về schema, segment existence, counts và answerability.
- Language explanation mặc định là tiếng Việt; target language, source quote và generated example là tiếng Anh.
- Core Lesson MVP có estimated completion time 10–20 phút; video dài phải được segment hoặc chuyển thành series.
- Số lượng language items co giãn theo CEFR và teaching value; không ép đủ quota bằng item chất lượng thấp.
- Mọi generated example phải được đánh dấu khác với source quote.
- Không publish output chưa qua schema versioning và quality report.
- Transcript/STT có thể sai; engine phải mang confidence và tránh tạo exercise từ segment chất lượng thấp.
- Không bắt đầu implementation Lesson Engine trước khi SPEC này được dùng trong Architecture, Epics/Stories và Implementation Readiness.

## Non-goals

- Tạo bài học tiếng Anh bằng cách dịch video có ngôn ngữ nguồn khác tiếng Anh.
- Tạo giọng đọc hoặc bản dub tiếng Anh để thay thế audio gốc.
- Chấm phát âm tự động hoặc speech scoring trong MVP.
- Adaptive sequencing theo thời gian thực dựa trên từng câu trả lời trong MVP.
- Spaced repetition, flashcard deck độc lập hoặc long-term learner model trong MVP.
- IELTS/TOEIC mode, teacher authoring, classroom analytics hoặc public lesson marketplace.
- Tạo một lesson giống hệt nhau cho mọi genre và mọi level.
- Dùng engagement, streak hoặc số item làm đại diện cho learning outcome.
- Tự động tuyên bố chất lượng giáo dục chỉ dựa trên điểm do cùng model tạo lesson chấm.

## Success signal

Trên benchmark gồm các video tiếng Anh đủ điều kiện thuộc hội thoại, vlog, phỏng vấn, tutorial, giáo dục, tin tức, comedy/slang và video dài, Vidlish tạo được Core Lesson khác biệt theo CEFR, hoàn thành trong 10–20 phút, không có quote giả hoặc câu hỏi vô đáp án, và đạt ít nhất 90% quality-gate pass rate sau tối đa một vòng sửa có giới hạn. Video không đủ tiếng Anh bị chặn trước Lesson Engine với lý do rõ ràng.

## Assumptions

- Mapping level sản phẩm: Beginner=A1, Elementary=A2, Intermediate=B1, Upper Intermediate=B2, Advanced=C1.
- MVP chỉ cung cấp Core Lesson; focus mode là mở rộng sau MVP.
- Người học chưa có vocabulary history đủ tin cậy, nên personalization MVP dựa trên CEFR, genre và transcript.
- Gemini là provider ban đầu nhưng không phải contract lâu dài.
- Ngưỡng eligibility số học được cấu hình và kiểm thử, nhưng không được coi vài từ tiếng Anh rời rạc là đủ điều kiện.

## Open Questions

- Golden benchmark sẽ được người có chuyên môn tiếng Anh nào review trước private beta?
- Mức ngân sách tối đa cho số lần generation/review/repair trên mỗi lesson là bao nhiêu khi chọn Gemini model và billing plan?