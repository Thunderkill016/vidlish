# Epic 4 — Học và luyện tập trực tiếp với video

Người dùng có thể tương tác với video và lesson, bấm timestamp, làm hoạt động, nhận feedback, luyện retrieval/transfer và đánh dấu hoàn thành.

**FRs covered:** FR35, FR36, FR37, FR38.

## Story 4.1 — Điều hướng video bằng timestamp evidence

**As a** người học đang đọc lesson,
**I want** bấm vào bằng chứng để phát đúng đoạn video liên quan,
**So that** tôi có thể nghe lại lời nói thật thay vì học tách rời khỏi ngữ cảnh.

**Requirements:** FR35 · NFR11, NFR13–14 · AR21, AR23, AR25, AR27 · UX-DR15–16, UX-DR19–20, UX-DR27–32.

**Acceptance Criteria:**

**Given** published lesson có source refs với timestamp hợp lệ
**When** Lesson Viewer hiển thị
**Then** video player dùng canonical YouTube video ID từ server data
**And** player không nhận arbitrary embed URL từ lesson content
**And** transcript/source text không được render như HTML không kiểm soát.

**Given** người dùng kích hoạt EvidenceChip bằng click, Enter hoặc Space
**When** source ref có timestamp
**Then** player seek tới thời điểm đó và bắt đầu phát theo interaction policy
**And** focus không bị mất
**And** screen reader nhận thông báo ngắn về đoạn được mở
**And** interaction không phụ thuộc màu.

**Given** evidence có start và optional end timestamp
**When** player phát
**Then** UI có thể highlight segment active trong transcript/source panel
**And** highlight dùng text/icon/background có contrast phù hợp
**And** end timestamp không buộc player tự dừng nếu điều đó gây gián đoạn, trừ activity yêu cầu đoạn nghe giới hạn.

**Given** source ref không có timing chính xác
**When** viewer render
**Then** EvidenceChip không giả vờ seek được
**And** hiển thị source text/reference không tương tác hoặc copy giải thích phù hợp
**And** không bịa timestamp.

**Given** YouTube player chưa sẵn sàng hoặc bị chặn
**When** người dùng kích hoạt evidence
**Then** action được queue tối đa trong thời gian cấu hình hoặc trả lỗi có thể thử lại
**And** lesson content vẫn đọc được
**And** không reload toàn trang.

**Given** mobile layout
**When** evidence được kích hoạt
**Then** player được đưa vào vùng nhìn thấy hợp lý mà không gây focus trap
**And** sticky/player behavior không che nội dung hoặc control hệ thống
**And** touch target đạt tối thiểu 44×44 CSS pixels.

**Given** transcript panel hiển thị source segments
**When** playback time thay đổi
**Then** active segment được tính từ canonical timestamps
**And** low-confidence segment có visual/copy distinction khi dữ liệu cho phép
**And** non-English excluded segment không được nhấn mạnh như English lesson evidence.

**Given** telemetry interaction được ghi
**When** user seek bằng evidence
**Then** chỉ ghi lesson ID, source ref ID, timestamp band và interaction result
**And** không gửi transcript text hoặc YouTube watch history chi tiết ngoài nhu cầu sản phẩm.

**Given** Story 4.1 được đưa vào CI
**When** tests chạy
**Then** có keyboard, focus, seek, player-not-ready, no-timing, mobile và active-segment tests
**And** YouTube player được mock, không gọi player thật trong CI.

## Story 4.2 — Làm hoạt động và nhận feedback

**As a** người học,
**I want** trả lời các hoạt động trong lesson và nhận feedback ngay,
**So that** tôi biết mình hiểu đúng phần nghe và ngôn ngữ trong video hay chưa.

**Requirements:** FR36 · NFR2, NFR11, NFR13–16 · AR19–21, AR23, AR26–27 · UX-DR21–22, UX-DR27–32.

**Acceptance Criteria:**

**Given** published lesson có activity definitions đã pass Final Quality Gate
**When** viewer render
**Then** chỉ các activity type nằm trong versioned catalog được khởi tạo
**And** unknown hoặc malformed activity fail closed thay vì chạy code động
**And** activity data không được phép inject HTML/script.

**Given** một hoạt động trắc nghiệm, matching, ordering, fill hoặc short guided response được hỗ trợ
**When** người dùng submit
**Then** server/client evaluator dùng answer contract đã publish, không gọi model để quyết định đúng sai cho deterministic activity
**And** trạng thái unanswered, selected, submitted, correct, incorrect và reviewed được phân biệt bằng text/icon cùng màu semantic.

**Given** activity dựa trên đoạn nghe
**When** người dùng chọn `Nghe lại`
**Then** player phát đúng source range có timing đủ chất lượng
**And** số lần nghe không bị giới hạn theo cơ chế gamification
**And** activity không tiết lộ đáp án chỉ vì player lỗi.

