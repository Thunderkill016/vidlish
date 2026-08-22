# Epic 3 — Nhận một bài học tiếng Anh có căn cứ

Từ eligible canonical English source, người học nhận Core Lesson cá nhân hóa theo CEFR, được tạo multi-stage, kiểm định fail-closed, publish nguyên tử và hiển thị dễ đọc.

**FRs covered:** FR14–FR30, FR34, FR39.

## Story 3.1 — Tiền xử lý transcript và phân tích video

**As a** người học có transcript đủ tiếng Anh,  
**I want** Vidlish hiểu nội dung/cấu trúc video dựa trên lời nói gốc,  
**So that** bài học tập trung đúng ngữ cảnh.

**Requirements:** FR14, FR15, FR22–FR24 · NFR8–9, NFR12, NFR15–17, NFR20 · AD-5, AD-9–11, AD-14–19 · UX-DR9–10, UX-DR17, UX-DR24, UX-DR27, UX-DR31–32.

### Acceptance Criteria

#### AC1 — Eligible source boundary

**Given** job ở `analyzing_video`  
**When** preprocessing chạy  
**Then** chỉ `englishSegmentIds` đã được Story 2.3 cho phép đi vào Lesson Engine  
**And** transcript/eligibility hashes và versions được giữ  
**And** non-English/translated/generated segments không support evidence.

#### AC2 — Untrusted input handling

**Given** transcript text chứa instruction/prompt injection  
**When** model context dựng  
**Then** source được delimit như data  
**And** không đổi policy, provider, tool, schema hoặc system instruction  
**And** application verify output trước persistence.

#### AC3 — Long-source preprocessing

**Given** source dài  
**When** analysis input plan  
**Then** deterministic chunking theo stable segment ranges/versioned budget  
**And** không silent truncation  
**And** incomplete coverage không masquerade complete analysis.

#### AC4 — Provider-neutral analysis

**Given** Video Analyst chạy  
**When** application call  
**Then** dùng `VideoAnalysisPort`/`LessonGenerationProvider` boundary  
**And** initial Gemini adapter dùng exact configured model/prompt/schema version  
**And** raw vendor response không vào domain.

#### AC5 — Grounded analysis artifact

**Given** output hợp lệ  
**When** persist  
**Then** artifact có topic, purpose, genre/style, structure, key ideas, listening challenges/low-confidence regions và source refs  
**And** factual claim phải có evidence  
**And** uncertain inference có confidence hoặc omitted.

#### AC6 — Validation, merge and lifecycle

**Given** chunk outputs  
**When** merge/validate  
**Then** deterministic by versions, dedup overlaps, explicit conflicts and coverage checks  
**And** invalid/ungrounded output retry/repair bounded hoặc fail closed  
**And** valid immutable artifact moves `analyzing_video → mining_language`.

#### AC7 — Tests

**Given** Story 3.1 vào CI  
**When** suite chạy  
**Then** có eligible-set, non-English exclusion, injection, chunk/merge, grounding, schema, coverage and idempotency fixtures.

## Story 3.2 — Chọn ngôn ngữ đáng học và mục tiêu bài học

**As a** người học ở một CEFR cụ thể,  
**I want** Vidlish chọn ngôn ngữ/moments vừa sức và có giá trị,  
**So that** bài học không giải thích mọi thứ hoặc chọn item ngẫu nhiên.

**Requirements:** FR16–FR18, FR20–FR22 · NFR8–9, NFR15–17 · AD-10–11, AD-14–17, AD-19 · UX-DR17, UX-DR21, UX-DR24, UX-DR31–32.

### Acceptance Criteria

#### AC1 — Candidate pool

**Given** validated analysis/English source  
**When** Language Miner chạy  
**Then** tạo versioned pool vocabulary/chunks, grammar/noticing, discourse/pragmatics và listening features  
**And** mỗi candidate có form/kind/CEFR/register/context/source IDs/quote/rationale/usefulness/transferability/confidence.

#### AC2 — Candidate grounding

**Given** candidate  
**When** deterministic pre-check chạy  
**Then** quote/range khớp canonical eligible source  
**And** excluded/translated/low-confidence evidence bị loại  
**And** generated explanation/example không được coi là source.

#### AC3 — CEFR personalization

**Given** A1–C1 selection  
**When** rubric/filter áp dụng  
**Then** support, item count, question demand, explanation depth và productive demand thay đổi thực chất  
**And** difficulty không suy ra chỉ từ độ dài.

