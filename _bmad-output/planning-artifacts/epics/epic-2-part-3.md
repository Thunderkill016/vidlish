# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án (phần 3)

Companion tiếp nối `epic-2-part-2.md`, gồm Story 2.5–2.7.

## Story 2.5 — Nhận transcript hoặc subtitle từ người dùng

**As a** người học có video mà Vidlish không thể tự lấy lời thoại,
**I want** dán transcript hoặc tải tệp phụ đề lên cho generation job hiện tại,
**So that** tôi có thể tiếp tục tạo bài mà không phải bắt đầu lại từ đầu.

**Requirements:** FR11, FR12, FR13, FR31, FR32, FR33, FR-LANG-1–FR-LANG-5 · NFR2–4, NFR7–9, NFR12–16 · AR2–8, AR12–16, AR21–22, AR29 · UX-DR9–14, UX-DR27–32.

**Acceptance Criteria:**

**Given** mọi automatic transcript strategy đã cạn nhưng job còn có thể phục hồi
**When** workflow yêu cầu người dùng cung cấp transcript
**Then** job chuyển sang `awaiting_user_input` tại phase `Lấy hoặc tạo transcript`
**And** workflow dùng durable wait/event thay vì giữ một HTTP request mở
**And** reload `/jobs/{jobId}` vẫn khôi phục đúng fallback state, video và CEFR.

**Given** fallback card được hiển thị
**When** người dùng chọn hành động chính `Cung cấp transcript`
**Then** họ có thể dán plain text hoặc transcript có timestamp, hoặc tải `.srt`/`.vtt`
**And** phương án tab-audio được đặt dưới `Cách khác` khi browser hỗ trợ
**And** UX không đề xuất dịch video sang tiếng Anh.

**Given** người dùng dán transcript
**When** nội dung trống hoặc chỉ có whitespace
**Then** form hiển thị lỗi inline và không đánh thức workflow
**And** nội dung chưa submit không được gửi vào analytics hay production logs.

**Given** transcript dán có timestamp hợp lệ
**When** parser chạy
**Then** timestamp được giữ lại
**And** nếu chỉ có plain text, candidate được đánh dấu `timingQuality: none`
**And** hệ thống không bịa timestamp tương ứng với video
**And** nguồn không có timing chính xác không được dùng cho timestamp seek hoặc scored listening evidence cần timing.

**Given** người dùng tải `.srt` hoặc `.vtt`
**When** server kiểm tra file
**Then** extension, MIME signature, kích thước, encoding, cue structure, timestamp range và cue count đều được validate
**And** executable, archive, file quá lớn hoặc extension/MIME mismatch bị từ chối
**And** cue markup không an toàn bị loại nhưng lời nói gốc không bị rewrite, dịch hoặc paraphrase.

**Given** người dùng chuẩn bị submit
**When** form hiển thị
**Then** họ phải xác nhận chỉ cung cấp nội dung mình có quyền sử dụng
**And** hệ thống lưu audit metadata `confirmedByUser`, `confirmedAt` và `inputType`
**And** confirmation không được mô tả như bằng chứng Vidlish đã xác minh quyền sở hữu.

**Given** job đang `awaiting_user_input`
**When** input được submit
**Then** server xác nhận job thuộc người dùng hiện tại, chưa terminal, đang chờ đúng loại input và payload qua Zod validation
**And** browser không được tự chọn workflow stage kế tiếp
**And** người dùng không thể attach input vào job của người khác.

**Given** input được lưu thành công
**When** application resume workflow
**Then** phát signal/event versioned `lesson.transcript-input-provided.v1`
**And** payload chỉ chứa `jobId`, opaque artifact ID và input version, không chứa toàn bộ transcript
**And** stable event ID ngăn workflow được đánh thức hai lần.

**Given** pasted transcript hoặc uploaded subtitle hợp lệ
**When** workflow tiếp tục
**Then** input đi qua candidate validation → deterministic normalization → canonical transcript persistence → `checking_language`
**And** không bỏ qua language eligibility
**And** declared language do người dùng cung cấp không đủ để đánh dấu transcript là tiếng Anh
**And** translated transcript không được coi là original English speech.

