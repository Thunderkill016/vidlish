# Epic 2 — Lấy transcript tiếng Anh bằng nhiều phương án

Người dùng có thể tạo một job bền vững; hệ thống thử caption/provider/STT và user-input fallbacks, chuẩn hóa transcript, kiểm tra ngôn ngữ và chỉ tiếp tục khi video có đủ tiếng Anh gốc.

**FRs covered:** FR6–FR13, FR31–FR33, FR-LANG-1–FR-LANG-5.

## Story 2.1 — Tạo generation job bền vững

**As a** người học đã xác nhận video và chọn CEFR,  
**I want** bắt đầu một generation job có URL và trạng thái được lưu,  
**So that** tôi có thể rời trang, tải lại hoặc gửi nhầm nhiều lần mà không mất tiến trình hay tạo thêm chi phí ngoài ý muốn.

**Requirements:** FR31, FR32, FR33 · NFR2, NFR5, NFR7, NFR12, NFR15 · AD-2–5, AD-13–16, AD-21 · UX-DR9–11, UX-DR27–30.

### Acceptance Criteria

#### AC1 — Tạo job từ dữ liệu đã xác nhận

**Given** người dùng đã đăng nhập, video có trạng thái `playable` và đã chọn CEFR  
**When** nhấn `Tạo bài học`  
**Then** server xác thực lại session, video ID và CEFR  
**And** tạo một `lesson_jobs` record trước khi gọi bất kỳ transcript hoặc AI provider nào  
**And** trả về opaque `jobId`  
**And** trình duyệt chuyển ngay đến `/jobs/{jobId}`  
**And** client không được tự gửi title, channel hoặc metadata để ghi đè nguồn sự thật phía server.

#### AC2 — Mô hình dữ liệu tối thiểu

**Given** Story 2.1 được triển khai  
**When** migrations được áp dụng  
**Then** story chỉ tạo các entity `videos`, `lesson_jobs` và `job_events` cần cho generation lifecycle  
**And** `lesson_jobs` tối thiểu lưu ID, owner, video, CEFR, status, current stage, pipeline version, idempotency key, optional error code/action và timestamps  
**And** chưa tạo Transcript, Lesson hoặc activity tables trong story này.

#### AC3 — Canonical job states

**Given** job lifecycle được khai báo  
**When** schema và domain contract được tạo  
**Then** dùng canonical states `queued`, `validating_video`, `acquiring_transcript`, `awaiting_user_input`, `normalizing_transcript`, `checking_language`, `analyzing_video`, `mining_language`, `planning_lesson`, `composing_activities`, `validating_lesson`, `repairing_lesson`, `publishing`, `completed`, `failed`, `cancelled`  
**And** database value, domain enum, workflow event và UI mapping dùng cùng một versioned contract  
**And** trạng thái không được biểu diễn bằng string tự phát trong từng component.

#### AC4 — Idempotent submission

**Given** một người dùng gửi cùng video, CEFR và pipeline version nhiều lần trong khi job cũ còn active  
**When** command `CreateLessonJob` chạy  
**Then** hệ thống trả lại job đang tồn tại  
**And** không tạo thêm record hoặc workflow run  
**And** active-job key là owner + video + CEFR + pipeline version  
**And** database constraint hoặc transaction lock chống được hai request đồng thời, không chỉ debounce ở client.

#### AC5 — GenerationPolicy trước khi tạo job

**Given** người dùng yêu cầu tạo job  
**When** application đánh giá request  
**Then** `GenerationPolicy` kiểm tra quyền private beta, active-job concurrency, rate limit, video và CEFR hợp lệ  
**And** khi bị từ chối, không tạo job hoặc phát Inngest event  
**And** trả product error ổn định như `JOB_CONCURRENCY_LIMIT`, `ACCOUNT_QUOTA_EXCEEDED` hoặc `RATE_LIMITED`  
**And** exact cost budgets được mở rộng ở Story 2.7.

#### AC6 — Phát workflow event an toàn

**Given** job đã được persist thành công  
**When** application bắt đầu xử lý  
**Then** phát versioned event `lesson.generation-requested.v1` với `jobId` và `pipelineVersion`  
**And** event ID derive từ `jobId + pipelineVersion`  
**And** nếu việc gửi event tạm thời thất bại, job vẫn tồn tại ở `queued`  
**And** retry dùng cùng event ID, không tạo workflow trùng.