#### AC4 — Teachable-moment selection

**Given** pool đủ  
**When** selector chạy  
**Then** chọn tập nhỏ theo salience, diversity, learnability, evidence quality và transferability  
**And** loại duplicate/proper noun/specialized low-transfer item khi không cần  
**And** same inputs/algorithm version deterministic.

#### AC5 — Learning outcomes

**Given** selected moments  
**When** planner chạy  
**Then** tối đa ba measurable outcomes phù hợp CEFR  
**And** mỗi outcome liên kết moment/evidence  
**And** không hứa skill/content source không hỗ trợ.

#### AC6 — Fail closed and handoff

**Given** pool/evidence quá yếu  
**When** plan không đủ  
**Then** không bịa hoặc dịch đoạn khác để đủ quota  
**And** fail closed/actionable.

**Given** plan hợp lệ  
**When** commit  
**Then** artifacts immutable/versioned và workflow `mining_language → planning_lesson`.

#### AC7 — Tests

**Given** Story 3.2 vào CI  
**When** suite chạy  
**Then** có A1–C1, mixed-language exclusion, duplicate, low-confidence, max-three outcomes, insufficient-pool and deterministic selector fixtures.

## Story 3.3 — Soạn Core Lesson qua pipeline nhiều bước

**As a** người học,  
**I want** bài học có progression rõ dựa trên đoạn thật,  
**So that** tôi đi từ hiểu nội dung đến nhận ra và dùng ngôn ngữ.

**Requirements:** FR19, FR21–FR24 · NFR8–9, NFR12, NFR15–17, NFR20 · AD-4–5, AD-9–11, AD-14–19 · UX-DR15–18, UX-DR21, UX-DR23–24, UX-DR31–32.

### Acceptance Criteria

#### AC1 — Multi-stage contracts

**Given** validated analysis/moments/outcomes  
**When** generation chạy  
**Then** tách planning → explanation/example composition → activity composition → assembly  
**And** mỗi stage có Zod schema/version và persisted retryable artifact  
**And** cấm one-shot transcript-to-published-lesson.

#### AC2 — Core Lesson progression

**Given** lesson plan  
**When** progression tạo  
**Then** target 10–20 phút với activation/gist → summary/map → noticing → guided practice/listening → comprehension → retrieval → transfer → reflection  
**And** số lượng co giãn theo CEFR/teaching value  
**And** không bịa content để đạt quota.

#### AC3 — Grounded source fields

**Given** source quote/listening/factual detail  
**When** draft assemble  
**Then** có `SourceRef` tới eligible English segment  
**And** source wording giữ theo normalization policy  
**And** generated examples/explanations được phân biệt rõ.

#### AC4 — Provider independence and provenance

**Given** AI stage call  
**When** adapter chạy  
**Then** dùng `LessonGenerationProvider`  
**And** exact model/prompt/schema/pipeline/transcript/eligibility/analysis/mining/planning versions được lưu  
**And** domain không import vendor SDK.

#### AC5 — Injection and partial retry

**Given** malicious source hoặc transient stage failure  
**When** xử lý  
**Then** source không thay policy/tool/schema/secrets  
**And** chỉ failed stage retry bằng stable step ID  
**And** stages pass được reuse  
**And** partial draft không publish/visible.

#### AC6 — Handoff

**Given** assembled draft hợp lệ  
**When** persist  
**Then** immutable draft version tạo idempotently  
**And** workflow chuyển `composing_activities → validating_lesson`.

#### AC7 — Tests

**Given** Story 3.3 vào CI  
**When** suite chạy  
**Then** có stage-contract, progression, source/generated distinction, CEFR, provenance, injection, idempotency and partial-retry tests.

## Story 3.4 — Kiểm định, chấm chất lượng và sửa có giới hạn

**As a** người học,  
**I want** Vidlish chỉ cho qua lesson có cấu trúc, bằng chứng và đáp án đáng tin,  
**So that** tôi không luyện trên content bịa hoặc câu hỏi sai.

**Requirements:** FR25–FR29 · NFR8–9, NFR15–17 · AD-10–12, AD-14–17, AD-19 · UX-DR22, UX-DR24, UX-DR27, UX-DR31–32.

### Acceptance Criteria

#### AC1 — Structural gate

**Given** draft ở `validating_lesson`  
**When** structural validator chạy  
**Then** schema, enums, unique IDs, relationships, required fields và allowed activity types phải pass  
**And** failure chặn publish.

