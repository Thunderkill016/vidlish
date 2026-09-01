---
title: Vidlish MVP
status: final
created: 2026-08-03
updated: 2026-08-03
source:
  - IDEA.md
  - _bmad-output/planning-artifacts/research/technical-all-transcript-acquisition-strategies-2026-08-03.md
  - _bmad-output/planning-artifacts/research/domain-youtube-lesson-content-design-2026-08-03.md
  - _bmad-output/specs/spec-vidlish-lesson-engine/SPEC.md
track: Full BMad Method - Greenfield
working_mode: Fast path
---

# PRD: Vidlish MVP

## 0. Mục đích tài liệu

Tài liệu này khóa yêu cầu sản phẩm của Vidlish MVP trước UX, Architecture, Epics/Stories và implementation. Vidlish phải chứng minh một vòng giá trị duy nhất: người dùng chọn một video YouTube họ quan tâm, hệ thống lấy hoặc tạo transcript, biến transcript thành một bài học tiếng Anh có chất lượng, rồi cho phép học, lưu, mở lại và xóa.

Chi tiết thuật toán Lesson Engine nằm trong `_bmad-output/specs/spec-vidlish-lesson-engine/` và là contract bắt buộc cho downstream workflows.

## 1. Tầm nhìn

Vidlish là ứng dụng web biến video YouTube công khai mà người dùng có thể phát thành bài học tiếng Anh cá nhân hóa cho người Việt Nam tự học.

Sản phẩm không chỉ tóm tắt video hoặc liệt kê từ khó. Vidlish phải chọn đúng đoạn và ngôn ngữ đáng học, lập learning outcomes phù hợp CEFR, tạo chuỗi hoạt động từ hiểu nội dung đến nhớ lại và sử dụng, rồi chỉ publish bài học khi vượt qua các quality gate về grounding, level, teaching value và exercise validity.

Lời hứa của MVP:

> Dán một video YouTube công khai có thể phát, chọn trình độ và nhận một Core Lesson 10–20 phút có bằng chứng từ video, có thể học và mở lại.

Việc video không có caption không phải lỗi cuối cùng. Hệ thống phải chuyển sang phương án transcript khác, bao gồm audio-to-text khi người dùng cấp quyền phù hợp.

## 2. Người dùng mục tiêu

### 2.1 Người dùng chính

Người Việt Nam tự học tiếng Anh ở mức A1–C1, thường xem YouTube và muốn biến nội dung họ chủ động chọn thành một bài học có hướng dẫn thay vì xem thụ động.

### 2.2 Jobs To Be Done

- Khi tìm thấy video tiếng Anh đáng quan tâm, tôi muốn biến nó thành bài học mà không tự chép transcript hoặc soạn bài tập.
- Khi người nói nhanh hoặc dùng ngôn ngữ tự nhiên, tôi muốn biết đoạn nào đáng học và hiểu cách dùng trong ngữ cảnh.
- Khi học, tôi muốn đi từ hiểu ý chính đến nhớ và dùng được ngôn ngữ quan trọng.
- Khi quay lại, tôi muốn mở đúng bài học cũ mà không trả chi phí tạo lại.

### 2.3 Không phải người dùng của MVP

- Giáo viên cần quản lý lớp, giao bài hoặc chấm học sinh.
- Trẻ em cần chế độ kiểm soát nội dung chuyên biệt.
- Người cần chấm phát âm tự động, AI tutor chat hoặc học nhóm.
- Người cần xử lý video private/restricted mà họ không có quyền truy cập.
- Người cần mobile native, marketplace hoặc subscription.

## 3. Hành trình người dùng

### UJ-1 — Minh tạo bài học từ video

