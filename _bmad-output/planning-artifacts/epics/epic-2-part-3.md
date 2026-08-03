# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án (phần 3)

Companion tiếp nối `epic-2-part-2.md`, gồm Story 2.5–2.9.

## Story 2.5 — Nhận transcript hoặc subtitle từ người dùng

**As a** người học có video mà Vidlish không thể tự lấy lời thoại,
**I want** dán transcript hoặc tải tệp phụ đề lên cho generation job hiện tại,
**So that** tôi có thể tiếp tục tạo bài mà không phải bắt đầu lại từ đầu.

**Requirements:** FR11–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 · NFR2–4, NFR7–9, NFR12–16 · AR2–8, AR11–14, AR20–21, AR28 · UX-DR9–14, UX-DR27–32.

**Acceptance Criteria:**

**Given** automatic transcript strategies đã cạn nhưng job còn phục hồi được
**When** workflow yêu cầu user input
**Then** job chuyển `awaiting_user_input` tại phase `Lấy hoặc tạo transcript`
**And** workflow dùng durable wait/event
**And** reload `/jobs/{jobId}` khôi phục đúng video, CEFR và fallback state.

**Given** fallback card hiển thị trong Story 2.5
**When** người dùng mở hành động `Cung cấp transcript`
**Then** chỉ hai phương án hoạt động là dán transcript và tải `.srt`/`.vtt`
**And** tab-audio control chưa được render trước Story 2.6
**And** UX không đề xuất dịch video.

**Given** người dùng dán nội dung
**When** transcript trống hoặc chỉ có whitespace
**Then** hiển thị lỗi inline và không đánh thức workflow
**And** draft chưa submit không được gửi vào analytics hay production logs.

**Given** pasted transcript có timestamp hợp lệ
**When** parser chạy
**Then** timestamp được giữ
**And** plain text không timing được đánh dấu `timingQuality: none`
**And** hệ thống không bịa timestamp
**And** source không timing không hỗ trợ seek hoặc scored listening evidence cần thời gian chính xác.

**Given** người dùng tải subtitle
**When** server kiểm tra file
**Then** validate extension, MIME signature, size, encoding, cue structure, timestamp range và cue count
**And** executable, archive, oversized file hoặc extension/MIME mismatch bị từ chối
**And** unsafe markup bị loại mà không rewrite, dịch hoặc paraphrase lời nói.

**Given** người dùng chuẩn bị submit
**When** form hiển thị
**Then** họ xác nhận chỉ cung cấp nội dung mình có quyền sử dụng
**And** audit metadata lưu `confirmedByUser`, `confirmedAt` và `inputType`
**And** copy không tuyên bố Vidlish đã xác minh quyền sở hữu.

**Given** input được submit
**When** server xử lý
**Then** xác nhận job thuộc user, chưa terminal, đang chờ đúng input và payload qua Zod
**And** user không thể attach vào job người khác
**And** browser không tự chọn workflow stage.

**Given** input được lưu thành công
**When** workflow resume
**Then** phát `lesson.transcript-input-provided.v1` với job ID, opaque artifact ID và input version
**And** event không chứa transcript body
**And** stable event ID ngăn resume trùng.

**Given** candidate hợp lệ
**When** workflow tiếp tục
**Then** candidate validation → deterministic normalization → canonical persistence → `checking_language`
**And** không bỏ qua language gate
**And** declared language không đủ để gắn English
**And** translated transcript không được coi là original English speech.

**Given** parse/validation thất bại
**When** lỗi trả về
**Then** job vẫn `awaiting_user_input`
**And** user sửa text/chọn file khác trong cùng job
**And** lỗi ổn định gồm `TRANSCRIPT_INPUT_EMPTY`, `TRANSCRIPT_FILE_UNSUPPORTED`, `TRANSCRIPT_FILE_TOO_LARGE`, `TRANSCRIPT_PARSE_FAILED`, `TRANSCRIPT_TIMESTAMPS_INVALID` và `TRANSCRIPT_INPUT_ALREADY_USED`.

