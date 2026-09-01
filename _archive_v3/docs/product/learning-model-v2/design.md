# Vidlish Learning Model v2

**Trạng thái:** design gate passed with constraints  
**Ngày:** 2026-08-06  
**Nguồn audit:** [`research-and-audit.md`](./research-and-audit.md)

---

## 1. Product thesis

Vidlish không phải công cụ “tóm tắt video rồi thêm từ vựng”. Sản phẩm phải biến một video tiếng Anh thật thành một phiên học có mục đích, có effort, có feedback, có retrieval và có transfer.

```text
learner context
+ video evidence
+ learning goal
→ learning blueprint bất biến
→ learning session có trạng thái
→ attempts/retrieval evidence
→ review queue
```

### Lời hứa v2

> Sau một phiên Vidlish, người học không chỉ biết video nói gì. Họ phải hiểu được một phần khó có chủ đích, nhớ lại được một số ngôn ngữ hữu ích và dùng được ít nhất một mục trong tình huống mới.

### Invariant giữ từ v1

Mọi nội dung được tuyên bố là “lời trong video” phải trỏ tới canonical permitted segment IDs và text/timestamp chỉ được hydrate từ server.

### Invariant mới

Không được trình bày content do model tạo như source evidence. Mọi block phải khai báo một trong ba origin:

```text
source_quote             canonical transcript, server hydrated
pedagogical_explanation  authored/generated explanation, grounded to source item
transfer_example         generated new context, explicitly labelled as new
```

---

## 2. Learning model

### 2.1 Learner context tối thiểu

V2 không cần xây một “AI tutor profile” phức tạp ngay. Learner snapshot đầu tiên chỉ gồm:

```ts
type LearnerContextSnapshot = {
  targetCefr: "A1" | "A2" | "B1" | "B2" | "C1";
  goals: Array<"listening" | "vocabulary" | "conversation" | "pronunciation" | "comprehension">;
  timeBudgetMinutes: 5 | 10 | 15 | 20;
  supportPreference: "more_support" | "balanced" | "more_challenge";
  knownItemKeys: string[];
  weakItemKeys: string[];
  recentReviewOutcomes: Array<{
    itemKey: string;
    outcome: "again" | "hard" | "good";
    occurredAt: string;
  }>;
};
```

Không dùng target CEFR như một phép đo toàn diện hay chẩn đoán tâm lý. Đây là preference/input để điều chỉnh support và task demand.

### 2.2 Video diagnosis

Video profile được tính trước authoring:

```ts
type VideoLearningProfile = {
  durationMs: number;
  speechDensity: "low" | "medium" | "high";
  estimatedSpeechRateWpm: number | null;
  topicShiftCount: number;
  register: Array<"neutral" | "informal" | "slang" | "technical" | "argumentative">;
  audioChallenge: Array<"fast" | "overlap" | "noise" | "accent" | "reduction" | "none">;
  lexicalCoverageEstimate: number | null;
  backgroundKnowledgeDependency: "low" | "medium" | "high";
  candidateWindows: LearningWindowCandidate[];
};
```

Một `LearningWindowCandidate` là một đoạn có biên ý nghĩa, không chỉ một segment đơn:

```ts
type LearningWindowCandidate = {
  id: string;
  sourceSegmentIds: string[];
  startMs: number;
  endMs: number;
  gist: string;
  discourseFunction: string;
  acousticFeatures: string[];
  candidateLanguageItems: CandidateLanguageItem[];
  evidenceConfidence: number;
};
```

Diagnosis không tự tuyên bố “video C1”. UI trình bày challenge dimensions cụ thể, ví dụ “nói nhanh + slang + đổi chủ đề liên tục”.

### 2.3 Can-do outcomes

Mỗi blueprint có 2–4 outcomes. Outcome phải:

- quan sát được;
- phù hợp time budget;
- trace tới learning window;
- có evidence task;
- tránh động từ mơ hồ như “biết”, “hiểu từ vựng”.

Ví dụ tốt cho screenshot IShowSpeed:

- “Xác định được thái độ của người nói trong hai reaction clips mà không cần transcript đầy đủ.”
- “Nhận ra và giải thích được chức năng của 2–3 reaction chunks trong livestream context.”
- “Dùng một reaction chunk phù hợp để phản hồi một clip mới.”