Minh đã đăng nhập, dán URL YouTube và chọn trình độ. Vidlish kiểm tra video, thử lấy caption theo waterfall. Nếu không lấy được caption, hệ thống hướng Minh sang phương án fallback phù hợp như chia sẻ audio của tab hoặc cung cấp transcript/audio mà Minh có quyền sử dụng. Hệ thống hiển thị tiến trình, tạo transcript chuẩn hóa, chạy Lesson Engine và tự lưu bài học khi qua quality gate.

**Khoảnh khắc giá trị:** Minh thấy một Core Lesson có learning outcomes, video map, nội dung chọn lọc, hoạt động nghe hiểu, retrieval và transfer thay vì một danh sách AI ngẫu nhiên.

### UJ-2 — Minh học bài

Minh mở bài học, làm activation/gist trước khi phụ thuộc hoàn toàn vào transcript, xem các đoạn quan trọng theo timestamp, học language items có evidence, làm comprehension, retrieval và transfer. Minh nhận đáp án/lời giải cho hoạt động có chấm điểm và có thể đánh dấu hoàn thành.

### UJ-3 — Minh quản lý thư viện

Minh xem các bài học của mình, mở lại mà không gọi lại transcript/AI, lọc theo trạng thái cơ bản và xóa bài học sau xác nhận. Dữ liệu phụ thuộc được xóa theo chính sách retention của MVP.

## 4. Thuật ngữ

- **Video hợp lệ** — Video YouTube công khai, tồn tại và có thể phát trong ngữ cảnh người dùng; không bị xóa, private hoặc chặn quyền truy cập bắt buộc.
- **Transcript Acquisition Waterfall** — Chuỗi phương án lấy caption hoặc tạo transcript, tự chuyển bước khi một phương án thất bại.
- **Transcript** — Các segment văn bản có stable ID, timestamp, nguồn và confidence khi có.
- **Core Lesson** — Bài học 10–20 phút theo progression activation → gist → noticing → practice → retrieval → transfer → reflection.
- **Language Item** — Từ, chunk, collocation, phrasal verb, idiom, grammar hoặc pragmatic insight được chọn vì teaching value.
- **Evidence Segment** — Segment transcript chứng minh một claim, source quote hoặc đáp án.
- **Lesson Engine** — Pipeline phân tích, chọn nội dung, lập mục tiêu, tạo hoạt động, kiểm tra và sửa bài học trước publish.
- **Quality Gate** — Điều kiện bắt buộc về schema, grounding, level fit, exercise validity và quality score.
- **Trình độ** — A1, A2, B1, B2 hoặc C1; UI có thể dùng nhãn thân thiện nhưng dữ liệu lưu theo CEFR.
- **Thư viện** — Danh sách bài học thuộc tài khoản hiện tại.

## 5. Tính năng và yêu cầu chức năng

### 5.1 Xác thực và quyền sở hữu

#### FR-1 — Đăng nhập trước khi tạo

Người dùng phải đăng nhập trước khi bắt đầu một generation job.

**Chấp nhận:**
- Hỗ trợ đăng ký, đăng nhập và đăng xuất tối thiểu.
- Job, Transcript và Lesson luôn có owner.
- Người dùng khác không thể đọc, sửa hoặc xóa dữ liệu không thuộc mình.

#### FR-2 — Private beta

MVP được phát hành dưới dạng private beta để kiểm chứng coverage, chất lượng lesson, chi phí và rủi ro trước public launch.

### 5.2 Nhập và kiểm tra video

#### FR-3 — Nhập URL YouTube

Người dùng có thể dán các dạng URL YouTube phổ biến; hệ thống suy ra video ID và từ chối input không hợp lệ.

#### FR-4 — Chọn trình độ

Người dùng chọn một level A1–C1 trước khi tạo. Đây là personalization control bắt buộc duy nhất của MVP.

#### FR-5 — Metadata và khả năng phát

Hệ thống lấy tối thiểu title, channel, thumbnail và duration khi có, đồng thời phân biệt video không tồn tại, private, restricted hoặc không thể phát.

#### FR-6 — Không đặt trần thời lượng cứng ở cấp sản phẩm