#### AC7 — Một workflow duy nhất được điều khiển trạng thái

**Given** Inngest nhận generation event  
**When** workflow chạy  
**Then** concurrency key là `jobId` với limit một  
**And** mỗi step có stable step ID  
**And** chỉ `GenerateLessonWorkflow` được thay đổi `status` và `currentStage`  
**And** route handler chỉ được tạo/đọc/cancel job hoặc attach user input, không được tự đặt job thành completed/failed hay nhảy stage.

#### AC8 — Handoff của Story 2.1

**Given** workflow mới được tạo trong story này  
**When** job chạy  
**Then** workflow có thể đi `queued → validating_video → acquiring_transcript`  
**And** bước kiểm tra video dùng metadata đã xác nhận hoặc kiểm tra lại khi dữ liệu stale  
**And** story kết thúc tại durable handoff `acquiring_transcript`  
**And** chưa gọi caption, STT, transcript provider hoặc Gemini.

#### AC9 — Generation page phục hồi được

**Given** người dùng mở `/jobs/{jobId}`  
**When** job thuộc tài khoản hiện tại  
**Then** trang đọc trạng thái đã persist từ Postgres  
**And** hiển thị metadata video, CEFR và phase stepper  
**And** polling cập nhật trạng thái mà không giữ một HTTP request mở dài hạn.

**Given** người dùng reload, đóng tab hoặc mất mạng tạm thời  
**When** quay lại cùng URL  
**Then** trang khôi phục đúng job và stage  
**And** không tự submit lại Create Lesson command.

#### AC10 — User-facing phases

**Given** Generation page hiển thị tiến trình  
**When** job thay đổi stage  
**Then** UI dùng các phase `Kiểm tra video`, `Lấy hoặc tạo transcript`, `Kiểm tra tiếng Anh`, `Phân tích nội dung`, `Chọn phần đáng học`, `Tạo hoạt động`, `Kiểm định bài học`, `Hoàn tất`  
**And** không hiển thị tên Inngest step, provider, model call hoặc database state thô  
**And** completed, active, waiting và failed dùng text/icon cùng màu semantic  
**And** stage update được công bố bằng `aria-live` nhưng không đọc lại toàn bộ stepper mỗi lần polling.

#### AC11 — Ownership và RLS

**Given** `lesson_jobs` và `job_events` được exposed qua Supabase  
**When** migrations được áp dụng  
**Then** RLS được bật  
**And** người dùng chỉ đọc được job của `auth.uid()`  
**And** browser không được update trực tiếp trạng thái workflow  
**And** người dùng A truy cập URL job của người dùng B nhận phản hồi không tiết lộ job tồn tại  
**And** service-role chỉ được dùng trong server workflow/repository adapter.

#### AC12 — Error contract

**Given** tạo job, phát event hoặc workflow validation thất bại  
**When** lỗi được trả về UI  
**Then** lỗi có `code`, `messageVi`, `retryable`, optional safe action và optional `jobId`  
**And** raw Inngest, Supabase hoặc provider error không xuất hiện trên UI  
**And** retry không tạo job mới khi job cũ còn hợp lệ.

#### AC13 — Telemetry an toàn

**Given** job lifecycle diễn ra  
**When** telemetry được ghi  
**Then** có tối thiểu `job_created`, `workflow_dispatched`, `stage_started`, `stage_completed`, `stage_failed`  
**And** telemetry gồm job ID, user ID đã pseudonymize, stage, duration, safe error category, retry count và pipeline version  
**And** không log auth token, raw URL query, transcript, API key hoặc full sensitive event body.

#### AC14 — Accessibility và responsive

**Given** desktop hoặc mobile browser  
**When** người dùng tạo và theo dõi job  
**Then** primary action có loading state rõ ràng  
**And** submit trùng bị chặn nhưng không làm mất keyboard focus  
**And** stepper desktop/mobile đều đọc được  
**And** trạng thái offline không làm mất persisted job URL  
**And** touch targets chính đạt tối thiểu 44×44 CSS pixels.

#### AC15 — Kiểm thử

**Given** Story 2.1 được đưa vào CI  
**When** test suite chạy  
**Then** có unit test cho job command, state mapping và ProductError  
**And** có concurrency test chứng minh hai submit đồng thời chỉ tạo một job  
**And** có integration test cho transaction, idempotency và RLS  
**And** có Inngest test chứng minh một workflow/job và stable event ID  
**And** có E2E test cho create → redirect → reload → đúng job và cross-owner denial  
**And** event-dispatch failure giữ job ở `queued` và retry không tạo bản sao  
**And** CI dùng fixture metadata và local Inngest, không gọi provider thật.