**Given** artifact user-provided được xử lý hoặc job bị cancel
**When** cleanup chạy
**Then** temporary artifact bị xóa theo policy
**And** canonical transcript/provenance owner-scoped và RLS-protected
**And** logs không chứa transcript body.

**Given** hai tab submit gần đồng thời
**When** server xử lý
**Then** chỉ input đầu hợp lệ được attach
**And** input còn lại nhận safe conflict
**And** không tạo canonical transcript kép.

**Given** Story 2.5 vào CI
**When** tests chạy
**Then** có parser/security/MIME/size/RLS/idempotency/durable-resume tests
**And** có E2E paste thành công và upload lỗi rồi sửa cùng job
**And** CI không gọi provider thật.

## Story 2.6 — Tạo transcript từ audio của tab

**As a** người học không có transcript hoặc subtitle,
**I want** cho phép Vidlish ghi âm tab YouTube mà tôi đang phát,
**So that** hệ thống tạo transcript từ lời nói thật mà không lưu toàn bộ video.

**Requirements:** FR10, FR12, FR13, FR31–FR33, FR-LANG-1–FR-LANG-5 · NFR1, NFR3–8, NFR12–16 · AR10–14, AR20–21, AR24, AR28–29 · UX-DR11–14, UX-DR27–32.

**Acceptance Criteria:**

**Given** job đang chờ transcript và browser hỗ trợ tab capture audio
**When** user mở `Cách khác`
**Then** UI hiển thị `Ghi âm tab video`
**And** giải thích scope, mục đích, start/stop và retention
**And** không capture trước consent trực tiếp.

**Given** browser không hỗ trợ capability
**When** detection chạy
**Then** control bị ẩn/disabled có giải thích
**And** paste/upload vẫn dùng được
**And** capability thực được kiểm tra, không chỉ user-agent sniffing.

**Given** user bắt đầu capture
**When** browser mở picker
**Then** hướng dẫn chọn đúng tab YouTube và chia sẻ audio
**And** Vidlish không tự chọn tab
**And** chỉ dùng stream browser cấp quyền.

**Given** permission denied, tab không audio hoặc stream kết thúc
**When** client phát hiện
**Then** job vẫn `awaiting_user_input`
**And** trả lỗi `CAPTURE_PERMISSION_DENIED`, `CAPTURE_AUDIO_NOT_AVAILABLE` hoặc `CAPTURE_ENDED`
**And** không tạo transcript rỗng hay unsupported-language result.

**Given** capture đang chạy
**When** audio được thu
**Then** chia thành bounded chunks có sequence, duration và checksum
**And** upload private temporary storage qua authorized endpoint
**And** không tải/persist video
**And** không giữ một blob audio lớn trong memory.

**Given** chunk upload lỗi tạm thời
**When** mạng phục hồi
**Then** retry cùng chunk ID
**And** server deduplicate theo job + session + sequence
**And** user có thể stop an toàn.

**Given** capture hoàn tất
**When** manifest hợp lệ
**Then** workflow resume bằng versioned event chỉ chứa job ID và capture-session ID
**And** không STT trước manifest validation
**And** session phải thuộc đúng owner/job.

**Given** STT adapter chạy
**When** audio được transcribe
**Then** dùng `SpeechToTextPort` với bounded requests, exact provider/model ID và confidence/timestamps khi có
**And** config yêu cầu verbatim transcription, không dịch, tóm tắt, sửa grammar hay English rewrite.

**Given** nhiều STT chunks trả về
**When** merge chạy
**Then** ghép deterministic theo sequence/timestamp
**And** overlap deduplicate theo versioned rule
**And** không bịa content tại khoảng thiếu
**And** source là `tab-audio-stt`.

**Given** candidate hợp lệ
**When** workflow tiếp tục
**Then** normalization → canonical persistence → `checking_language`
**And** low-confidence speech không tự thành eligible English.

**Given** capture/STT hoàn tất, lỗi, hết hạn hoặc cancel
**When** cleanup chạy
**Then** raw chunks và manifest tạm bị xóa
**And** cleanup idempotent/retryable
**And** canonical transcript/provenance được giữ theo policy
**And** audio bytes/transcript text không vào logs.