### 2.4 Lesson phases

Không phải lesson nào cũng cần mọi phase với cùng độ dài, nhưng sequence semantics là cố định:

1. `orientation` — mục tiêu, time budget, challenge profile.
2. `activation` — prediction/background activation, không reveal summary.
3. `gist` — first viewing có purpose, transcript controlled.
4. `focus` — learner-paced clip window, replay/caption toggle.
5. `notice` — meaning/function/register/sound của vài target chunks.
6. `practice` — task đóng, deterministic feedback.
7. `retrieve` — target bị ẩn, learner recall trước reveal.
8. `transfer` — context mới, self-check criteria, không fake-grade.
9. `reflect` — exit ticket + confidence as self-report.
10. `completed` — session closed, review queue scheduled.

Lesson 5 phút có thể gộp `focus + notice` và chỉ có một item. Lesson 20 phút có nhiều window, nhưng không được tăng item chỉ để đầy màn hình.

---

## 3. Content-selection algorithm

### 3.1 Nguyên tắc

Model không được nhìn toàn transcript rồi tự quyết tất cả trong một bước. Pipeline tạo candidates, chấm điểm, áp diversity/budget constraints và cho model giải thích/rank trong phạm vi đó.

### 3.2 Candidate language item

```ts
type CandidateLanguageItem = {
  key: string;
  surfaceForm: string;
  normalizedForm: string;
  sourceSegmentIds: string[];
  kind: "chunk" | "word" | "grammar_function" | "discourse_marker" | "pronunciation_pattern";
  contextualMeaning: string;
  communicativeFunction: string | null;
  register: string;
  recurrenceCount: number;
  corpusFrequencyBand: "high" | "mid" | "low" | "unknown";
  acousticSalience: number;
  evidenceConfidence: number;
};
```

### 3.3 Score

Score không phải một “truth number”; nó là ranking heuristic có log explanation:

```text
pedagogical_value =
  0.24 × learner_gap
+ 0.20 × outcome_relevance
+ 0.16 × transfer_value
+ 0.12 × contextual_clarity
+ 0.10 × recurrence_or_frequency
+ 0.08 × pragmatic_register_value
+ 0.06 × acoustic_teachability
+ 0.04 × evidence_confidence
- redundancy_penalty
- cognitive_cost_penalty
- proper_noun_or_trivia_penalty
```

Weights là v0, phải benchmark và hiệu chỉnh; không tuyên bố được nghiên cứu chứng minh trực tiếp.

### 3.4 Hard rejection

Candidate bị loại nếu:

- không có permitted evidence;
- chỉ là tên riêng/trivia không phục vụ outcome;
- meaning không xác định được từ context;
- generic explanation sẽ có ích như nhau nếu bỏ video;
- learner đã retrieve thành công gần đây và không có lý do review;
- target vượt cognitive budget của session;
- generated example không thể tạo scenario liên quan outcome.

### 3.5 Budget

```text
5 phút:  1 window, 1–2 targets, 3–4 learner actions
10 phút: 1–2 windows, 2–3 targets, 5–7 actions
15 phút: 2 windows, 3–4 targets, 7–9 actions
20 phút: 2–3 windows, 3–5 targets, 8–12 actions
```

Đây là initial product budget, không phải fixed minimum. Hệ thống được quyền tạo ít hơn hoặc báo teachable value thấp.

---

## 4. Activity model

### 4.1 Blueprint activity

```ts
type LearningActivity = {
  id: string;
  phase: "activation" | "gist" | "focus" | "notice" | "practice" | "retrieve" | "transfer" | "reflect";
  outcomeIds: string[];
  activityType:
    | "prediction"
    | "gist_choice"
    | "evidence_choice"
    | "meaning_in_context"
    | "function_choice"
    | "listening_cloze"
    | "chunk_recall"
    | "guided_transfer"
    | "exit_ticket";
  instructionVi: string;
  evidence: EvidenceRef[];
  presentation: ActivityPresentation;
  evaluation: EvaluationPolicy;
  feedback: FeedbackPolicy;
  estimatedSeconds: number;
};
```

### 4.2 Evidence

```ts
type EvidenceRef = {
  sourceSegmentIds: string[];
  startMs: number;
  endMs: number;
  captionPolicy: "hidden_first" | "toggle" | "shown";
  replayAllowed: true;
};
```