MVP không từ chối video chỉ vì vượt một số phút cố định. Hệ thống phải dùng token/cost budget, chunking và xử lý bất đồng bộ. Video dài có thể tạo overview lesson và các micro-lesson thay vì nhồi toàn bộ vào một Core Lesson.

**Chấp nhận:**
- Không silently truncate transcript.
- Trước khi chạy tác vụ tốn kém, hệ thống có thể báo ước tính thời gian hoặc yêu cầu xác nhận nếu vượt quota cấu hình.
- Architecture được phép đặt hard safety limit kỹ thuật để bảo vệ hệ thống, nhưng không biến nó thành lời hứa sản phẩm cố định.

### 5.3 Transcript Acquisition Waterfall

#### FR-7 — Caption fast path

Hệ thống ưu tiên manual caption và auto-caption có sẵn, giữ nguồn và confidence.

#### FR-8 — Hosted transcript provider fallback

Khi fast path thất bại, hệ thống có thể gọi transcript provider đã cấu hình phía server.

#### FR-9 — Unofficial extractor fallback

Private beta có thể dùng extractor không chính thức sau abstraction provider, với timeout, retry có giới hạn và khả năng thay thế khi YouTube thay đổi.

#### FR-10 — Audio-to-text fallback

`NO_CAPTIONS` không phải trạng thái thất bại cuối. Hệ thống phải cung cấp ít nhất một đường audio-to-text có sự đồng ý của người dùng, ưu tiên web tab-audio capture; extension hoặc desktop companion nằm ngoài MVP web nhưng kiến trúc không được ngăn cản chúng.

#### FR-11 — User-provided fallback

Người dùng có thể paste transcript hoặc upload subtitle; upload audio/video chỉ áp dụng cho nội dung họ có quyền sử dụng.

#### FR-12 — Chuẩn hóa Transcript

Mỗi segment có stable ID, text, start timestamp, end/duration khi có, source và confidence khi có. Hệ thống loại segment trống, duplicate/corrupt và không bịa phần bị thiếu.

#### FR-13 — Chính sách lưu dữ liệu

MVP lưu Transcript chuẩn hóa cần thiết để mở Lesson mà không gọi lại provider. Không lưu video. Audio capture chỉ tồn tại tạm thời trong thời gian transcription và bị xóa sau khi Transcript được tạo hoặc job thất bại.

Khi Lesson cuối cùng phụ thuộc vào Transcript bị xóa, Transcript và dữ liệu tạm liên quan được xóa theo retention job. Legal review bắt buộc trước public launch.

### 5.4 Lesson Engine

#### FR-14 — Deterministic preprocessing

Transcript phải được normalize, gắn segment ID, hash, source/confidence và đánh dấu là untrusted input trước khi gửi model.

#### FR-15 — Phân tích video

Lesson Engine phân loại genre, topic, structure, difficulty, semantic sections, listening challenges và low-confidence regions. Mọi claim phải có evidence segment.

#### FR-16 — Khai thác language candidates

Engine tạo candidate pool lớn hơn số item cần publish, bao gồm form, kind, CEFR, register, context meaning, evidence, usefulness và transferability.

#### FR-17 — Chọn learning outcomes

Engine chọn tối đa ba learning outcomes dựa trên video và level. Mọi section/activity phải phục vụ ít nhất một outcome.

#### FR-18 — Chọn teachable moments

Engine chọn language items theo teaching value, không chỉ theo độ khó. Proper noun, item quá chuyên ngành hoặc item không chuyển giao được bị loại trừ trừ khi cần để hiểu video.

#### FR-19 — Core Lesson co giãn

Core Lesson có progression:

1. Activation/prediction.
2. Gist.
3. Summary/video map.
4. Noticing language.
5. Guided practice/listening decoding.
6. Comprehension.
7. Retrieval.
8. Transfer/production.
9. Reflection/exit ticket.