**Given** reload trong lúc capture
**When** browser stream mất
**Then** UI báo capture đã dừng và cho phép bắt đầu lại
**And** job không đổi
**And** stale session được cleanup, không ghi âm ẩn.

**Given** Story 2.6 vào CI
**When** tests chạy
**Then** có capability, consent, permission, no-audio, stop, reload, chunk ordering/idempotency, manifest, STT fixture, cleanup và language-gate tests
**And** CI không capture tab hoặc gọi provider thật.

## Story 2.7 — Xử lý video dài bằng budget và chunking

**As a** người học dùng video dài,
**I want** Vidlish chia công việc có kiểm soát và không cắt nội dung âm thầm,
**So that** kết quả phản ánh trung thực phạm vi hệ thống đã xử lý.

**Requirements:** FR6, FR12, FR31, FR32 · NFR7, NFR12, NFR15–17, NFR20 · AR6, AR8, AR15, AR20, AR22–24, AR29–30 · UX-DR9–10, UX-DR27, UX-DR32.

**Acceptance Criteria:**

**Given** video/transcript dài
**When** GenerationPolicy đánh giá
**Then** không dùng một hard duration cap duy nhất
**And** áp dụng versioned budgets cho characters/tokens, segments, chunk count, provider requests, estimated cost và wall-clock
**And** budgets nằm trong typed config.

**Given** input vượt một request
**When** chunk planner chạy
**Then** chia deterministic theo timestamp và semantic boundary khi có
**And** mỗi chunk có stable ID, ordinal và source range
**And** retry được từng chunk
**And** không silently truncate đầu, giữa hoặc cuối.

**Given** budget không đủ xử lý toàn bộ source
**When** policy dừng/chọn phạm vi
**Then** không claim toàn video đã được xử lý
**And** partial artifact được đánh dấu rõ và không vào Lesson Engine như complete source
**And** phạm vi chọn phải deterministic, có provenance và product error/action rõ nếu không đủ tạo lesson.

**Given** chunk results được merge
**When** aggregate chạy
**Then** coverage được tính từ canonical source ranges
**And** overlap/gap được phát hiện
**And** missing coverage vượt threshold chặn handoff
**And** cùng inputs/policy version tạo cùng plan/result.

**Given** workflow retry
**When** chunk đã thành công
**Then** persisted result được tái sử dụng
**And** stable step IDs ngăn gọi lại không cần thiết
**And** cache key chứa source hash, chunk-plan version và provider/schema versions.

**Given** job đạt eligible transcript handoff
**When** Generation page cập nhật
**Then** hiển thị `Đã chuẩn bị lời thoại tiếng Anh`
**And** source hash, timing quality, coverage và eligible English set đã persist
**And** Epic 3 có thể tiếp tục từ `analyzing_video`.

**Given** Story 2.7 vào CI
**When** tests chạy
**Then** có long-input chunking, boundary, overlap/gap, no-truncation, partial-source rejection, per-chunk retry và deterministic-plan tests
**And** CI dùng fixtures.

## Story 2.8 — Kiểm soát quota, retry và cancellation

**As a** người học đang tạo bài,
**I want** job chịu lỗi, tránh request trùng và có thể hủy,
**So that** tôi không bị kẹt hoặc phát sinh chi phí ngoài ý muốn.

**Requirements:** FR31–FR33 · NFR5–8, NFR12, NFR15–16 · AR6–9, AR21, AR24, AR29–30 · UX-DR9–11, UX-DR27–28, UX-DR32.

**Acceptance Criteria:**

**Given** job/provider stage sắp bắt đầu
**When** GenerationPolicy chạy
**Then** kiểm tra per-user/global concurrency, quota, rate limit, estimated cost và active jobs trước request tốn tiền
**And** denial dùng stable ProductError
**And** Inngest throttle chỉ là defense in depth.