Timestamps phải được server derive từ canonical segments. Model chỉ chọn labels/IDs.

### 4.3 Evaluation policies

```ts
type EvaluationPolicy =
  | { kind: "single_choice"; correctOptionId: string }
  | { kind: "normalized_text_set"; accepted: string[] }
  | { kind: "self_check"; criteria: string[]; exemplarAfterAttempt?: string }
  | { kind: "unscored_reflection" };
```

- `single_choice` và `normalized_text_set`: server/shared deterministic evaluator.
- `self_check`: không trả correct/incorrect; learner đánh dấu criteria sau attempt.
- Không có `llm_grade` trong v2 vertical slice.

### 4.4 Runtime state

```ts
type ActivityState =
  | "unseen"
  | "viewed"
  | "attempted"
  | "answered"
  | "feedback"
  | "retrieved"
  | "transferred"
  | "completed";
```

Transition được server validate. UI không thể gửi thẳng `completed` cho activity chưa attempt khi policy yêu cầu attempt.

---

## 5. Feedback model

Feedback không chỉ là “Đúng/Sai”. Contract:

```ts
type ActivityFeedback = {
  verdict: "correct" | "incorrect" | "partial" | "self_check" | "unscored";
  goalVi: string;
  evidenceVi: string;
  nextStepVi: string;
  evidenceRefs: EvidenceRef[];
  reveal?: {
    answer?: string;
    explanationVi?: string;
  };
};
```

Quy tắc:

- chỉ có feedback sau attempt;
- không praise personality;
- incorrect feedback không reveal ngay nếu hint policy còn lượt;
- evidence text hydrate server-side;
- feedback không chứa transcript ngoài evidence refs;
- retry giữ nguyên answer key;
- replay không tiết lộ answer.

---

## 6. Mastery và review model

Không dùng “mastered” binary ở phiên đầu. Item state tối thiểu:

```ts
type LearningItemState = {
  ownerUserId: string;
  itemKey: string;
  exposureCount: number;
  attemptCount: number;
  successfulRetrievals: number;
  lastOutcome: "again" | "hard" | "good" | null;
  lastSeenAt: string;
  nextReviewAt: string | null;
  sourceLessonVersionId: string;
};
```

Initial schedule:

- `again`: review trong cùng phiên hoặc ngày kế;
- `hard`: khoảng 1 ngày;
- `good`: khoảng 3 ngày;
- sau successful retrieval tiếp theo có thể mở rộng.

Schedule này là conservative default và phải feature-flag/configurable. Không dùng confidence self-report như objective mastery.

---

## 7. Lesson schema v2

### 7.1 Immutable blueprint

```ts
const lessonBlueprintV2Schema = z.object({
  schemaVersion: z.literal("lesson:v2"),
  blueprintId: z.string().uuid(),
  source: z.object({
    jobId: z.string().uuid(),
    videoId: videoIdSchema,
    transcriptHash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  learnerSnapshot: learnerContextSnapshotSchema,
  videoProfile: videoLearningProfileSchema,
  outcomes: z.array(canDoOutcomeSchema).min(1).max(4),
  targetItems: z.array(targetLanguageItemSchema).max(5),
  activities: z.array(learningActivitySchema).min(3).max(12),
  provenance: blueprintProvenanceSchema,
  createdAt: offsetDateTimeSchema,
}).strict();
```

Không đặt minimum vocabulary/grammar/category. Validation nằm ở coherence:

- mỗi activity outcome trace hợp lệ;
- mỗi source-derived item có permitted segment;
- retrieval target đã được notice/practice hoặc explicit diagnostic;
- transfer có self-check criteria;
- phase ordering hợp lệ;
- total estimated time nằm trong budget tolerance;
- generated examples có `origin = transfer_example`.

### 7.2 Content origin

```ts
type ContentBlock =
  | {
      origin: "source_quote";
      sourceSegmentIds: string[];
      // text/timestamp không nằm trong model output; hydrate server-side
    }
  | {
      origin: "pedagogical_explanation";
      groundedItemId: string;
      textVi: string;
      authoringModel: string;
    }
  | {
      origin: "transfer_example";
      targetItemIds: string[];
      textEn: string;
      contextVi: string;
      authoringModel: string;
    };
```

### 7.3 Mutable session