Story 2.1 kết thúc khi job đã được persist, workflow đã bắt đầu, progress page phục hồi được và chưa phát sinh transcript/AI cost.

## Story 2.2 — Lấy caption và tạo canonical transcript

**As a** người học đã tạo generation job,  
**I want** Vidlish tự lấy phụ đề gốc có sẵn và chuẩn hóa thành transcript đáng tin cậy,  
**So that** video có caption có thể tiếp tục nhanh mà tôi không phải cung cấp transcript thủ công.

**Requirements:** FR7, FR12, FR13 · NFR2, NFR3, NFR6–9, NFR15–16 · AD-2–7, AD-13–17, AD-19 · UX-DR9–11, UX-DR20, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Caption strategy trong workflow

**Given** job đang ở `acquiring_transcript`  
**When** `GenerateLessonWorkflow` chạy bước caption fast path  
**Then** workflow gọi một implementation của `TranscriptStrategy`  
**And** domain/application không import response object hoặc SDK cụ thể của YouTube/provider  
**And** strategy có stable ID và trả `success`, `not_applicable`, `retryable_failure` hoặc `terminal_failure` theo versioned contract  
**And** chỉ workflow được chuyển job sang `normalizing_transcript`.

#### AC2 — Ưu tiên caption gốc

**Given** video có nhiều caption tracks  
**When** strategy chọn nguồn  
**Then** thứ tự ưu tiên là manual caption gốc trước auto-caption gốc  
**And** không sử dụng caption được dịch tự động sang tiếng Anh  
**And** không coi translated caption là lời tiếng Anh thực sự được nói trong video  
**And** lưu metadata cho biết nguồn là manual hay auto.

**Given** video không phải tiếng Anh có caption ngôn ngữ gốc  
**When** caption được lấy  
**Then** caption vẫn có thể được chuẩn hóa  
**And** Story 2.3 chịu trách nhiệm xác định video có đủ tiếng Anh hay không.

#### AC3 — Không caption không phải kết luận ngôn ngữ

**Given** video không có caption gốc dùng được  
**When** caption strategy hoàn tất  
**Then** trả `not_applicable` với safe reason như `NO_USABLE_CAPTIONS`  
**And** không tạo transcript rỗng hoặc bịa segment  
**And** không map thành `VIDEO_LANGUAGE_UNSUPPORTED`  
**And** acquisition registry có thể chuyển sang strategy tiếp theo.

**Given** chưa có strategy khác được bật trong bản triển khai hiện tại  
**When** registry cạn strategy  
**Then** workflow được phép kết thúc an toàn với `TRANSCRIPT_STRATEGIES_EXHAUSTED`  
**And** không gọi `NO_CAPTIONS` là kết luận về ngôn ngữ video.

#### AC4 — Transcript candidate boundary

**Given** caption provider trả dữ liệu  
**When** adapter chuyển dữ liệu qua application boundary  
**Then** output được Zod validate  
**And** candidate tối thiểu lưu source type, provider, optional track ID, declared language, `isTranslated: false` và các segment có timestamp/text/optional confidence  
**And** raw provider payload không đi vào domain hoặc được persist làm product state.

#### AC5 — Normalization deterministic

**Given** một transcript candidate hợp lệ  
**When** `NormalizeTranscript` chạy  
**Then** hệ thống chuẩn hóa Unicode và whitespace mà không đổi ý nghĩa  
**And** sắp xếp segment theo timestamp  
**And** loại segment rỗng, exact duplicate hoặc corrupt theo rule xác định trước  
**And** từ chối timestamp âm hoặc range bất khả thi  
**And** không tự viết lại câu, sửa grammar, điền nội dung thiếu hoặc dịch nội dung  
**And** cùng input cùng normalization version luôn tạo cùng output và hash.

#### AC6 — Stable segment IDs

**Given** transcript đã được normalize  
**When** canonical segments được tạo  
**Then** mỗi segment có ID, position, start timestamp, optional end timestamp, text, optional confidence và optional detected language  
**And** `detectedLanguage` chưa bắt buộc trong Story 2.2  
**And** segment ID ổn định với cùng transcript hash và normalization version  
**And** ID không phụ thuộc database row order ngẫu nhiên hoặc provider request ID.