**Given** provider timeout/rate-limit/network error
**When** workflow xử lý
**Then** bounded exponential retry với stable attempt ID
**And** validation/permission/unsupported-language/policy error không retry vô hạn
**And** circuit breaker tạm dừng provider lỗi lặp lại
**And** strategy khác được thử khi hợp lệ.

**Given** double submit/event redelivery/workflow retry
**When** hệ thống xử lý
**Then** active-job key, stable event ID và step result keys ngăn job/provider call trùng
**And** user reload không tạo run mới.

**Given** user chọn hủy active job
**When** cancel command được authorize/persist
**Then** workflow quan sát cancellation trước bước tốn tiền kế tiếp
**And** không publish transcript/lesson sau cancel
**And** temporary artifacts được đánh dấu cleanup
**And** terminal state là `cancelled` và phục hồi sau reload.

**Given** cancellation trùng hoặc đến sau terminal state
**When** server xử lý
**Then** operation idempotent
**And** không đổi completed/failed state sai cách
**And** trả response an toàn.

**Given** job thất bại hoặc cần action
**When** UI hiển thị
**Then** phân biệt exhausted methods, input required/invalid, capture/STT failure, budget exceeded, cancelled và unsupported language
**And** mỗi state có tối đa một primary action
**And** raw provider error không lộ.

**Given** Story 2.8 vào CI
**When** tests chạy
**Then** có quota/concurrency, retry classification, circuit breaker, event dedup, cancellation race/idempotency và E2E cancel tests
**And** CI dùng fakes.

## Story 2.9 — Dọn dữ liệu tạm và vận hành transcript pipeline

**As a** người học,
**I want** audio/transcript data được giữ đúng thời hạn và job có thể được chẩn đoán an toàn,
**So that** Vidlish bảo vệ dữ liệu của tôi và vận hành ổn định trong private beta.

**Requirements:** FR13, FR31–FR33 · NFR3–4, NFR7, NFR15, NFR18–19 · AR3–5, AR14, AR18, AR23, AR27–30 · UX-DR27, UX-DR32.

**Acceptance Criteria:**

**Given** temporary audio/upload artifact tồn tại
**When** transcript commit, job failure/cancel hoặc TTL đến hạn
**Then** artifact được xóa idempotently
**And** scheduled sweeper xóa orphaned/expired objects
**And** cleanup failure retry và phát internal alert
**And** Vidlish không lưu source video.

**Given** canonical transcript/eligibility/provenance tồn tại
**When** retention evaluator chạy
**Then** giữ hoặc xóa theo owner/dependency/published policy
**And** raw temporary audio không phụ thuộc lesson retention
**And** browser không truy cập cross-owner artifact.

**Given** telemetry ghi acquisition lifecycle
**When** stage/strategy/chunk/cleanup chạy
**Then** metrics gồm job ID, pseudonymous owner, stage duration, strategy, result, retries, coverage, cost band, budget decision và cleanup status
**And** không log transcript text, audio bytes, credentials hoặc sensitive payload.

**Given** local/staging/production
**When** config/deploy chạy
**Then** tách Supabase/Inngest/provider keys, buckets, quotas và data
**And** config validate startup
**And** CI dùng fixtures/fakes, không live provider.

**Given** durable product data được backup/restore
**When** rehearsal chạy
**Then** bao phủ jobs, canonical transcripts và eligibility metadata
**And** không cần backup temporary audio
**And** restore procedure được ghi nhận trước public launch.

**Given** toàn bộ Epic 2 source paths chạy regression
**When** suite chạy
**Then** caption, hosted provider, user input và tab audio đều đi normalization → language gate
**And** `VIDEO_LANGUAGE_UNSUPPORTED` chỉ xuất hiện sau transcript + eligibility conclusion
**And** eligible handoff, methods exhausted, awaiting input và cancelled đều phục hồi được.

**Given** Story 2.9 vào CI
**When** tests chạy
**Then** có TTL/orphan cleanup, retry, RLS/storage, telemetry redaction, environment isolation và restore rehearsal tests.

Epic 2 hoàn tất khi job có một durable outcome: eligible canonical English source tại `analyzing_video`, recoverable wait state, hoặc terminal/actionable state chính xác.