#### AC2 — Grounding gate

**Given** source refs/quotes/claims  
**When** grounding validator chạy  
**Then** segment tồn tại trong eligible set, quote/range/timestamp khớp  
**And** generated/translated/non-English evidence bị hard-fail.

#### AC3 — Exercise validity gate

**Given** scored activity  
**When** validator chạy  
**Then** có answer key, rationale, evidence/criteria, answerability và exactly one best MCQ answer  
**And** timing-required item chỉ dùng source timing đủ chất lượng.

#### AC4 — Rubric and hard gates

**Given** hard gates pass  
**When** rubric chấm  
**Then** versioned 16-point score đánh grounding, progression, CEFR fit và activity validity  
**And** total tối thiểu 14/16  
**And** grounding/exercise validity đạt maximum required  
**And** hard failure không được bù điểm.

#### AC5 — Targeted bounded repair

**Given** repairable module lỗi  
**When** repair chạy  
**Then** chỉ section/error/evidence cần thiết được gửi  
**And** phần valid được giữ  
**And** tối đa một structural và một semantic repair  
**And** repaired content chạy lại relevant gates.

#### AC6 — Fail closed/report

**Given** repair exhaustion hoặc score/gate vẫn fail  
**When** validation kết thúc  
**Then** job fail closed và không publish partial lesson.

**Given** pass  
**When** report persist  
**Then** lưu gate results, subscores, total, repair history và validator versions  
**And** raw score/provider detail hidden from learner.

#### AC7 — Tests

**Given** Story 3.4 vào CI  
**When** suite chạy  
**Then** có fixtures cho missing segment, quote mismatch, non-English evidence, ambiguous answer, bad distractor, timing failure, low score, repair exhaustion and passing case.

## Story 3.5 — Chạy golden regression và khóa release chất lượng

**As a** product team,  
**I want** pipeline/model/prompt changes được so với golden set,  
**So that** chất lượng không suy giảm âm thầm.

**Requirements:** FR30 · NFR9, NFR15–17 · AD-11, AD-16, AD-19 · UX-DR24, UX-DR27.

### Acceptance Criteria

#### AC1 — Versioned golden set

**Given** evaluation fixtures  
**When** quản lý  
**Then** tối thiểu 10 video/cases đa genre/CEFR với transcript/eligible set, expected invariants và versions  
**And** bao phủ mixed-language, weak evidence, invalid exercise, long source và repair exhaustion  
**And** source text tuân bounded/licensed fixture policy.

#### AC2 — Reproducible evaluation

**Given** model/prompt/schema/selector/validator change  
**When** suite chạy  
**Then** đo schema pass, grounding precision, activity answerability, quality score và expected terminal behavior  
**And** report ghi exact versions  
**And** không dùng `*-latest`.

#### AC3 — CI/live separation

**Given** normal CI  
**When** tests chạy  
**Then** dùng deterministic fixtures/mocks  
**And** live evaluation chỉ chạy manually/restricted environment  
**And** sensitive/full transcript output không commit.

#### AC4 — Promotion gate

**Given** hard invariant hoặc threshold regression fail  
**When** promotion đánh giá  
**Then** release bị chặn  
**And** baseline không auto-overwrite  
**And** baseline update cần review/reason/version bump.

#### AC5 — Language invariant

**Given** ineligible/non-English/translated/generated-source fixture  
**When** suite chạy  
**Then** không lesson nào pass  
**And** ineligible fixture không gọi Lesson Engine generation path.

#### AC6 — Safe report

**Given** evaluation hoàn tất  
**When** artifact tạo  
**Then** ghi case/version/pass-fail/safe diagnostics  
**And** không log full prompt/transcript/secrets.

## Story 3.6 — Publish nguyên tử và lưu immutable lesson version

**As a** người học có lesson đã qua Final Quality Gate,  
**I want** lesson được lưu nguyên tử và ổn định,  
**So that** tôi không bao giờ thấy dữ liệu dở dang hoặc bị retry ghi đè.

**Requirements:** FR22, FR28, FR39 · NFR2, NFR7–9, NFR15–16, NFR19 · AD-2–4, AD-12–16, AD-20 · UX-DR24, UX-DR27, UX-DR31–32.

### Acceptance Criteria

#### AC1 — Entity timing

