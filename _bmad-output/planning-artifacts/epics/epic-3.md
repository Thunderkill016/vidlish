# Epic 3 — Nhận một bài học tiếng Anh có căn cứ

Từ canonical transcript đủ điều kiện, người dùng nhận được Core Lesson cá nhân hóa theo CEFR, được tạo qua pipeline nhiều bước, kiểm định grounding/exercise validity và publish nguyên tử thành lesson có thể đọc.

**FRs covered:** FR14–FR30, FR34, FR39.

## Story 3.1 — Tiền xử lý transcript và phân tích video

**As a** người học có transcript đủ tiếng Anh,
**I want** Vidlish hiểu nội dung và cấu trúc video dựa trên lời nói gốc,
**So that** bài học sau này tập trung đúng chủ đề và ngữ cảnh thực tế của video.

**Requirements:** FR14, FR15, FR22–FR24 · NFR8–9, NFR12, NFR15–17, NFR20 · AR2–3, AR6–8, AR12–13, AR16–18, AR21, AR27 · UX-DR9, UX-DR17, UX-DR24, UX-DR27, UX-DR31.

**Acceptance Criteria:**

**Given** job ở `analyzing_video` với canonical transcript và eligible English segment set
**When** preprocessing chạy
**Then** chỉ English segment IDs đã được language gate cho phép được đưa vào Lesson Engine source set
**And** transcript hash, normalization version, eligibility policy version và source ranges được giữ làm provenance
**And** segment không phải tiếng Anh không được đưa vào source quote, grammar/listening evidence hoặc scored evidence.

**Given** transcript text được xử lý
**When** prompt/context được dựng
**Then** transcript luôn được coi là untrusted data, không phải instruction
**And** delimiter/schema tách source content khỏi system/developer instruction
**And** nội dung kiểu prompt injection trong video không được phép đổi policy, tool, model hoặc output schema.

**Given** source set dài
**When** preprocessor tạo analysis input
**Then** chunking deterministic theo stable segment ranges và versioned budget
**And** không silently truncate
**And** mỗi chunk giữ source segment IDs để merge và truy vết
**And** partial analysis không được coi là complete nếu coverage gate chưa pass.

**Given** Video Analyst được gọi
**When** provider adapter xử lý input
**Then** application dùng `VideoAnalysisPort`, không import SDK/model response trực tiếp
**And** Gemini chỉ là adapter ban đầu với exact model ID và typed config
**And** output qua Zod validation trước khi persist.

**Given** analysis thành công
**When** artifact được tạo
**Then** nó chứa tối thiểu chủ đề, mục đích giao tiếp, người nói/đối tượng khi suy ra được, speaking style, discourse structure, key claims/ideas và source segment references
**And** mọi claim cụ thể phải trỏ về segment evidence
**And** inference không chắc chắn được đánh dấu confidence hoặc omitted, không trình bày như fact.

**Given** nhiều chunk analysis được merge
**When** aggregate chạy
**Then** kết quả deterministic theo input hash, model/config version và merge version
**And** không tạo duplicate idea do chunk overlap
**And** conflict được giữ hoặc hạ confidence thay vì tự chọn tùy ý.

**Given** output sai schema, thiếu coverage hoặc không grounded
**When** validation chạy
**Then** artifact không được persist như valid analysis
**And** workflow dùng bounded retry/repair theo policy hoặc fail closed
**And** raw provider output không hiển thị cho người dùng.

**Given** analysis hợp lệ được commit
**When** workflow tiếp tục
**Then** job chuyển `analyzing_video → mining_language`
**And** analysis artifact immutable/versioned theo transcript hash + analysis schema/model/prompt versions
**And** retry không tạo artifact trùng.

**Given** Story 3.1 được đưa vào CI
**When** test suite chạy
**Then** có tests cho prompt injection, non-English exclusion, deterministic chunk/merge, grounding refs, schema failure và idempotency
**And** có workflow fixture `checking_language → analyzing_video → mining_language`
**And** CI không gọi model thật.

## Story 3.2 — Chọn ngôn ngữ đáng học và mục tiêu bài học

**As a** người học ở một trình độ CEFR cụ thể,
**I want** Vidlish chọn những từ, cấu trúc và khoảnh khắc vừa sức từ video,
**So that** bài học tập trung vào phần có giá trị nhất thay vì giải thích mọi thứ.

**Requirements:** FR16–FR18, FR20–FR22 · NFR8–9, NFR15–17 · AR12–13, AR17–19, AR21 · UX-DR17, UX-DR21, UX-DR24, UX-DR31–32.

**Acceptance Criteria:**

