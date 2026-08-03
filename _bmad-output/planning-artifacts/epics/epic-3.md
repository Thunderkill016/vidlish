# Epic 3 — Nhận một bài học tiếng Anh có căn cứ

Từ canonical transcript đủ điều kiện, người dùng nhận được Core Lesson cá nhân hóa theo CEFR, được tạo qua pipeline nhiều bước, kiểm định grounding/exercise validity và publish nguyên tử thành lesson có thể đọc.

**FRs covered:** FR14–FR30, FR34, FR39.

## Story 3.1 — Tiền xử lý transcript và phân tích video

**As a** người học có transcript đủ tiếng Anh,
**I want** Vidlish hiểu nội dung và cấu trúc video dựa trên lời nói gốc,
**So that** bài học tập trung đúng chủ đề và ngữ cảnh thực tế.

**Requirements:** FR14, FR15, FR22–FR24 · NFR8–9, NFR12, NFR15–17, NFR20 · AR2–3, AR6–8, AR12, AR16–17, AR20, AR26 · UX-DR9–10, UX-DR17, UX-DR24, UX-DR27, UX-DR31–32.

**Acceptance Criteria:**

**Given** job ở `analyzing_video` với canonical transcript và eligible English set
**When** preprocessing chạy
**Then** chỉ permitted English segment IDs được đưa vào Lesson Engine source
**And** transcript hash, normalization/eligibility versions và ranges được giữ làm provenance
**And** non-English segments không hỗ trợ quote, grammar/listening hoặc scored evidence.

**Given** transcript text được đưa vào model context
**When** prompt được dựng
**Then** transcript được coi là untrusted data, không phải instruction
**And** delimiter/schema tách source khỏi system rules
**And** prompt injection trong video không đổi policy, tool, provider, model hay output schema.

**Given** source set dài
**When** analysis input được tạo
**Then** chunk deterministic theo stable segment ranges và versioned budget
**And** không silently truncate
**And** mỗi chunk giữ source IDs để merge/trace
**And** incomplete coverage không được coi là complete analysis.

**Given** Video Analyst được gọi
**When** adapter xử lý
**Then** application dùng `VideoAnalysisPort`
**And** Gemini là adapter ban đầu với exact model ID/typed config
**And** domain không import vendor SDK/response
**And** output qua Zod trước persistence.

**Given** analysis thành công
**When** artifact được tạo
**Then** chứa topic, communicative purpose, speaker/audience khi có căn cứ, style, discourse structure, key ideas và source refs
**And** claim cụ thể phải trỏ segment evidence
**And** inference không chắc chắn có confidence hoặc omitted.

**Given** chunk results merge
**When** aggregate chạy
**Then** deterministic theo input/model/prompt/schema/merge versions
**And** overlap không tạo duplicate idea
**And** conflict hạ confidence hoặc giữ explicit, không tự chọn tùy ý.

**Given** output sai schema, thiếu coverage hoặc không grounded
**When** validation chạy
**Then** không persist như valid analysis
**And** bounded retry/repair hoặc fail closed
**And** raw provider output không lộ cho user.

**Given** artifact hợp lệ commit
**When** workflow tiếp tục
**Then** `analyzing_video → mining_language`
**And** artifact immutable/versioned
**And** retry không tạo duplicate.

**Given** Story 3.1 vào CI
**When** tests chạy
**Then** có prompt-injection, non-English exclusion, chunk/merge, grounding, schema, coverage và idempotency tests
**And** CI dùng fixtures.

## Story 3.2 — Chọn ngôn ngữ đáng học và mục tiêu bài học

**As a** người học ở một CEFR cụ thể,
**I want** Vidlish chọn từ, cấu trúc và khoảnh khắc vừa sức,
**So that** bài học tập trung phần có giá trị nhất thay vì giải thích mọi thứ.

**Requirements:** FR16–FR18, FR20–FR22 · NFR8–9, NFR15–17 · AR12, AR16–18, AR20 · UX-DR17, UX-DR21, UX-DR24, UX-DR31–32.

**Acceptance Criteria:**