#### AC7 — Canonical transcript contract

**Given** normalization thành công  
**When** transcript được persist  
**Then** canonical transcript tối thiểu lưu ID, owner, video, source type, provider, optional declared language, normalized hash, normalization version, optional confidence và canonical segments  
**And** không gắn toàn bộ transcript là `en` trước language eligibility  
**And** không đánh dấu lesson source English trước Story 2.3.

#### AC8 — Persistence và transaction

**Given** canonical transcript hợp lệ  
**When** workflow commit kết quả  
**Then** tạo các entity `transcripts`, `transcript_segments` và `transcript_acquisition_attempts`  
**And** transcript cùng toàn bộ segments được ghi trong một transaction  
**And** nếu một segment thất bại thì không để lại transcript một phần  
**And** workflow chỉ chuyển job từ `normalizing_transcript` sang `checking_language` sau commit thành công.

#### AC9 — Idempotent workflow retry

**Given** caption acquisition hoặc normalization step được Inngest retry  
**When** cùng job, source result và normalization version được xử lý lại  
**Then** không tạo transcript hoặc segment trùng  
**And** transcript key dùng tối thiểu owner + video + normalized hash + source type + normalization version  
**And** kết quả đã commit có thể được tái sử dụng an toàn.

#### AC10 — Ownership và RLS

**Given** transcript tables được tạo  
**When** migrations được áp dụng  
**Then** `transcripts` và `transcript_segments` bật RLS  
**And** người dùng chỉ đọc transcript thuộc mình  
**And** browser không được tự chèn hoặc sửa canonical transcript  
**And** workflow/server repository là đường ghi product state  
**And** cross-owner integration test chứng minh dữ liệu không bị lộ.

#### AC11 — Confidence và dữ liệu yếu

**Given** auto-caption cung cấp confidence hoặc có segment bất thường  
**When** normalization hoàn tất  
**Then** confidence được giữ khi có  
**And** thiếu confidence không được tự biến thành `1.0`  
**And** low-confidence segment chưa bị xóa chỉ vì confidence thấp  
**And** Story 2.3 và Lesson Engine có thể loại chúng khỏi evidence có chấm điểm sau này.

#### AC12 — Generation UX

**Given** caption acquisition đang diễn ra  
**When** người dùng mở Generation page  
**Then** phase hiển thị `Lấy hoặc tạo transcript`  
**And** không lộ provider hoặc caption endpoint nội bộ.

**Given** caption và normalization thành công  
**When** job chuyển sang handoff tiếp theo  
**Then** phase chuyển sang `Kiểm tra tiếng Anh`.

**Given** strategy không tìm thấy caption và chưa có fallback khả dụng  
**When** lỗi được hiển thị  
**Then** UI dùng thông báo tiếng Việt rõ ràng  
**And** không kết luận video không phải tiếng Anh  
**And** không đề xuất dịch video thành tiếng Anh.

#### AC13 — Privacy và logging

**Given** caption được lấy và chuẩn hóa  
**When** telemetry được ghi  
**Then** có strategy ID, source type, segment count, duration coverage, latency, retry count và safe result code  
**And** không log toàn bộ transcript hoặc raw provider response  
**And** title, segment text và caption body không xuất hiện trong structured production logs.

#### AC14 — Failure handling

**Given** provider timeout hoặc lỗi tạm thời  
**When** strategy thất bại  
**Then** lỗi được map thành `retryable_failure`  
**And** workflow dùng bounded retry  
**And** không tạo transcript một phần.

**Given** provider trả payload sai schema hoặc dữ liệu không thể chuẩn hóa  
**When** validation thất bại  
**Then** lỗi được map thành safe product category  
**And** raw payload không xuất hiện trên UI  
**And** job không được chuyển sang `checking_language`.

#### AC15 — Kiểm thử

**Given** Story 2.2 được đưa vào CI  
**When** test suite chạy  
**Then** có unit test cho manual-over-auto selection và translated caption bị loại  
**And** có unit test cho normalization, deterministic hash và stable segment IDs  
**And** có test cho empty, duplicate, corrupt và invalid timestamp segments  
**And** có integration test cho atomic transcript persistence, workflow retry và RLS  
**And** có workflow test cho `acquiring_transcript → normalizing_transcript → checking_language`  
**And** `NO_USABLE_CAPTIONS` không tạo transcript và không trả `VIDEO_LANGUAGE_UNSUPPORTED`  
**And** CI dùng caption fixtures, không gọi YouTube hoặc transcript provider thật.