Số lượng item co giãn theo level và teaching value. Engine không bịa nội dung để đạt quota.

#### FR-20 — Cá nhân hóa CEFR thực chất

Cùng một video phải tạo ra lesson khác nhau về mức hỗ trợ, số item, loại câu hỏi, độ sâu giải thích và production demand giữa A1, B1 và C1; không chỉ đổi wording.

#### FR-21 — Grounding bằng segment ID

Source quote, factual claim, detail question, grammar evidence và answer rationale phải tham chiếu segment ID tồn tại. Generated example được đánh dấu riêng với source quote.

#### FR-22 — Structured output và versioning

Mọi stage AI trả dữ liệu theo schema version hóa. Lesson lưu `schema_version`, `pipeline_version`, `prompt_version`, `model_id`, `transcript_hash` và quality report.

#### FR-23 — Multi-stage generation

Production path bắt buộc là:

`Video Analyst → Language Miner → Objective Planner → Activity Composer → Validators → Reviewer → Targeted Repair → Final Gate`.

Không cho phép one-shot `transcript → complete lesson → publish`.

#### FR-24 — Provider independence

Gemini là implementation của `LessonGenerationProvider`, không phải domain contract. Hệ thống có thể thay provider mà không thay Lesson schema và deterministic validators.

### 5.5 Validation và quality gate

#### FR-25 — Structural validation

Lesson sai schema, field type, enum hoặc relationship không được lưu thành Lesson hoàn chỉnh.

#### FR-26 — Grounding validation

Segment ID không tồn tại, source quote không khớp hoặc claim thiếu evidence là hard failure.

#### FR-27 — Exercise validity

Mỗi activity có chấm điểm phải có answer key, rationale và evidence/acceptance criteria. Multiple-choice phải có đúng một đáp án tốt nhất.

#### FR-28 — Quality score

Lesson chỉ publish khi vượt mọi hard gate và đạt tối thiểu 14/16 theo rubric. Grounding và exercise validity phải đạt mức tối đa.

#### FR-29 — Targeted repair

Khi một module lỗi, hệ thống sửa đúng module đó với lỗi validation cụ thể. Tối đa một vòng structural repair và một vòng semantic repair trước khi fail closed.

#### FR-30 — Golden regression set

Thay đổi model, prompt, schema hoặc selector phải chạy regression evaluation trên tối thiểu 10 video đa genre và nhiều level trước production.

### 5.6 Trạng thái xử lý

#### FR-31 — Generation job bền vững

Hệ thống tạo job có ID và idempotency key trước khi gọi provider. Reload không làm mất trạng thái hoặc tạo lại job ngoài ý muốn.

#### FR-32 — Trạng thái người dùng hiểu được

UI hiển thị các stage phù hợp, tối thiểu: kiểm tra video, lấy/tạo transcript, phân tích video, chọn nội dung học, tạo hoạt động, kiểm định và hoàn tất.

#### FR-33 — Lỗi có hành động tiếp theo

Mỗi lỗi đã biết được map sang thông báo tiếng Việt và hành động cụ thể: thử provider khác, chia sẻ tab, paste/upload transcript, thử lại hoặc chọn video khác.

### 5.7 Trải nghiệm Lesson

#### FR-34 — Lesson Viewer

Trang Lesson hiển thị video/player, learning outcomes, summary/video map, Transcript có timestamp, language items, activities, đáp án/lời giải và quality/provenance tối thiểu cần thiết cho debug nội bộ.

#### FR-35 — Timestamp interaction

Bấm evidence/timestamp điều khiển video đến đoạn tương ứng khi player hỗ trợ.

#### FR-36 — Làm hoạt động

Người dùng làm gist/comprehension/listening/retrieval activities, nộp câu có chấm điểm và xem feedback. MVP không cần lưu từng đáp án dài hạn.

#### FR-37 — Transfer và reflection