**Given** validated analysis và eligible source segments
**When** Language Miner chạy
**Then** tạo versioned candidate pool gồm vocabulary/chunks, grammar/noticing, discourse/pragmatics và listening features
**And** mỗi candidate có source IDs, exact quote/range, rationale, estimated CEFR và confidence
**And** generated explanation/example không phải source evidence.

**Given** candidate được trích xuất
**When** grounding pre-check chạy
**Then** quote khớp canonical text theo normalization policy
**And** range/timestamp nằm trong source
**And** candidate từ non-English/translated/low-confidence excluded segment bị loại.

**Given** learner chọn A1–C1
**When** CEFR filter áp dụng
**Then** dùng versioned rubrics
**And** A1/A2 ưu tiên high-frequency/concrete/scaffolded
**And** B1/B2 tăng nuance/discourse/productive use
**And** C1 có thể chọn register/collocation tinh tế nhưng vẫn grounded
**And** difficulty không suy ra chỉ từ độ dài.

**Given** candidate pool đủ
**When** teachable-moment selector chạy
**Then** chọn tập nhỏ có diversity, salience, learnability, evidence quality và coverage cho lesson 10–20 phút
**And** không chọn duplicate phenomena do model lặp
**And** deterministic với cùng inputs/algorithm version.

**Given** selected moments
**When** planner tạo outcomes
**Then** tối đa ba measurable outcomes phù hợp CEFR
**And** mỗi outcome liên kết moment/evidence
**And** không hứa content/kỹ năng không thể luyện từ source.

**Given** mixed-language eligible video
**When** mining/selection chạy
**Then** chỉ eligible English set dùng cho language/scored evidence
**And** non-English context không biến thành English source.

**Given** pool quá yếu
**When** planner đánh giá
**Then** fail closed
**And** không bịa item hay dịch đoạn khác để đủ số lượng.

**Given** plan hợp lệ commit
**When** workflow tiếp tục
**Then** `mining_language → planning_lesson`
**And** pool/moments/outcomes/rubric/selection versions immutable
**And** retry không tạo duplicate.

**Given** Story 3.2 vào CI
**When** tests chạy
**Then** có A1–C1, mixed-language, duplicate, low-confidence, max-three outcomes, insufficient-pool và deterministic selection fixtures.

## Story 3.3 — Soạn Core Lesson qua pipeline nhiều bước

**As a** người học,
**I want** nhận một bài học có trình tự rõ dựa trên các đoạn thật,
**So that** tôi hiểu nội dung, nhận ra ngôn ngữ và luyện tập vừa sức.

**Requirements:** FR19, FR21–FR24 · NFR8–9, NFR12, NFR15–17, NFR20 · AR16–20, AR22, AR26 · UX-DR15–18, UX-DR21, UX-DR23–24, UX-DR31–32.

**Acceptance Criteria:**

**Given** validated analysis, moments và outcomes
**When** pipeline chạy
**Then** tách stage tối thiểu planning → explanation/example composition → activity composition → assembly
**And** mỗi stage dùng versioned Zod contract
**And** persist artifact cần thiết để retry stage riêng.

**Given** Core Lesson được plan
**When** progression tạo
**Then** target 10–20 phút với gist/context → noticing → guided understanding/practice → retrieval/transfer preparation
**And** progression linh hoạt theo source/CEFR
**And** tối đa ba outcomes được phản ánh.

**Given** lesson dùng lời nói video
**When** source material vào schema
**Then** mọi quote/listening prompt có `SourceRef` tới eligible English segment
**And** wording giữ theo normalization policy
**And** không sửa grammar trong source quote.

**Given** system tạo explanation/example
**When** assemble
**Then** generated content có label/provenance khác source
**And** không trình bày generated sentence như lời speaker
**And** phù hợp CEFR và context.

**Given** provider generation chạy
**When** application gọi
**Then** dùng `LessonGenerationProvider`
**And** Gemini adapter dùng exact model/prompt/schema versions và server config
**And** provider có thể thay mà không đổi lesson schema.

**Given** lesson draft assemble
**When** persist
**Then** lưu schema/pipeline/transcript/eligibility/analysis/mining/planning/model/prompt versions và source refs
**And** draft immutable theo version
**And** retry cùng inputs không tạo duplicate ngoài policy.