Story 2.2 hoàn tất khi video có caption gốc đã tạo được canonical transcript và dừng tại `checking_language`; chưa quyết định video có đủ tiếng Anh và chưa gọi Lesson Engine.

## Story 2.3 — Kiểm tra video có đủ tiếng Anh gốc

**As a** người học đang chờ tạo bài,  
**I want** Vidlish xác nhận video có đủ lời nói tiếng Anh thực sự,  
**So that** tôi chỉ nhận bài học dựa trên nội dung tiếng Anh có thật trong video, không phải bản dịch hoặc nội dung AI tự tạo.

**Requirements:** FR-LANG-1–FR-LANG-5, FR32, FR33 · NFR8, NFR9, NFR15–17 · AD-7, AD-10, AD-14, AD-22 · UX-DR9, UX-DR10, UX-DR14, UX-DR20, UX-DR27, UX-DR32.

### Acceptance Criteria

#### AC1 — Language gate chạy đúng vị trí

**Given** canonical transcript đã được commit  
**When** workflow chuyển đến `checking_language`  
**Then** language eligibility chạy trước `analyzing_video`, `mining_language`, `planning_lesson` và `composing_activities`  
**And** không gọi `LessonGenerationProvider`, Video Analyst hoặc Language Miner trước khi gate pass  
**And** chỉ workflow được phép thay đổi stage tiếp theo.

#### AC2 — Phát hiện ngôn ngữ ở từng segment

**Given** canonical transcript có các segment ổn định  
**When** language detector chạy  
**Then** mỗi segment nhận `segmentId`, detected `language` và optional `confidence`  
**And** detector nằm sau `LanguageAnalysisPort`  
**And** domain/application không phụ thuộc response format của thư viện hoặc provider cụ thể  
**And** kết quả qua Zod boundary trước khi persist.

#### AC3 — Eligibility report có version

**Given** toàn bộ segment đã được phân tích  
**When** eligibility evaluator tổng hợp kết quả  
**Then** report là `eligible` hoặc `ineligible` theo Language Eligibility Contract  
**And** eligible report lưu primary language `en`, English segment IDs, excluded non-English IDs, English share, coherent English duration, reliable English word count, optional confidence và policy version  
**And** ineligible report lưu reason, detected languages và policy version  
**And** report được liên kết với transcript hash  
**And** thay đổi threshold tạo policy version mới.

#### AC4 — Không chỉ xét ngôn ngữ chiếm đa số

**Given** evaluator kiểm tra transcript  
**When** quyết định eligibility  
**Then** phải xét đồng thời tỷ lệ tiếng Anh, thời lượng tiếng Anh liền mạch, số từ đáng tin cậy, confidence và khả năng dùng làm source quote/listening/scored evidence  
**And** không chấp nhận video chỉ vì vài từ tiếng Anh, brand name, proper noun hoặc code-switch ngắn  
**And** threshold nằm trong typed configuration, không rải magic number trong UI hoặc workflow.

#### AC5 — Xác định phần tiếng Anh liền mạch

**Given** transcript có nhiều segment tiếng Anh rời rạc  
**When** evaluator tính coherent English duration  
**Then** segment chỉ được gộp thành English span khi khoảng cách và cấu trúc thời gian đáp ứng policy đã version hóa  
**And** isolated fragments không được cộng máy móc thành một bài học giả tạo  
**And** kết quả deterministic với cùng transcript và policy version.

#### AC6 — Video mixed-language

**Given** video chứa cả tiếng Anh và ngôn ngữ khác  
**When** phần tiếng Anh tự nó đủ tạo một Core Lesson hợp lệ  
**Then** video được đánh dấu `eligible`  
**And** `englishSegmentIds` chỉ chứa segment tiếng Anh đạt confidence yêu cầu  
**And** segment không phải tiếng Anh vẫn được giữ để truy vết nhưng không được dùng cho source quote, language mining, grammar evidence, listening question hoặc scored evidence.

**Given** tiếng Anh chỉ xuất hiện ngắn và rời rạc  
**When** evaluator chạy  
**Then** video bị đánh dấu `ineligible`.