**Given** Story 3.6 migration  
**When** áp dụng  
**Then** tạo lesson identity, immutable `lesson_versions`, validated child/source records và current published pointer  
**And** chưa triển khai full viewer presentation thuộc Story 3.7.

#### AC2 — Publish eligibility

**Given** draft chưa pass all hard gates/score  
**When** publish command được gọi  
**Then** bị từ chối  
**And** không có published pointer/URL/content visibility.

#### AC3 — Atomic transaction

**Given** draft pass Final Gate  
**When** publish transaction/SQL function chạy  
**Then** insert immutable version/children, set current pointer và mark job `completed` atomically  
**And** failure rollback không để partial published data  
**And** job đi `publishing → completed` chỉ sau commit.

#### AC4 — Idempotency and immutability

**Given** publish retry cùng draft hash/pipeline  
**When** command chạy lại  
**Then** không tạo version duplicate  
**And** job link đúng một published version  
**And** published content không bị mutation; regeneration tạo version mới.

#### AC5 — Ownership, RLS and read contract

**Given** lesson records  
**When** owner/cross-owner read  
**Then** RLS/server auth bảo vệ identity/version/children  
**And** cross-owner response không tiết lộ tồn tại  
**And** owner-safe read DTO đủ cho Story 3.7 mà không provider call.

#### AC6 — Backup and telemetry

**Given** durable lesson publish  
**When** operations/logs chạy  
**Then** lesson/version/pointer nằm trong managed backup scope  
**And** telemetry ghi safe version/gate/publish latency  
**And** không log lesson/transcript bodies.

#### AC7 — Tests

**Given** Story 3.6 vào CI  
**When** suite chạy  
**Then** có publish authorization, atomic commit/rollback, idempotency, immutable versioning, RLS/cross-owner and no-partial-visibility tests.

## Story 3.7 — Hiển thị Lesson Viewer dễ đọc và responsive

**As a** người học có published lesson,  
**I want** mở một viewer rõ ràng trên desktop/mobile,  
**So that** tôi bắt đầu học mà không gọi lại AI hoặc thấy internal diagnostics.

**Requirements:** FR34, FR40 · NFR2, NFR11, NFR13–16 · AD-12–14, AD-19 · UX-DR15–18, UX-DR21–24, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Saved-data only

**Given** owner mở `/lessons/{id}`  
**When** viewer load  
**Then** đọc immutable published DTO từ Story 3.6  
**And** không gọi transcript provider, STT, Gemini hoặc generation workflow  
**And** unpublished/cross-owner lesson không lộ.

#### AC2 — Opening and progression

**Given** published lesson  
**When** render  
**Then** hiển thị title, CEFR, estimated time, tối đa ba outcomes, activation/gist trước full support  
**And** lesson phases theo progression đã publish  
**And** không gamification/dashboard.

#### AC3 — Responsive composition

**Given** desktop ≥1100px  
**When** viewer render  
**Then** media rail khoảng 38–42% và reading rail 58–62%, reading width bounded.

**Given** mobile  
**When** viewer render  
**Then** stacked player-first layout, transcript/map trong Accordion/Sheet và no persistent obstructive sticky player.

#### AC4 — Source/generated distinction

**Given** source quote, generated explanation/example hoặc non-English context  
**When** render  
**Then** source English visually/semantically distinct  
**And** generated content labeled  
**And** non-English/translation support không masquerade source evidence.

#### AC5 — Timestamp boundary

**Given** source ref có timestamp  
**When** Story 4.1 chưa tồn tại  
**Then** viewer hiển thị readable non-interactive reference  
**And** không render dead seek button  
**And** Story 4.1 mới thêm player synchronization.

#### AC6 — Internal metadata and performance

**Given** learner viewer  
**When** render  
**Then** raw quality score, provider/request IDs, repair logs và hidden reasoning không lộ  
**And** main saved data target khoảng 3 giây ở điều kiện bình thường  
**And** caching owner-safe.

#### AC7 — Accessibility and tests

**Given** keyboard/screen-reader/mobile/reduced-motion user  
**When** viewer hoạt động  
**Then** WCAG 2.2 AA floor, visible focus, labels, controlled `aria-live`, language attributes và 44px targets  
**And** tests cover seeded published fixture, desktop/mobile, source distinction, no-provider-on-open, no-dead-seek, RLS and accessibility.

Epic 3 hoàn tất khi một immutable, grounded, quality-gated lesson được publish và có readable owner-scoped viewer.