Lesson có ít nhất một transfer/production prompt và một exit ticket; các prompt mở có tiêu chí tự đánh giá nhưng chưa cần AI chấm.

#### FR-38 — Hoàn thành

Người dùng có thể đánh dấu Lesson hoàn thành hoặc chưa hoàn thành.

### 5.8 Thư viện

#### FR-39 — Lưu tự động

Lesson được publish và lưu tự động chỉ sau khi Final Quality Gate pass.

#### FR-40 — Mở lại không tạo lại

Người dùng mở Lesson đã lưu mà không gọi lại transcript hoặc Lesson Engine.

#### FR-41 — Danh sách và xóa

Thư viện hiển thị title, thumbnail, level, ngày tạo, trạng thái và generation source cơ bản. Người dùng có thể mở và xóa Lesson sau xác nhận.

## 6. Kiến trúc thông tin

MVP có ba bề mặt sản phẩm chính:

1. **Create Lesson** — URL, CEFR, metadata, generation stages và fallback transcript.
2. **Lesson Viewer** — video, lesson progression, transcript/evidence và activities.
3. **Library** — danh sách, mở lại, trạng thái và xóa.

Bề mặt hỗ trợ:

- Authentication.
- Tab-audio permission/capture flow.
- Paste/upload transcript fallback.
- Error/retry dialogs.

## 7. Yêu cầu phi chức năng

### 7.1 Bảo mật và riêng tư

- API key, service role và provider credentials chỉ ở server.
- Ownership được kiểm tra ở server và database policy.
- Transcript/audio được coi là dữ liệu người dùng lựa chọn; không log toàn bộ prompt hoặc transcript.
- Audio tạm bị xóa theo retention ngắn.
- Có rate limit và quota theo account/job.

### 7.2 Độ tin cậy

- Provider nằm sau adapter và có timeout/retry/circuit breaker hợp lý.
- Job state không chỉ nằm trong memory của một request.
- Fail closed khi Lesson chưa đạt quality gate.
- Hệ thống ghi provider/model/prompt/schema versions để tái tạo lỗi.

### 7.3 Hiệu năng

- Kiểm tra URL/metadata phải phản hồi hoặc bắt đầu phản hồi trong khoảng 2 giây ở điều kiện bình thường.
- Lesson/Library đã lưu hiển thị dữ liệu chính trong khoảng 3 giây ở điều kiện bình thường.
- Generation dài chạy bất đồng bộ và luôn có trạng thái; không để request treo vô thời hạn.

### 7.4 Accessibility

Các luồng cốt lõi dùng được bằng bàn phím, có transcript, labels, focus states và responsive web. Mục tiêu thực dụng: WCAG 2.1 AA cho các thành phần chính.

### 7.5 Observability và chi phí

Mỗi job ghi latency từng stage, acquisition strategy, transcript source/confidence, model/provider, token usage, retry/repair, quality result và cost estimate. Không log secrets hoặc full transcript.

## 8. Non-goals của MVP

- Chấm phát âm hoặc speech scoring.
- AI tutor chat.
- Adaptive sequencing theo từng câu trả lời trong thời gian thực.
- Spaced repetition hoặc flashcard deck độc lập.
- Lưu điểm chi tiết, streak hoặc gamification.
- Giáo viên/lớp học, social hoặc public sharing.
- Subscription/payment.
- Mobile native.
- Chrome extension và desktop companion như deliverable MVP; kiến trúc chỉ cần mở đường cho chúng.
- Podcast/nguồn video ngoài YouTube.
- Tùy chỉnh sâu focus mode, lesson length hoặc language of explanation trong UI MVP.

## 9. Tiêu chí thành công

### Primary