**Given** canonical transcript được tạo từ user input
**When** provenance được lưu
**Then** source là `pasted` hoặc `uploaded`
**And** lưu timing quality, parser version, sanitized filename khi có và rights confirmation
**And** không hiển thị storage path hoặc internal artifact ID.

**Given** parser hoặc validation thất bại
**When** lỗi được trả về
**Then** job vẫn `awaiting_user_input`
**And** người dùng có thể sửa text hoặc chọn file khác mà không tạo job mới
**And** lỗi ổn định gồm tối thiểu `TRANSCRIPT_INPUT_EMPTY`, `TRANSCRIPT_FILE_UNSUPPORTED`, `TRANSCRIPT_FILE_TOO_LARGE`, `TRANSCRIPT_PARSE_FAILED`, `TRANSCRIPT_TIMESTAMPS_INVALID` và `TRANSCRIPT_INPUT_ALREADY_USED`.

**Given** user-provided artifact được xử lý
**When** canonical transcript commit hoặc input thất bại/cancelled
**Then** temporary artifact bị xóa theo policy
**And** canonical transcript thuộc cùng owner với job, được bảo vệ bằng RLS
**And** browser không ghi trực tiếp canonical transcript tables
**And** production logs không chứa transcript body.

**Given** hai tab submit input gần như đồng thời
**When** server xử lý
**Then** chỉ input đầu tiên hợp lệ được attach
**And** input còn lại nhận safe conflict response
**And** không tạo hai canonical transcript cho cùng handoff.

**Given** Story 2.5 được đưa vào CI
**When** test suite chạy
**Then** có unit test cho plain text, timestamped text, SRT và VTT parsing
**And** có security test cho HTML/script trong cue text, invalid encoding, oversized file và MIME mismatch
**And** có RLS, idempotency và durable workflow tests cho `awaiting_user_input → normalizing_transcript → checking_language`
**And** có E2E paste thành công và upload lỗi rồi sửa trong cùng job
**And** CI không gọi provider thật.

## Story 2.6 — Tạo transcript từ audio của tab

**As a** người học không có transcript hoặc subtitle,
**I want** cho phép Vidlish ghi âm tab YouTube mà tôi đang phát,
**So that** hệ thống có thể tạo transcript từ lời nói thật trong video mà không tải hoặc lưu toàn bộ video.

**Requirements:** FR10, FR12, FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 · NFR1, NFR3–8, NFR12–16, NFR20 · AR10, AR12–16, AR21–22, AR25, AR29–30 · UX-DR10, UX-DR13–14, UX-DR27–32.

**Acceptance Criteria:**

**Given** job đang chờ transcript và browser hỗ trợ tab capture có audio
**When** người dùng mở `Cách khác`
**Then** UI hiển thị lựa chọn `Ghi âm tab video`
**And** giải thích rõ audio nào được thu, mục đích, thời điểm bắt đầu/dừng và thời hạn xóa
**And** không bắt đầu capture trước thao tác đồng ý rõ ràng của người dùng.

**Given** browser không hỗ trợ required APIs hoặc không thể capture tab audio
**When** capability detection chạy
**Then** lựa chọn bị ẩn hoặc disabled với giải thích tiếng Việt
**And** paste/upload fallback vẫn sử dụng được
**And** user agent không được coi là nguồn xác nhận duy nhất; capability thực tế phải được kiểm tra.

**Given** người dùng bắt đầu capture
**When** browser mở tab picker
**Then** hướng dẫn yêu cầu chọn đúng tab YouTube và bật chia sẻ âm thanh
**And** Vidlish không có quyền tự chọn tab thay người dùng
**And** capture chỉ nhận stream đã được browser cấp quyền.

**Given** permission bị từ chối, người dùng chọn tab không có audio hoặc stream kết thúc ngay
**When** client phát hiện lỗi
**Then** job vẫn `awaiting_user_input`
**And** hiển thị lỗi hành động được như `CAPTURE_PERMISSION_DENIED`, `CAPTURE_AUDIO_NOT_AVAILABLE` hoặc `CAPTURE_ENDED`
**And** không tạo transcript rỗng hoặc đánh dấu video không hỗ trợ ngôn ngữ.

