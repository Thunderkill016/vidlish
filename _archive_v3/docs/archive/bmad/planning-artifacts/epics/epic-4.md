# Epic 4 — Học và luyện tập trực tiếp với video

Người học có thể điều khiển video bằng evidence, làm hoạt động, nhận feedback, luyện retrieval/transfer và lưu completion.

**FRs covered:** FR35–FR38.  
**Dependency:** published lesson persistence (Story 3.6) và readable viewer (Story 3.7).

## Story 4.1 — Điều hướng video bằng timestamp evidence

**As a** người học đang đọc lesson,  
**I want** kích hoạt evidence để mở đúng đoạn video,  
**So that** tôi nghe lại lời nói thật trong ngữ cảnh.

**Requirements:** FR35 · NFR11, NFR13–14 · AD-12–14, AD-19 · UX-DR15–16, UX-DR19–20, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Safe player source

**Given** owner mở published lesson  
**When** player render  
**Then** dùng canonical YouTube video ID từ server DTO  
**And** không nhận arbitrary embed URL/HTML từ lesson content.

#### AC2 — Keyboard/click seek

**Given** source ref có reliable timestamp  
**When** user click hoặc nhấn Enter/Space  
**Then** player seek tới start time và phát theo interaction policy  
**And** focus không mất  
**And** screen reader nhận thông báo ngắn.

#### AC3 — Active segment

**Given** player time thay đổi  
**When** transcript sync bật  
**Then** active segment xác định từ canonical timestamps  
**And** highlight dùng text/icon/background có contrast  
**And** screen reader không bị spam.

#### AC4 — No-timing behavior

**Given** source ref không có timing đủ tin cậy  
**When** viewer render  
**Then** hiển thị non-interactive source reference  
**And** không bịa timestamp hoặc giả seek được.

#### AC5 — Player not ready/blocked

**Given** iframe chưa sẵn sàng hoặc playback bị chặn  
**When** evidence kích hoạt  
**Then** queue bounded hoặc trả retryable product feedback  
**And** lesson content vẫn đọc được  
**And** không reload toàn trang.

#### AC6 — Mobile/accessibility/privacy

**Given** mobile/keyboard user  
**When** evidence activated  
**Then** player được đưa vào view hợp lý không focus trap  
**And** target ≥44px, no color-only state  
**And** telemetry chỉ ghi source-ref ID/timestamp band/result, không transcript text/watch history chi tiết.

#### AC7 — Tests

**Given** Story 4.1 vào CI  
**When** suite chạy  
**Then** có player mock tests cho seek, keyboard/focus, not-ready, no-timing, active segment và mobile behavior.

## Story 4.2 — Làm hoạt động và nhận feedback

**As a** người học,  
**I want** nộp câu trả lời và nhận feedback ngay,  
**So that** tôi biết mình hiểu đúng nội dung/ngôn ngữ hay chưa.

**Requirements:** FR36 · NFR2, NFR11, NFR13–16 · AD-12–14, AD-19 · UX-DR21–22, UX-DR27–32.

### Acceptance Criteria

#### AC1 — Versioned activity catalog

**Given** published activity definitions  
**When** viewer render  
**Then** chỉ allowed versioned activity types được khởi tạo  
**And** unknown/malformed type fail closed  
**And** content không inject HTML/script.

#### AC2 — Deterministic scoring

**Given** supported scored activity  
**When** user submit  
**Then** evaluator dùng published answer contract, không model call  
**And** unanswered/selected/submitted/correct/incorrect/reviewed states có text/icon cùng semantic color  
**And** browser không tự ghi `isCorrect`.

#### AC3 — Listening evidence

**Given** listening activity có reliable source range  
**When** user chọn `Nghe lại`  
**Then** player mở đúng range  
**And** playback failure không tiết lộ đáp án  
**And** không giới hạn lượt nghe bằng gamification.

#### AC4 — Feedback and retry

**Given** answer đúng/sai  
**When** feedback hiển thị  
**Then** giải thích ngắn dựa trên published evidence/explanation  
**And** copy không phán xét  
**And** retry/reset deterministic và không đổi answer key.

#### AC5 — Persistence/idempotency/offline

**Given** attempt submit/retry/double-click/offline  
**When** server sync  
**Then** record owner + lesson version + activity ID, protected by RLS  
**And** idempotency key ngăn duplicate  
**And** pending response có unsynced state rõ ràng.

#### AC6 — Accessibility

**Given** keyboard/screen-reader user  
**When** làm activity  
**Then** group/label/instruction/error liên kết đúng  
**And** focus tới feedback hợp lý  
**And** ordering/matching có keyboard alternative  
**And** reduced-motion respected.

#### AC7 — Tests

**Given** Story 4.2 vào CI  
**When** suite chạy  
**Then** có catalog-contract, deterministic scoring, RLS, idempotency/offline, accessibility và E2E correct/incorrect/replay/retry tests  
**And** no live model/provider.

## Story 4.3 — Retrieval, transfer và hoàn thành lesson

**As a** người học,  
**I want** nhớ lại, vận dụng và kết thúc lesson với trạng thái rõ ràng,  
**So that** việc xem video trở thành một vòng học hoàn chỉnh.

**Requirements:** FR37, FR38 · NFR2, NFR11, NFR13–16 · AD-12–14, AD-20 · UX-DR17, UX-DR23, UX-DR26–32.

### Acceptance Criteria

#### AC1 — Retrieval before reveal

**Given** learner tới retrieval phase  
**When** prompt hiển thị  
**Then** target content/answer được ẩn đến khi learner chủ động attempt/reveal  
**And** prompt liên kết published outcomes.

#### AC2 — Transfer/self-check

**Given** transfer prompt  
**When** learner trả lời  
**Then** họ áp dụng ngôn ngữ vào context mới  
**And** dùng 2–4 published self-check criteria  
**And** open response không bị fake-grade bằng string match/model ngoài scope.

#### AC3 — Exit ticket

**Given** lesson kết thúc  
**When** exit ticket render  
**Then** có takeaway/confidence prompt ngắn  
**And** confidence không bị coi là điểm năng lực khách quan  
**And** learner có thể xem lại evidence.

#### AC4 — Completion policy

**Given** required interactions còn thiếu  
**When** user chọn complete  
**Then** UI chỉ ra phần thiếu hoặc cho explicit complete-anyway nếu policy cho phép  
**And** không ép streak/XP.

#### AC5 — Idempotent completion

**Given** completion criteria/xác nhận đạt  
**When** submit  
**Then** create/update completion record cho owner + lesson version idempotently  
**And** lưu `completedAt` và summary progress cần thiết  
**And** không mutate immutable lesson.

#### AC6 — Reopen and privacy

**Given** completed lesson mở lại  
**When** viewer load  
**Then** attempts/completion/reflection được khôi phục  
**And** learner vẫn luyện lại được  
**And** private transfer/reflection text có RLS/retention dependency và không vào analytics logs.

#### AC7 — Calm completion UX and tests

**Given** completion thành công  
**When** UI phản hồi  
**Then** no confetti/streak/XP; action phù hợp là Library hoặc xem lại  
**And** tests cover retrieval reveal, self-check, completion policy/idempotency, reopen, RLS, accessibility and E2E completion.

Epic 4 hoàn tất khi learner có thể seek evidence, làm activities, retrieval/transfer và lưu completion.