**Given** validated video analysis và eligible source segments
**When** Language Miner chạy
**Then** tạo candidate pool versioned gồm vocabulary/chunks, grammar/noticing, discourse/pragmatics và listening features phù hợp
**And** mỗi candidate chứa source segment IDs, exact source quote/range, rationale, estimated CEFR difficulty và confidence
**And** generated explanation/example chưa được coi là source evidence.

**Given** candidate được trích xuất
**When** grounding validation sơ bộ chạy
**Then** quote phải khớp canonical segment text theo normalization policy
**And** timestamp/range phải nằm trong source segment
**And** candidate từ non-English, translated hoặc low-confidence excluded segment bị loại.

**Given** learner chọn A1–C1
**When** CEFR filter áp dụng
**Then** candidate được đánh giá bằng versioned CEFR rubrics
**And** A1/A2 ưu tiên high-frequency, concrete và scaffolded items
**And** B1/B2 tăng nuance, discourse và productive use
**And** C1 có thể chọn subtle register/collocation nhưng vẫn phải có evidence trong video
**And** độ khó không được suy ra chỉ từ độ dài từ/câu.

**Given** candidate pool đủ dữ liệu
**When** teachable-moment selector chạy
**Then** chọn một tập nhỏ có diversity, salience, learnability, evidence quality và coverage phù hợp lesson 10–20 phút
**And** không chọn nhiều item trùng một hiện tượng chỉ vì model lặp lại
**And** selection deterministic với cùng candidate set và algorithm version.

**Given** selected moments
**When** Lesson Planner tạo learning outcomes
**Then** có tối đa ba outcome rõ, đo được và phù hợp CEFR
**And** mỗi outcome liên kết ít nhất một selected moment/evidence
**And** outcome không hứa kỹ năng hoặc nội dung không thể luyện từ source set.

**Given** video mixed-language đủ điều kiện
**When** candidate mining và selection chạy
**Then** chỉ eligible English segment set được dùng cho language items và scored evidence
**And** non-English context có thể được ghi như background không chấm điểm nhưng không được biến thành English teaching source.

**Given** candidate pool quá yếu để tạo progression hợp lệ
**When** planner đánh giá
**Then** pipeline fail closed với safe quality error
**And** không bịa thêm language items để đủ số lượng
**And** không tự dịch đoạn khác sang tiếng Anh.

**Given** plan hợp lệ được commit
**When** workflow tiếp tục
**Then** job chuyển `mining_language → planning_lesson`
**And** candidate pool, selected moments, outcomes, rubrics và selection versions được persist immutable
**And** retry không tạo bản sao.

**Given** Story 3.2 được đưa vào CI
**When** tests chạy
**Then** có fixtures theo A1–C1, mixed-language exclusion, duplicate candidates, low-confidence evidence, max-three outcomes và insufficient-pool failure
**And** selection algorithm có deterministic regression tests
**And** CI không gọi model thật.

## Story 3.3 — Soạn Core Lesson qua pipeline nhiều bước

**As a** người học,
**I want** nhận một bài học có trình tự rõ ràng dựa trên các đoạn thật của video,
**So that** tôi hiểu nội dung, nhận ra ngôn ngữ quan trọng và có cơ hội luyện tập vừa sức.

**Requirements:** FR19, FR21–FR24 · NFR8–9, NFR12, NFR15–17, NFR20 · AR17–21, AR27 · UX-DR15–18, UX-DR21, UX-DR23–24, UX-DR31–32.

**Acceptance Criteria:**

**Given** validated analysis, selected moments và outcomes
**When** lesson pipeline chạy
**Then** dùng các stage tách biệt tối thiểu: lesson planning → explanation/example composition → activity composition → final assembly
**And** mỗi stage nhận/ trả versioned structured contract qua Zod
**And** workflow persist stage artifact cần thiết để retry không phải gọi lại toàn bộ pipeline.

**Given** Core Lesson được lập kế hoạch
**When** progression được tạo
**Then** lesson dài mục tiêu 10–20 phút và có flow: gist/context → source noticing → guided understanding/practice → retrieval/transfer preparation
**And** progression linh hoạt theo video/CEFR, không ép số section cố định vô nghĩa
**And** tối đa ba outcomes từ Story 3.2 được phản ánh trong lesson.

**Given** lesson sử dụng lời nói từ video
**When** source material được render trong schema
**Then** mọi source quote/listening prompt chứa `SourceRef` tới English segment IDs được phép
**And** quote giữ nguyên source wording theo normalization policy
**And** không sửa grammar trong quote để làm nó “đẹp hơn”.