- **SM-1 — Acquisition coverage:** ít nhất 90% tập video public/playable đại diện có thể tạo Transcript qua ít nhất một strategy; `NO_CAPTIONS` không kết thúc flow nếu audio fallback khả dụng.
- **SM-2 — Grounded lesson:** 100% Lesson publish không có segment ID giả hoặc source quote không khớp.
- **SM-3 — Exercise validity:** ít nhất 98% scored items trong benchmark có đáp án hợp lệ; lỗi còn lại bị gate chặn trước publish.
- **SM-4 — Lesson quality:** ít nhất 80% lesson trong golden evaluation đạt rubric 14/16 trở lên mà không cần human repair.
- **SM-5 — Core loop completion:** ít nhất 60% generation thành công dẫn đến người dùng mở activity hoặc đánh dấu hoàn thành trong private beta.

### Secondary

- **SM-6 — Reopen:** ít nhất 25% beta users mở lại một Lesson trong 7 ngày.
- **SM-7 — Generation recovery:** reload/retry không tạo trùng Lesson và phục hồi đúng trạng thái trong 100% E2E test.
- **SM-8 — Provider resilience:** lỗi của một transcript strategy được chuyển sang strategy tiếp theo hoặc UX fallback đúng theo policy.

### Counter-metrics

- Không tối ưu coverage bằng cách âm thầm tải/lưu video hoặc bỏ qua quyền người dùng.
- Không tối ưu tốc độ bằng cách bỏ validators hoặc publish lesson chất lượng thấp.
- Không tối ưu số lượng language items bằng cách chọn item không có teaching value.
- Không tối ưu engagement bằng notification gây phiền hoặc gamification ngoài scope.

## 10. MVP Acceptance

MVP sẵn sàng private beta khi:

1. UJ-1, UJ-2 và UJ-3 chạy được trên desktop và mobile browser.
2. Caption, auto-caption và ít nhất một audio-to-text fallback chạy được end-to-end.
3. Lesson Engine tuân thủ `SPEC-vidlish-lesson-engine` và toàn bộ companion.
4. Mọi Lesson publish vượt hard gates và lưu quality report.
5. Ownership isolation, idempotency và xóa dữ liệu vượt test.
6. Có unit/integration/E2E test cho URL parsing, transcript normalization, acquisition fallback, schema, grounding, exercise validity, RLS/ownership và core loop.
7. Private beta có quota, observability và cost telemetry.
8. Privacy Policy/Terms/legal review được hoàn thành trước public launch, không chặn private beta nội bộ có kiểm soát.

## 11. Quyết định đã chốt

- Bắt buộc đăng nhập trước generation.
- Private beta trước public launch.
- Không đặt giới hạn thời lượng video cố định ở cấp sản phẩm; dùng budget/chunking/series.
- Chấp nhận manual caption, auto-caption và STT transcript, giữ source/confidence.
- `NO_CAPTIONS` kích hoạt fallback, không kết thúc flow.
- Lưu Transcript chuẩn hóa; không lưu video; audio chỉ tạm thời.
- Core Lesson 10–20 phút và nội dung co giãn theo teaching value/CEFR.
- Lesson Engine multi-stage, provider-independent, deterministic hard gates.
- Explanation language mặc định tiếng Việt; target/source content tiếng Anh.

## 12. Câu hỏi chuyển sang Architecture

Các mục dưới đây không chặn PRD final; chúng cần tài khoản, API key, chi phí hoặc đánh giá triển khai:

- Gemini model/API key và ngân sách tháng.
- Transcript provider thương mại nào được phép dùng trong private beta.
- STT provider mặc định và chính sách audio retention cụ thể.
- Hosting, database/auth project và background job mechanism.
- Quota account/day và cost ceiling/job.
- Hard safety limits kỹ thuật theo model/platform.

## 13. Cổng triển khai

PRD này đã final. Không viết code trước khi hoàn thành:

1. `bmad-ux`.
2. `bmad-architecture`.
3. `bmad-create-epics-and-stories`.
4. `bmad-check-implementation-readiness`.
5. `bmad-sprint-planning`.