**Given** source chứa prompt injection
**When** stage chạy
**Then** không đổi schema/policy/tool/provider/source eligibility
**And** output ngoài schema bị từ chối
**And** không tiết lộ secrets/system instructions.

**Given** một stage lỗi tạm thời
**When** retry
**Then** chỉ retry stage cần thiết với stable step ID
**And** tái sử dụng stage đã pass
**And** không publish partial lesson.

**Given** draft assemble xong
**When** workflow tiếp tục
**Then** chuyển `validating_lesson`
**And** draft chưa visible như published lesson.

**Given** Story 3.3 vào CI
**When** tests chạy
**Then** có stage-contract, source/generated, CEFR, provenance, injection và partial-retry tests
**And** CI dùng fixtures.

## Story 3.4 — Kiểm định, chấm chất lượng và sửa có giới hạn

**As a** người học,
**I want** Vidlish chỉ công bố bài khi cấu trúc, đáp án và bằng chứng đáng tin,
**So that** tôi không luyện trên content bịa hoặc câu hỏi sai.

**Requirements:** FR25–FR29 · NFR8–9, NFR15–17 · AR16, AR19–22, AR25, AR30 · UX-DR22, UX-DR24, UX-DR27, UX-DR31–32.

**Acceptance Criteria:**

**Given** draft ở `validating_lesson`
**When** structural gate chạy
**Then** pass Zod schema, referential integrity, unique IDs, allowed activity types và required fields
**And** structural error chặn publish.

**Given** lesson có source refs/quotes
**When** grounding gate chạy
**Then** segment tồn tại, eligible-English, quote/range khớp và timestamp hợp lệ
**And** translated/generated/non-English evidence bị chặn.

**Given** lesson có scored activity
**When** validity gate chạy
**Then** mỗi item answerable từ stimulus/evidence, distractors hợp lý, answer contract không ambiguity ngoài chủ ý và feedback phù hợp
**And** timing-required activity phải có timing quality đủ
**And** không đoán đáp án.

**Given** hard gates pass
**When** quality rubric chấm
**Then** đánh giá grounding, progression, CEFR fit và activity validity trên versioned 16-point rubric
**And** tổng tối thiểu 14/16
**And** hard-gate failure không được bù điểm.

**Given** lỗi repairable
**When** targeted repair chạy
**Then** chỉ gửi section/lỗi/evidence cần thiết
**And** giữ phần đã valid
**And** repair count bounded
**And** phần sửa chạy lại mọi gate liên quan.

**Given** repair vượt limit hoặc vẫn fail
**When** validation kết thúc
**Then** fail closed
**And** không publish draft kém chất lượng
**And** UI không lộ raw model output.

**Given** lesson pass
**When** report persist
**Then** lưu gate results, rubric subscores, total, repair history và validator versions
**And** internal score không hiển thị cho learner theo mặc định.

**Given** retry validation
**When** draft hash/validator versions không đổi
**Then** report tái sử dụng hoặc deterministic
**And** không repair trùng ngoài policy.

**Given** Story 3.4 vào CI
**When** tests chạy
**Then** có failing fixtures cho missing segment, quote mismatch, non-English evidence, ambiguous answer, bad distractor, missing timing, score thấp và repair exhaustion
**And** có passing fixture.

## Story 3.5 — Chạy golden regression và khóa release chất lượng

**As a** product team vận hành private beta,
**I want** các thay đổi pipeline/model/prompt được so với bộ lesson chuẩn,
**So that** chất lượng grounding và hoạt động không suy giảm âm thầm trước khi release.

**Requirements:** FR30 · NFR9, NFR15–17 · AR17, AR22, AR25, AR30 · UX-DR24, UX-DR27.

**Acceptance Criteria:**

**Given** golden evaluation set
**When** fixture được quản lý
**Then** mỗi case có source transcript/eligible segment set, CEFR, expected pass/fail constraints và version
**And** bao phủ fully English, mixed-language eligible, weak evidence, invalid exercises, long source và repair exhaustion
**And** copyrighted source text trong repo chỉ dùng bounded/licensed fixtures theo policy.