**Given** hệ thống tạo explanation hoặc example mới
**When** content được assemble
**Then** generated content được gắn nhãn/provenance khác source speech
**And** không có generated example nào được trình bày như câu người nói đã nói
**And** generated content phù hợp CEFR và không mâu thuẫn source context.

**Given** provider generation được gọi
**When** application chạy
**Then** dùng `LessonGenerationProvider` port
**And** Gemini adapter ban đầu dùng exact model IDs, prompt/schema versions và typed server config
**And** domain không phụ thuộc vendor SDK hoặc response format
**And** adapter có thể thay thế bằng provider khác mà không đổi lesson schema.

**Given** lesson schema được assemble
**When** artifact hoàn tất
**Then** lưu schema version, pipeline version, transcript hash, eligibility report version, analysis/mining/planning versions, model/prompt versions và source references
**And** lesson draft immutable theo version
**And** retry cùng inputs không tạo draft trùng ngoài policy.

**Given** source input chứa prompt injection hoặc yêu cầu ngoài sản phẩm
**When** stage generation chạy
**Then** model không được thay đổi output schema, policy, tool access hoặc source eligibility
**And** output ngoài schema bị từ chối
**And** transcript text không được phép yêu cầu tiết lộ secrets/system prompts.

**Given** một stage lỗi tạm thời
**When** workflow retry
**Then** chỉ stage cần thiết được retry bằng stable step ID
**And** stage thành công trước đó được tái sử dụng
**And** không publish partial lesson.

**Given** draft được assemble
**When** workflow tiếp tục
**Then** job chuyển sang `validating_lesson`
**And** draft chưa được xem là published hoặc hiển thị như lesson hoàn tất
**And** Epic 4 interaction chưa cần triển khai trong story này.

**Given** Story 3.3 được đưa vào CI
**When** tests chạy
**Then** có contract tests cho từng stage, source/generated distinction, CEFR adaptation, provenance, prompt injection và partial retry
**And** có end-to-end fixture từ plan tới structured draft
**And** CI không gọi provider thật.

## Story 3.4 — Kiểm định, chấm chất lượng và sửa có giới hạn

**As a** người học,
**I want** Vidlish chỉ công bố bài học khi cấu trúc, đáp án và bằng chứng đều đáng tin,
**So that** tôi không luyện trên nội dung bịa, câu hỏi không trả lời được hoặc đáp án sai.

**Requirements:** FR25–FR29 · NFR8–9, NFR15–17 · AR17–22 · UX-DR22, UX-DR24, UX-DR27, UX-DR31.

**Acceptance Criteria:**

**Given** lesson draft ở `validating_lesson`
**When** structural gate chạy
**Then** toàn bộ lesson phải pass versioned Zod schema, referential integrity, unique IDs, allowed activity types và required field rules
**And** bất kỳ structural error nào chặn publish.

**Given** lesson có source refs/quotes
**When** grounding gate chạy
**Then** segment tồn tại, thuộc eligible English set, quote/range khớp source và timestamp hợp lệ
**And** translated, generated hoặc non-English segment không được dùng làm source evidence
**And** grounding failure chặn publish.

**Given** lesson có scored activity
**When** exercise-validity gate chạy
**Then** mỗi câu có đáp án xác định từ stimulus/evidence, distractor hợp lý, không nhiều đáp án đúng ngoài chủ ý và feedback phù hợp
**And** listening/grammar question yêu cầu timing phải có source timing đủ chất lượng
**And** hoạt động không đủ bằng chứng bị loại hoặc fail, không đoán đáp án.

**Given** lesson pass hard gates
**When** quality rubric chấm
**Then** đánh giá tối thiểu grounding, pedagogical progression, CEFR fit và activity validity theo thang versioned 16 điểm
**And** tổng điểm phải đạt tối thiểu 14/16
**And** hard-gate failure không thể được bù bằng điểm cao ở tiêu chí khác.

**Given** lesson không pass nhưng lỗi có thể sửa
**When** targeted repair chạy
**Then** chỉ gửi section/lỗi cần sửa cùng evidence cần thiết
**And** giữ nguyên phần đã valid
**And** repair count bị giới hạn theo policy
**And** mỗi repair qua lại toàn bộ gate liên quan.

**Given** repair vượt giới hạn hoặc vẫn không pass
**When** workflow kết thúc validation
**Then** fail closed với safe internal quality error
**And** không publish draft kém chất lượng
**And** user-facing copy không đổ lỗi cho người học hay lộ raw model output.

**Given** lesson pass
**When** validation report được persist
**Then** lưu hard-gate results, rubric subscores, total score, repair history, validator versions và safe failure categories
**And** detailed internal quality score không hiển thị cho learner theo mặc định.