```ts
const lessonSessionSchema = z.object({
  id: z.string().uuid(),
  ownerUserId: z.string().uuid(),
  lessonVersionId: z.string().uuid(),
  status: z.enum(["not_started", "in_progress", "completed", "abandoned"]),
  currentPhase: lessonPhaseSchema,
  currentActivityId: z.string(),
  startedAt: offsetDateTimeSchema.nullable(),
  completedAt: offsetDateTimeSchema.nullable(),
  updatedAt: offsetDateTimeSchema,
});
```

### 7.4 Attempt

```ts
const activityAttemptSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  activityId: z.string(),
  attemptNumber: z.number().int().positive(),
  idempotencyKey: z.string().uuid(),
  response: z.discriminatedUnion("kind", [choiceResponse, textResponse, selfCheckResponse]),
  evaluation: activityEvaluationResultSchema,
  submittedAt: offsetDateTimeSchema,
});
```

### 7.5 Versioning/migration

- `lesson:v1` vẫn đọc được qua legacy viewer.
- Không rewrite v1 thành v2 tự động; thiếu learner snapshot/outcomes làm conversion không đáng tin.
- V2 tạo record mới trong `lesson_versions` hoặc mở rộng `lessons` bằng versioned content column; lựa chọn cuối cùng ở migration design.
- Library hiển thị badge “Bài học cũ” cho v1, không giả vờ có session state.
- Runtime route dispatch theo `schema_version`.

---

## 8. Database design

Vertical slice dùng additive tables, không phá `lessons`:

```sql
lesson_versions
- id uuid pk
- lesson_id uuid fk lessons
- owner_user_id uuid
- schema_version text check lesson:v2
- blueprint jsonb
- created_at timestamptz
- unique (lesson_id, schema_version)

lesson_sessions
- id uuid pk
- lesson_version_id uuid fk
- owner_user_id uuid
- status text
- current_phase text
- current_activity_id text
- started_at/completed_at/updated_at
- unique partial: one active session per owner + lesson_version

activity_attempts
- id uuid pk
- session_id uuid fk
- owner_user_id uuid
- activity_id text
- attempt_number int
- idempotency_key uuid unique
- response jsonb
- evaluation jsonb
- submitted_at timestamptz
- unique(session_id, activity_id, attempt_number)

learning_item_states
- owner_user_id uuid
- item_key text
- counters/outcome/next_review_at
- source_lesson_version_id uuid
- primary key(owner_user_id, item_key)
```

RLS:

- authenticated chỉ select/insert/update row mình sở hữu qua controlled RPC hoặc strict policies;
- blueprint publish chỉ service role;
- attempt RPC validate activity ID/evaluation policy từ immutable blueprint;
- browser không gửi `isCorrect` authoritative;
- delete lifecycle phải cascade session/attempt và xử lý item state theo retention policy.

---

## 9. Generation pipeline v2

### Step 1 — deterministic context assembly

Input: job, canonical transcript, learner snapshot, time budget.  
Không LLM. Validate ownership, eligible segments, transcript hash.

### Step 2 — deterministic/video diagnostics

- duration/speech density;
- topic boundary heuristics;
- repeated forms/chunks;
- lexical challenge signals;
- candidate clip windows.

Không cần claim accent classification nếu confidence thấp; dùng `unknown`.

### Step 3 — constrained LLM diagnosis/ranking

LLM nhận candidate windows + short labels, không nhận nhiệm vụ author toàn lesson. Nó đề xuất:

- discourse function;
- can-do outcome candidates;
- candidate item meaning/function/register;
- teachability rationale.

Output schema nhỏ, có confidence và abstain reason.

### Step 4 — deterministic candidate gate

- grounding;
- learner-gap filtering;
- duplicate normalization;
- budget/diversity constraints;
- reject proper noun/trivia/filler;
- select windows/items.

### Step 5 — LLM blueprint authoring

LLM chỉ author:

- instructions;
- distractors;
- concise explanations;
- generated transfer scenario/example;
- self-check criteria.

Nó không author source quote/timestamp.

### Step 6 — deterministic blueprint compiler

- hydrate evidence;
- validate phase graph;
- validate outcome trace;
- validate answer uniqueness;
- verify cloze source token;
- verify no answer leak before attempt;
- enforce time budget;
- origin/provenance checks.