**Given** pipeline/schema/prompt/model/validator thay đổi
**When** evaluation suite chạy
**Then** đo schema pass, grounding precision, activity answerability, quality score và expected terminal behavior
**And** output report reproducible theo exact versions
**And** không dùng `*-latest` model aliases.

**Given** CI mặc định
**When** tests chạy
**Then** dùng deterministic fixtures/mocks, không gọi live provider
**And** separately triggered evaluation có thể gọi live provider bằng restricted environment/keys
**And** live output không được commit nếu chứa sensitive/full transcript data.

**Given** regression vượt allowed threshold hoặc hard invariant fail
**When** promotion gate đánh giá
**Then** release bị chặn
**And** baseline không tự ghi đè
**And** baseline update cần review, reason và version bump.

**Given** language eligibility invariant
**When** suite chạy
**Then** không lesson nào pass khi source evidence là non-English/translated/generated substitute
**And** ineligible fixture không gọi Lesson Engine generation fixture.

**Given** Story 3.5 vào CI
**When** suite hoàn tất
**Then** report artifact nêu case, versions, pass/fail và safe diagnostics
**And** không log full transcript/prompt/secrets.

## Story 3.6 — Publish nguyên tử và hiển thị Lesson Viewer

**As a** người học,
**I want** mở một bài học hoàn chỉnh, dễ đọc sau kiểm định,
**So that** tôi bắt đầu học mà không thấy dữ liệu dở dang hoặc phải tạo lại.

**Requirements:** FR34, FR39 · NFR2, NFR7–9, NFR11–16, NFR19 · AR3–5, AR18–20, AR22–25, AR27–28 · UX-DR15–18, UX-DR21–24, UX-DR27–32.

**Acceptance Criteria:**

**Given** draft chưa pass Final Quality Gate
**When** user/route cố mở lesson
**Then** không có published URL/content
**And** partial section không lộ như complete lesson.

**Given** draft pass gates/score
**When** publish transaction chạy
**Then** tạo immutable lesson version, sections/items/source refs và published pointer atomically
**And** job chỉ `publishing → completed` sau commit
**And** failure rollback không để partial published data.

**Given** publish retry
**When** cùng draft/pipeline chạy lại
**Then** idempotency ngăn version trùng
**And** job liên kết đúng một published version.

**Given** user mở `/lessons/{id}`
**When** lesson thuộc owner
**Then** đọc saved data, không gọi Gemini/transcript/STT
**And** cross-owner response không tiết lộ tồn tại
**And** RLS bảo vệ lesson/children.

**Given** desktop viewer
**When** render
**Then** split media 38–42% / content 58–62% theo UX
**And** mobile stacked
**And** title, CEFR, estimated time, tối đa ba outcomes, activation/gist xuất hiện trước detail
**And** progression rõ nhưng không gamification.

**Given** source/generated content render
**When** learner đọc
**Then** label rõ source speech và generated explanation/example
**And** timestamp/source reference hiển thị readable
**And** trước Story 4.1 reference không giả làm seek control; Story 4.1 thêm interaction.

**Given** internal quality/provenance metadata
**When** learner xem
**Then** raw score, provider IDs, repair logs và chain-of-thought không lộ
**And** audit metadata chỉ server/internal diagnostics.

**Given** loading/empty/error/mobile/keyboard/reduced-motion states
**When** UI hoạt động
**Then** WCAG 2.2 AA, visible focus, labels, aria-live có kiểm soát, 44px targets và no color-only feedback.

**Given** saved lesson load bình thường
**When** request hoàn tất
**Then** target khoảng 3 giây
**And** caching owner-safe
**And** immutable version có thể cache mà không cross-user leak.

**Given** Story 3.6 vào CI
**When** tests chạy
**Then** có atomic publish/rollback/idempotency/RLS, viewer desktop/mobile/accessibility và no-provider-on-reopen tests.

Epic 3 hoàn tất khi user nhận một immutable, grounded, quality-gated Core Lesson có thể đọc và mở lại không regeneration.