#### AC7 — Video đủ điều kiện

**Given** eligibility result là `eligible`  
**When** report được commit  
**Then** transcript được liên kết với eligible English segment set  
**And** workflow chuyển `checking_language → analyzing_video`  
**And** downstream Lesson Engine chỉ nhận English segment IDs đã được phép  
**And** không nhận toàn bộ mixed-language transcript như nguồn tiếng Anh mặc định.

#### AC8 — Video không đủ tiếng Anh

**Given** result là `insufficient-original-english`  
**When** workflow xử lý kết quả  
**Then** job dừng trước mọi Lesson Engine call  
**And** chuyển terminal `failed` với `VIDEO_LANGUAGE_UNSUPPORTED`, action `choose_another_video` và `retryable: false`  
**And** hiển thị `Video này không có đủ nội dung tiếng Anh để tạo bài học. Hãy chọn một video chủ yếu nói tiếng Anh.`  
**And** không phát sinh token hoặc chi phí lesson generation.

#### AC9 — Không đủ confidence

**Given** transcript hoặc language detection quá thiếu tin cậy  
**When** evaluator trả `language-confidence-too-low`  
**Then** hệ thống fail closed  
**And** không tự giả định transcript là tiếng Anh  
**And** không đưa segment confidence thấp vào eligible set  
**And** các fallback transcript ở Story 2.4–2.6 có thể cung cấp transcript tốt hơn mà không đổi eligibility contract.

#### AC10 — Cấm translation substitute

**Given** video không có đủ tiếng Anh gốc  
**When** eligibility thất bại  
**Then** hệ thống không dịch transcript sang tiếng Anh để chạy Lesson Engine  
**And** không tạo English rewrite, voice-over hoặc audio tổng hợp  
**And** không dùng generated English cho listening/grammar evidence hoặc gắn nó thành source quote  
**And** UX không đề xuất translation lesson mode.

#### AC11 — Idempotency và cache safety

**Given** workflow retry language eligibility  
**When** transcript hash và policy version không thay đổi  
**Then** hệ thống tái sử dụng cùng report hoặc tạo kết quả giống nhau  
**And** không tạo report trùng  
**And** cache key gồm transcript hash, detector version và eligibility policy version  
**And** report policy cũ không được dùng sau breaking policy change.

#### AC12 — Persistence và quyền sở hữu

**Given** eligibility report được persist  
**When** migrations được áp dụng  
**Then** report thuộc cùng owner với transcript và job  
**And** RLS ngăn người khác đọc report hoặc English segment set  
**And** browser không được tự chỉnh eligibility, segment language hoặc policy evidence  
**And** chỉ workflow/server repository có quyền ghi kết quả.

#### AC13 — Generation UX

**Given** job đang kiểm tra  
**When** người dùng mở Generation page  
**Then** phase hiển thị `Kiểm tra tiếng Anh`  
**And** không hiển thị threshold nội bộ khó hiểu.

**Given** video đủ điều kiện  
**When** workflow tiếp tục  
**Then** stepper chuyển sang `Phân tích nội dung`.

**Given** video không đủ điều kiện  
**When** terminal state hiển thị  
**Then** chỉ có primary action `Chọn video khác`  
**And** không có nút dịch video  
**And** trạng thái dùng text và icon, không chỉ màu.

#### AC14 — Telemetry an toàn

**Given** eligibility được đánh giá  
**When** telemetry được ghi  
**Then** lưu status/reason, detector version, policy version, English share, coherent English duration, reliable word count, confidence band và stage latency  
**And** không log segment text hoặc toàn bộ transcript  
**And** không gửi nội dung transcript vào analytics client-side.

#### AC15 — Kiểm thử

**Given** Story 2.3 được đưa vào CI  
**When** test suite chạy  
**Then** có fixtures cho fully English manual/auto caption, primarily English with incidental non-English, coherent mixed-language English chapter, incidental-English-only, fully non-English, low-confidence và translated caption  
**And** mixed-language eligible fixture chỉ cho phép English segment IDs  
**And** workflow retry không tạo report bản sao  
**And** E2E video không đủ tiếng Anh hiển thị đúng message và không gọi Lesson Engine fixture.

Story 2.3 kết thúc với `eligible → analyzing_video` hoặc `ineligible → VIDEO_LANGUAGE_UNSUPPORTED → choose_another_video`.