**Given** capture đang chạy
**When** audio được thu
**Then** client chia stream thành bounded chunks có sequence number, duration và checksum
**And** upload từng chunk vào private temporary storage qua signed/authorized endpoint
**And** không tải xuống hoặc persist toàn bộ video
**And** không giữ một blob audio khổng lồ trong memory.

**Given** chunk upload bị gián đoạn
**When** mạng phục hồi
**Then** client có thể retry chunk chưa xác nhận bằng cùng chunk ID
**And** server deduplicate theo job + capture session + sequence number
**And** đã upload không bị nhân bản
**And** người dùng có thể dừng capture an toàn.

**Given** capture session được hoàn tất
**When** server xác nhận manifest đầy đủ
**Then** workflow resume bằng event versioned chỉ chứa job ID và capture session ID
**And** workflow không bắt đầu STT trước khi manifest hợp lệ
**And** session thuộc đúng owner và đúng job đang chờ.

**Given** workflow xử lý capture session
**When** STT adapter chạy
**Then** audio chunks được truyền theo bounded requests qua `SpeechToTextPort`
**And** exact provider/model ID, timestamps và confidence được giữ khi có
**And** prompt/config yêu cầu transcription nguyên văn, không dịch, không tóm tắt, không sửa grammar và không tạo English rewrite.

**Given** STT trả các phần transcript
**When** hệ thống ghép kết quả
**Then** merge theo sequence/timestamp một cách deterministic
**And** overlap được deduplicate theo rule versioned
**And** không bịa nội dung tại khoảng audio thiếu
**And** candidate source là `tab-audio-stt` với capture/STT provenance.

**Given** transcript STT hợp lệ
**When** workflow tiếp tục
**Then** candidate đi qua normalization → canonical persistence → `checking_language`
**And** không bỏ qua Story 2.3
**And** low-confidence speech không tự được coi là tiếng Anh đủ điều kiện.

**Given** capture hoặc STT hoàn tất, thất bại, hết hạn hoặc job bị cancel
**When** cleanup chạy
**Then** raw audio chunks và manifest tạm bị xóa theo TTL ngắn
**And** cleanup idempotent, retry được và có telemetry
**And** canonical transcript/provenance cần thiết được giữ theo retention policy
**And** không log audio bytes hoặc transcript text.

**Given** người dùng reload trang trong lúc capture
**When** stream browser không còn tồn tại
**Then** UI giải thích capture đã dừng và cho phép bắt đầu lại
**And** job vẫn giữ nguyên
**And** stale capture session được cleanup, không tự tiếp tục ghi âm ẩn.

**Given** Story 2.6 được đưa vào CI
**When** test suite chạy
**Then** có capability, permission, no-audio, stop, reload và cancel tests
**And** có chunk idempotency, ordering, manifest validation, STT fixture và cleanup TTL tests
**And** có E2E simulated capture → STT → normalization → language eligibility
**And** test chứng minh translation/rewrite output bị từ chối
**And** CI không truy cập microphone/tab thật hoặc provider thật.

## Story 2.7 — Xử lý video dài và hoàn thiện độ tin cậy

**As a** người học sử dụng video có độ dài và chất lượng khác nhau,
**I want** generation job xử lý có giới hạn minh bạch, phục hồi được và không cắt nội dung âm thầm,
**So that** tôi biết khi nào Vidlish có thể tiếp tục, cần hành động hoặc phải dừng an toàn.

**Requirements:** FR6, FR12, FR13, FR31–FR33 · NFR3–8, NFR12, NFR15–20 · AR6–9, AR12–16, AR24–25, AR29–30 · UX-DR9–14, UX-DR27–32.

**Acceptance Criteria:**

**Given** video hoặc transcript dài
**When** GenerationPolicy đánh giá job
**Then** không dùng một hard duration cap duy nhất làm điều kiện hỗ trợ
**And** áp dụng versioned budgets cho transcript characters/tokens, chunk count, provider requests, estimated cost, wall-clock time và retries
**And** budget nằm trong typed server config
**And** thay đổi policy được ghi version.

**Given** input vượt khả năng xử lý trong một request
**When** workflow chạy
**Then** transcript/audio được chia chunk deterministic theo timestamp và semantic boundary khi có
**And** chunk có stable ID, ordinal và source range
**And** workflow có thể retry riêng từng chunk
**And** không silently truncate đầu, giữa hoặc cuối video.