**Given** workflow retry validation
**When** draft hash và validator versions không đổi
**Then** report được tái sử dụng hoặc tạo cùng kết quả
**And** không chạy repair trùng ngoài policy.

**Given** Story 3.4 được đưa vào CI
**When** tests chạy
**Then** có failing fixtures cho missing segment, quote mismatch, non-English evidence, ambiguous answer, bad distractor, timing-required-without-timing, score dưới 14 và repair exhaustion
**And** có passing fixture đạt mọi gate
**And** CI không gọi model thật ngoài deterministic repair fixture.

## Story 3.5 — Publish nguyên tử và hiển thị Lesson Viewer

**As a** người học,
**I want** mở một bài học hoàn chỉnh, dễ đọc sau khi hệ thống kiểm định xong,
**So that** tôi có thể bắt đầu học mà không thấy dữ liệu dở dang hoặc phải tạo lại bài.

**Requirements:** FR30, FR34, FR39 · NFR2, NFR7–9, NFR11–12, NFR15–17, NFR19 · AR19–21, AR23, AR26, AR28–29 · UX-DR15–18, UX-DR21–24, UX-DR27–32.

**Acceptance Criteria:**

**Given** lesson draft chưa pass Final Quality Gate
**When** user hoặc route cố mở lesson
**Then** không có published lesson URL/content
**And** partial sections không được lộ như lesson hoàn tất.

**Given** lesson pass toàn bộ gate và quality score
**When** publish transaction chạy
**Then** tạo immutable lesson version, sections/items/source refs và published pointer trong một transaction
**And** job chỉ chuyển `publishing → completed` sau commit thành công
**And** failure rollback không để lại published lesson một phần.

**Given** cùng draft/pipeline được publish retry
**When** workflow chạy lại
**Then** idempotency key ngăn lesson version trùng
**And** job liên kết đúng một published lesson version.

**Given** published lesson tồn tại
**When** người dùng mở `/lessons/{id}`
**Then** server xác nhận ownership và đọc dữ liệu đã persist, không gọi Gemini hoặc transcript provider
**And** người dùng khác nhận phản hồi không tiết lộ lesson tồn tại
**And** RLS bảo vệ lesson và mọi child entity.

**Given** Lesson Viewer hiển thị desktop
**When** trang load
**Then** layout dùng split view video/source context và lesson content theo UX design
**And** mobile chuyển sang stacked layout
**And** gist/context xuất hiện trước transcript detail
**And** sections/progression nhìn thấy rõ nhưng không biến thành gamification.

**Given** source quote/evidence được render
**When** người dùng đọc
**Then** source speech và generated explanation/example được phân biệt bằng label/copy rõ ràng
**And** EvidenceChip hiển thị timestamp/source reference có keyboard semantics
**And** seek-to-player interaction được triển khai ở Epic 4; Story 3.5 vẫn hiển thị reference hợp lệ mà không có dead misleading behavior.

**Given** lesson có internal validation metadata
**When** learner xem bài
**Then** raw quality score, provider IDs, repair logs và chain-of-thought không được hiển thị
**And** provenance cần thiết cho support/audit chỉ có ở server/internal diagnostics.

**Given** viewer ở trạng thái loading/empty/error
**When** dữ liệu chưa có hoặc thất bại
**Then** hiển thị skeleton/error tiếng Việt có một primary action phù hợp
**And** không dùng color-only feedback
**And** keyboard, focus, labels, reduced motion và responsive targets đáp ứng WCAG 2.2 AA.

**Given** saved lesson được mở trong điều kiện bình thường
**When** request hoàn tất
**Then** target response/render trong khoảng 3 giây theo NFR
**And** caching không làm lộ cross-user content
**And** published immutable version có thể cache theo owner-safe policy.

**Given** golden regression suite được chạy trong CI/release gate
**When** pipeline/schema/prompt/validator thay đổi
**Then** bộ fixture versioned đo schema pass, grounding, exercise validity, quality score và expected failure behavior
**And** regression nghiêm trọng chặn release
**And** baseline update yêu cầu review có lý do, không tự động ghi đè.

**Given** Story 3.5 được đưa vào CI
**When** tests chạy
**Then** có atomic publish/rollback/idempotency/RLS tests
**And** có viewer desktop/mobile/accessibility tests
**And** có test saved lesson load không gọi provider
**And** golden suite bao phủ fully English, mixed-language eligible, weak evidence, invalid exercises và repair exhaustion.

Epic 3 hoàn tất khi user nhận một immutable, grounded, quality-gated Core Lesson có thể đọc và mở lại mà không regeneration.