### Step 7 — bounded repair

Chỉ repair field-specific validation failures. Không cho model rewrite toàn lesson vô hạn. Max 1 repair attempt trong vertical slice.

### Step 8 — atomic publish

Publish immutable blueprint/version và complete generation job atomically. Session chỉ tạo khi learner mở lesson.

### Step 9 — deterministic runtime

Attempt evaluation, feedback selection, phase progression, completion and review scheduling không cần provider call.

---

## 10. UX specification

### 10.1 Desktop

```text
┌───────────────────────────────┬──────────────────────────────┐
│ sticky video / clip controls  │ current task                │
│ caption toggle, replay range  │ instruction                 │
│ challenge indicator           │ response                    │
│ evidence after attempt        │ feedback / next action      │
└───────────────────────────────┴──────────────────────────────┘
│ phase rail: Gist → Focus → Notice → Recall → Use             │
└───────────────────────────────────────────────────────────────┘
```

- Player không phải decorative header.
- Task điều khiển player window.
- Transcript/evidence chỉ reveal theo policy.
- Không render tất cả section cùng lúc.

### 10.2 Mobile

- compact/sticky player ở đầu viewport;
- một task card toàn chiều rộng;
- controls ≥44px;
- bottom action bar chỉ có action hiện tại (`Kiểm tra`, `Nghe lại`, `Tiếp tục`);
- evidence mở inline, không focus trap;
- reduced motion respected.

### 10.3 Progressive disclosure

- orientation chỉ hiện outcomes/challenge/time;
- first viewing không hiện summary;
- answer/evidence sau attempt;
- explanation theo need-to-know;
- library card không đổ toàn blueprint.

### 10.4 States

- loading: giữ current phase và skeleton đúng task;
- offline attempt: local pending state, không giả synced;
- duplicate submit: idempotent response;
- player blocked: task vẫn đọc được, retry/open YouTube là fallback;
- malformed/unknown activity: fail closed, không render raw JSON;
- reopen: resume current activity và restored attempts;
- legacy v1: read-only legacy viewer với warning, không giả v2 progression.

### 10.5 Accessibility

- semantic form controls và fieldset/legend;
- feedback region có controlled `aria-live`;
- focus chuyển tới feedback/next heading, không nhảy player tùy tiện;
- keyboard replay/caption/submit;
- state không chỉ bằng màu;
- screen reader không bị spam theo player time update.

---

## 11. Evaluation plan

### 11.1 Learning-quality rubric

Mỗi generated blueprint được chấm 0–2 trên:

1. outcome observability;
2. source grounding;
3. target-item usefulness;
4. context specificity;
5. answer validity/distractor quality;
6. no answer leakage;
7. retrieval quality;
8. transfer authenticity;
9. feedback actionability;
10. CEFR/support fit;
11. cognitive budget;
12. provenance clarity.

Hard fail nếu grounding/provenance/answer uniqueness sai.

### 11.2 Golden video set

Tối thiểu 12 video/clip profiles:

- tutorial rõ ràng;
- interview;
- vlog;
- entertainment reaction;
- fast slang/livestream;
- multiple speakers/overlap;
- accents khác nhau;
- short clip;
- 20+ minute video;
- mixed topic;
- low lexical challenge;
- poor teachable value.

Mỗi video có expert-authored expectations về windows, outcomes, reject items và failure/abstain conditions. Không đòi model khớp wording chính xác.

### 11.3 Human/expert review

- ít nhất hai giáo viên/SLA-informed reviewers cho initial set;
- report agreement theo rubric dimension;
- disagreements được dùng để sửa rubric, không ép consensus giả.

### 11.4 Learner measures

Tách rõ:

- immediate gist/comprehension;
- immediate target recall;
- delayed recall 24h/7d;
- transfer/self-check quality;
- caption/replay usage;
- abandon/resume;
- perceived usefulness.

Không gọi completion rate là learning gain.

### 11.5 Release gates

- schema/grounding/property tests;
- activity evaluator tests;
- RLS/idempotency tests;
- desktop/mobile/keyboard E2E;
- golden blueprint rubric threshold;
- provider-backed run trên ít nhất hai video khi có explicit quota permission;
- no merge nếu screenshot vẫn có hình thái summary + bulk list + answers-on-demand.

---

## 12. Vertical slice đầu tiên