**Given** toàn bộ nội dung không thể xử lý trong budget
**When** policy buộc phải dừng hoặc chọn phạm vi
**Then** hệ thống fail closed với product error/action rõ ràng
**And** không giả vờ transcript đầy đủ
**And** mọi partial artifact được đánh dấu partial và không được đưa vào Lesson Engine như nguồn hoàn chỉnh
**And** MVP không tự chọn một đoạn ngẫu nhiên mà không ghi provenance.

**Given** nhiều job chạy đồng thời
**When** scheduler nhận việc
**Then** áp dụng per-user, global và provider concurrency limits
**And** rate limit/quota được kiểm tra trước provider call tốn tiền
**And** rejected/deferred jobs không tạo request trùng
**And** user-facing state phân biệt đang chờ, đang xử lý và cần hành động.

**Given** provider timeout, rate limit hoặc transient error
**When** workflow retry
**Then** retry bounded, exponential và idempotent
**And** circuit breaker ngăn provider lỗi bị gọi liên tục
**And** workflow có thể chuyển strategy khác khi hợp lệ
**And** validation, permission, unsupported-language và policy errors không bị retry vô hạn.

**Given** người dùng yêu cầu cancel một active job
**When** cancel được persist
**Then** workflow quan sát cancellation trước bước tốn tiền tiếp theo
**And** không publish transcript/lesson mới sau cancel
**And** temporary audio/upload artifacts được cleanup
**And** terminal state là `cancelled`, phục hồi được sau reload.

**Given** temporary artifacts tồn tại
**When** TTL sweeper chạy
**Then** artifact hết hạn hoặc orphaned được xóa idempotently
**And** deletion failure được retry và cảnh báo nội bộ
**And** canonical transcript, eligibility report và provenance được giữ hoặc xóa theo dependency/retention policy
**And** Vidlish không lưu video source.

**Given** job kết thúc acquisition
**When** có canonical transcript và language eligibility `eligible`
**Then** job có durable handoff `analyzing_video`
**And** Generation page hiển thị `Đã chuẩn bị lời thoại tiếng Anh` trước khi Epic 3 tiếp quản
**And** transcript source, hash, timing quality, eligible English segment set và policy versions đã được persist.

**Given** job không thể tiếp tục
**When** terminal/actionable state được tạo
**Then** error code phân biệt tối thiểu automatic methods exhausted, user input required/invalid, capture/STT failure, budget exceeded, cancelled và unsupported language
**And** `VIDEO_LANGUAGE_UNSUPPORTED` chỉ được dùng sau khi có transcript và language gate kết luận không đủ original English
**And** mỗi state có tối đa một primary action hợp lý.

**Given** telemetry được ghi
**When** job chạy qua các strategies/chunks
**Then** metrics gồm stage duration, source strategy, chunk count, coverage, retries, cost estimate/actual band, budget decisions, cleanup và terminal result
**And** không log transcript text, audio bytes, credentials hoặc sensitive event body
**And** correlation dùng job ID và pseudonymous owner ID.

**Given** workflow được deploy giữa các môi trường
**When** config và migrations được áp dụng
**Then** local/staging/production tách secrets, providers, quotas và storage buckets
**And** CI không dùng live providers
**And** restore/backup procedure bao phủ durable job, canonical transcript và eligibility metadata, không yêu cầu backup temporary audio.

**Given** Story 2.7 được đưa vào CI
**When** test suite chạy
**Then** có tests cho long transcript chunking, no silent truncation, per-chunk retry, quota/concurrency, cancellation, circuit breaker, budget exceeded và TTL cleanup
**And** có regression workflow cho mọi source: caption, hosted provider, user input và tab audio đều đi normalization → language gate
**And** có E2E cho eligible handoff, unsupported language, exhausted methods và cancellation
**And** CI dùng deterministic fixtures/fakes.

Epic 2 hoàn tất khi mỗi job có một trong các kết quả bền vững: canonical transcript đủ tiếng Anh tại `analyzing_video`, trạng thái chờ input có thể phục hồi, hoặc terminal/actionable state chính xác.