**Given** câu trả lời đúng hoặc sai
**When** feedback hiển thị
**Then** feedback giải thích ngắn gọn dựa trên source/explanation đã publish
**And** sai không dùng copy mang tính phán xét
**And** source và generated feedback được phân biệt khi cần
**And** raw validator/model metadata không xuất hiện.

**Given** activity có nhiều lần thử theo definition
**When** learner thử lại
**Then** state transition deterministic và không thay đáp án chuẩn
**And** reset không xóa progress của activity khác
**And** duplicate submit do double click/retry không ghi hai attempt.

**Given** attempt được persist
**When** request thành công
**Then** record thuộc owner + lesson version + activity ID
**And** RLS ngăn cross-user read/write
**And** browser không thể ghi `isCorrect` tùy ý; server xác minh deterministic answer khi activity được chấm điểm.

**Given** mạng mất trong lúc làm activity
**When** kết nối trở lại
**Then** local pending response có thể retry bằng idempotency key
**And** UI cho biết chưa đồng bộ
**And** không tự đánh dấu hoàn thành sai.

**Given** learner dùng bàn phím hoặc screen reader
**When** thao tác activity
**Then** group/label/instruction/error được liên kết đúng
**And** focus tới feedback hợp lý mà không trap
**And** ordering/matching có phương án keyboard tương đương drag
**And** motion feedback tôn trọng reduced-motion.

**Given** Story 4.2 được đưa vào CI
**When** tests chạy
**Then** có contract tests cho catalog activity, deterministic scoring, retry/idempotency, RLS, offline state và accessibility
**And** có E2E làm đúng, làm sai, nghe lại và thử lại
**And** CI không gọi model/provider thật.

## Story 4.3 — Retrieval, transfer và hoàn thành lesson

**As a** người học,
**I want** tự nhớ lại, áp dụng điều đã học và kết thúc lesson với trạng thái rõ ràng,
**So that** tôi biến việc xem video thành một vòng học hoàn chỉnh chứ không chỉ đọc giải thích.

**Requirements:** FR37, FR38 · NFR2, NFR11, NFR13–16 · AR19–21, AR23, AR26, AR29 · UX-DR17, UX-DR23, UX-DR26–32.

**Acceptance Criteria:**

**Given** learner đi tới phần cuối Core Lesson
**When** retrieval activity hiển thị
**Then** prompt yêu cầu nhớ lại ý/ngôn ngữ trước khi xem đáp án hoặc gợi ý
**And** reveal state do learner chủ động kích hoạt
**And** prompt liên kết outcomes đã publish.

**Given** transfer prompt hiển thị
**When** learner phản hồi
**Then** họ có thể tạo câu/ý áp dụng vào ngữ cảnh mới
**And** MVP cho phép self-check theo checklist/rubric đã publish hoặc lưu reflection text
**And** generated open response không bị chấm đúng/sai giả tạo bằng string matching
**And** nếu không có AI feedback đáng tin, UI nói rõ đây là tự đánh giá.

**Given** exit ticket hiển thị
**When** learner trả lời
**Then** có câu hỏi ngắn kiểm tra takeaway hoặc confidence theo definition của lesson
**And** feedback không biến confidence thành điểm năng lực khách quan
**And** learner có thể xem lại source evidence trước khi kết thúc.

**Given** learner chưa hoàn thành required activity tối thiểu
**When** chọn hoàn thành
**Then** UI chỉ ra phần còn thiếu hoặc cho phép `Hoàn thành dù chưa làm hết` nếu completion policy cho phép
**And** policy rõ ràng, không ép streak/XP.

**Given** completion criteria đạt hoặc learner xác nhận theo policy
**When** chọn `Hoàn thành bài học`
**Then** tạo/ cập nhật một completion record idempotent cho owner + lesson version
**And** lưu completedAt và summary progress cần thiết
**And** không sửa immutable lesson content.

**Given** lesson đã hoàn thành
**When** learner mở lại
**Then** trạng thái completion và activity attempts được khôi phục
**And** learner vẫn có thể nghe/xem lại và luyện lại
**And** luyện lại không tự xóa completedAt trừ khi product policy versioned quy định.

**Given** completion action thành công
**When** UI phản hồi
**Then** hiển thị trạng thái bình tĩnh, không confetti/streak/XP
**And** primary action phù hợp là quay lại thư viện hoặc xem lại lesson
**And** trạng thái không chỉ thể hiện bằng màu.

**Given** reflection hoặc transfer text được lưu
**When** persistence chạy
**Then** dữ liệu thuộc owner, có RLS và retention/delete dependency cùng lesson
**And** không gửi nội dung riêng tư vào analytics logs
**And** browser không đọc reflection người khác.

**Given** Story 4.3 được đưa vào CI
**When** tests chạy
**Then** có tests cho retrieval reveal, self-check, completion policy, idempotent completion, reopen state, RLS và accessibility
**And** có E2E hoàn thành và mở lại lesson
**And** CI không gọi model thật.

Epic 4 hoàn tất khi learner có thể nghe đúng đoạn, làm activity, nhận feedback, thực hiện retrieval/transfer và lưu completion state.