### Mục tiêu

Chứng minh v2 là một phiên học, không phải thêm vài component lên v1.

### Scope

Một coherent sequence cho một clip window:

1. orientation với 1–2 can-do outcomes;
2. gist question trước transcript;
3. focused replay với caption toggle;
4. một grounded language chunk với meaning/function/register;
5. deterministic practice;
6. retrieval-before-reveal;
7. guided transfer + self-check;
8. persisted session/attempt/resume.

### Không thuộc slice

- full learner adaptivity;
- AI grade open response;
- complex spacing optimizer;
- pronunciation scoring;
- migrating v1 content thành v2;
- production provider rollout.

### Technical deliverables

- `lesson:v2` contracts;
- additive migration cho version/session/attempt/item state;
- deterministic fixture/golden blueprint;
- v2 viewer shell và activity flow;
- attempt/evaluation RPC hoặc application use case;
- RLS/idempotency tests;
- unit + Chromium journey;
- draft PR only until provider-backed output is reviewed.

---

## 13. Self-critique như chuyên gia SLA/product/engineering

### Critique 1 — Quá nhiều phase có thể biến thành wizard máy móc

**Rủi ro:** thay content dump bằng click-through dump.  
**Biện pháp:** phase semantics cố định nhưng UI có thể gộp; mỗi action phải thay đổi learner evidence hoặc support, không tạo step chỉ để điều hướng.

### Critique 2 — Learner model dễ overfit từ dữ liệu quá ít

**Rủi ro:** sau một câu sai, hệ thống gắn nhãn “yếu”.  
**Biện pháp:** lưu event/counter, không suy diễn trait; adaptation ban đầu chỉ dùng known/weak explicit signals và recent retrieval outcomes.

### Critique 3 — Content-selection score có vẻ khoa học hơn thực tế

**Rủi ro:** weights tùy ý được hiểu là validated algorithm.  
**Biện pháp:** version weights, log rationale, benchmark với golden set, cho reviewer override; gọi đây là heuristic.

### Critique 4 — First-viewing no captions có thể làm beginner thất bại

**Rủi ro:** desirable difficulty thành frustration.  
**Biện pháp:** policy theo support preference/video challenge; A1/A2 hoặc high challenge có thể dùng keyword scaffold/captions; không đặt “no captions” thành đạo lý.

### Critique 5 — Transfer self-check có thể quá yếu

**Rủi ro:** learner tự đánh giá không chính xác.  
**Biện pháp:** criteria cụ thể + exemplar sau attempt; future calibrated feedback được benchmark riêng, không fake score hiện tại.

### Critique 6 — Persistence làm vertical slice lớn

**Rủi ro:** trì hoãn học model vì database work.  
**Biện pháp:** chỉ session + attempt + minimal item state; không build full review dashboard.

### Critique 7 — Entertainment video có thể không đủ teachable value

**Rủi ro:** product luôn cố tạo lesson vì đã tiêu transcript cost.  
**Biện pháp:** authoring có `abstain/limited lesson` outcome; UX nói thật và đề xuất exposure-only hoặc video khác.

### Critique 8 — V2 có thể phá grounding đã hoạt động

**Rủi ro:** thêm nhiều content origin làm quote leak/bịa.  
**Biện pháp:** source text không nằm trong model schema; evidence hydrated server-side; origin union strict; property tests kiểm mọi source ref thuộc permitted set.

---

## 14. Design gate

Thiết kế được phép chuyển sang vertical slice vì:

- giải quyết nguyên nhân gốc quota/schema thay vì trang trí viewer;
- giữ grounding invariant đã chứng minh production;
- tách immutable blueprint khỏi mutable learning state;
- đưa retrieval/transfer/feedback vào runtime semantics;
- không trao quyền grading open response cho LLM;
- có migration path không phá v1;
- có evaluation plan đo delayed recall/transfer;
- scope đầu đủ nhỏ để kiểm chứng nhưng đủ khác v1.

### Điều kiện còn treo trước merge production

1. Provider v2 phải chạy thật khi có explicit quota permission.
2. Ít nhất một entertainment video production-like output phải qua rubric review.
3. Full CI và Vercel preview phải xanh.
4. Migration/RLS phải qua pgTAP.
5. Không tự merge runtime branch vào `main` chỉ vì fixture pass.
