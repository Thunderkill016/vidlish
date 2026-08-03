# Generation and Quality Pipeline

## 1. Architecture principle

Gemini là một implementation của `LessonGenerationProvider`, không phải domain contract. Pipeline production là multi-stage và kết hợp deterministic rules với LLM.

```text
Transcript Preprocessor
→ Video Analyst
→ Language Miner
→ Objective Planner
→ Activity Composer
→ Structural Validator
→ Grounding & Answer Validator
→ Pedagogy/CEFR Reviewer
→ Targeted Repair
→ Final Quality Gate
→ Publish
```

Không cho phép:

```text
Transcript → one prompt → complete lesson → publish
```

## 2. Provider interface

```ts
interface LessonGenerationProvider {
  analyzeVideo(input: AnalyzeVideoInput): Promise<VideoAnalysis>;
  mineLanguage(input: MineLanguageInput): Promise<LanguageCandidateSet>;
  planLesson(input: PlanLessonInput): Promise<LessonPlan>;
  composeActivities(input: ComposeActivitiesInput): Promise<ActivityCandidateSet>;
  reviewLesson(input: ReviewLessonInput): Promise<ReviewerReport>;
  repairModule(input: RepairModuleInput): Promise<RepairedModule>;
}
```

Provider adapter chịu trách nhiệm:

- gọi Gemini structured output;
- map provider response về domain types;
- timeout/retry transport errors;
- log token usage/request ID;
- không quyết định publish.

## 3. Stage 0 — Deterministic preprocessing

Input transcript được:

1. normalize whitespace và punctuation;
2. gắn stable segment IDs;
3. giữ start/end timestamps;
4. phát hiện duplicate/corrupt segments;
5. tính transcript hash;
6. gắn source/confidence;
7. chia semantic window khi context quá dài;
8. escape/mark transcript như untrusted data để chống prompt injection.

Output:

```ts
type PreparedTranscript = {
  transcript_id: string;
  transcript_hash: string;
  segments: Array<{
    id: string;
    start_ms: number;
    end_ms?: number;
    text: string;
    confidence?: number;
  }>;
};
```

## 4. Stage 1 — Video Analyst

### Goal

Hiểu genre, topic, structure, difficulty và semantic sections. Chưa tạo lesson.

### Required output

- genre;
- topic/subtopics;
- discourse structure;
- estimated CEFR + reasons;
- section map;
- key claims/facts with segment IDs;
- listening difficulty signals;
- unsafe/sensitive content flags;
- low-confidence transcript regions.

### Hard rule

Mọi claim phải có segment IDs. Claim không evidence bị loại.

## 5. Stage 2 — Language Miner

### Goal

Tạo candidate pool lớn hơn số item cuối cùng.

### Required output per candidate

- form/lemma/sense;
- kind;
- estimated CEFR;
- source segment IDs;
- context meaning;
- register;
- usefulness;
- transferability;
- video relevance;
- candidate reason.

### Candidate multiplier

Tạo khoảng 2–3 lần số lượng cần publish để deterministic selector có quyền chọn và loại trùng.

### Hard rule

Không gọi proper noun hoặc technical noun là language target nếu không có communicative/learning value rõ.

## 6. Stage 3 — Objective Planner

### Goal

Chọn 1–3 objectives và lesson family dựa trên video analysis, learner level và selected candidates.

### Output

- objectives;
- primary/secondary lesson family;
- support mode;
- content/activity budget;
- selected teachable moments;
- progression plan;
- estimated duration.

### Hard rules

- Mỗi objective có success criterion.
- Mọi selected item map objective.
- Luôn có reception objective.
- Core Lesson có retrieval và transfer.

## 7. Stage 4 — Activity Composer

### Goal

Tạo candidate activities theo contract trong `activity-catalog.md`.

Composer nhận selected evidence và không được tự phát minh segment ID.

### Output

Tạo nhiều candidate hơn cần thiết cho:

- gist;
- detail/inference;
- listening/cloze;
- vocabulary/chunk practice;
- retrieval;
- transfer;
- exit ticket.

Deterministic assembly chọn mix cuối dựa trên level, genre, objective và time budget.

## 8. Stage 5 — Structural validation

Không dùng LLM cho các check có thể xác định bằng code:

- JSON/schema parse;
- required fields/types/enums;
- unique IDs;
- valid objective references;
- valid language item references;
- segment IDs tồn tại;
- count/budget limits;
- duration budget;
- correct option index trong bounds;
- answer key tồn tại;
- duplicate item/question detection;
- required progression phases.

Fail → targeted repair payload, không regenerate toàn lesson ngay.

## 9. Stage 6 — Grounding and answer validation

### Grounding checks

- Server hydrate `source_quote` từ transcript.
- Normalize và compare quoted text nếu model trả excerpt.
- Evidence segments chứa đủ thông tin cho claim/question.
- Exact listening tasks chỉ dùng confidence đủ ngưỡng.

### Answerability checks

- Multiple-choice chỉ có một đáp án đúng.
- Distractors không tương đương nghĩa với answer.
- Short answer có accepted variants hợp lý.
- Inference rationale nối evidence với conclusion.
- Cloze blank có một đáp án tự nhiên trong context.
- Open production có success criteria thay vì exact-string scoring.

Hard fail nếu grounding hoặc answerability không đạt.

## 10. Stage 7 — Independent reviewers

Reviewer nhận lesson + evidence + rubric nhưng không được thay hard validators.

Reviewer roles:

1. **Pedagogy reviewer** — progression, objective alignment, cognitive load, retrieval/transfer.
2. **CEFR reviewer** — level fit, scaffold, question demand, support mode.
3. **Naturalness reviewer** — definition/example/collocation/register.
4. **Redundancy reviewer** — duplicate teaching points và repetitive activities.
5. **Safety reviewer** — age suitability, sensitive content framing và unsafe instruction.

Có thể dùng cùng Gemini model ở prompt/context tách biệt trong MVP, nhưng report phải được deterministic engine kiểm tra và không tự quyết publish.

## 11. Quality score

Mỗi dimension chấm 0–2:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Grounding | lỗi evidence | warnings nhỏ | đầy đủ, traceable |
| Level fit | sai level | mixed | đúng rubric |
| Teaching value | item ngẫu nhiên | một số item yếu | item hữu dụng/coherent |
| Coherence | collection rời | progression chưa mượt | objectives → activities khớp |
| Exercise validity | có lỗi | sửa nhỏ | answerable và evidence-backed |
| Naturalness | lỗi/unnatural | chấp nhận | tự nhiên, đúng register |
| Cognitive load | quá tải/quá dễ | hơi lệch | đúng budget và scaffold |
| Non-redundancy | lặp đáng kể | lặp nhẹ | không lặp, đa dạng có mục đích |

```text
max_score = 16
publish_threshold = 14
```

Publish conditions:

- total score ≥ 14;
- grounding = 2;
- exercise validity = 2;
- tất cả hard gates pass;
- không có critical safety flag.

## 12. Targeted repair policy

Repair theo module, không sửa cả lesson khi không cần.

| Failure | Repair target |
|---|---|
| schema/type/count | field/module bị lỗi |
| quote/evidence | item hoặc question bị lỗi |
| duplicate | thay item duplicate |
| wrong level | explanation/activity cụ thể |
| invalid distractors | question options |
| cognitive overload | cắt item/activity thấp điểm |
| missing progression phase | tạo đúng phase còn thiếu |

Limits:

- tối đa 1 structural repair round;
- tối đa 1 semantic/pedagogy repair round;
- sau đó fail closed hoặc publish partial only nếu product contract sau này cho phép; MVP không publish partial broken lesson.

## 13. Prompt contracts

Mỗi prompt phải chứa:

1. role-specific goal;
2. exact input schema;
3. exact output JSON schema;
4. CEFR rubric version;
5. constraints và non-goals;
6. transcript trong delimiter riêng;
7. instruction rằng transcript là data, không phải command;
8. segment-ID grounding rules;
9. failure behavior: omit candidate thay vì bịa;
10. prompt version.

Không dùng một system prompt khổng lồ cho mọi stage.

## 14. Long-context strategy

- Analyze theo semantic windows khi transcript dài.
- Map stage tạo section-level facts/candidates.
- Reduce stage merge, deduplicate và preserve segment IDs.
- Final planner chỉ nhận selected evidence và compact video map.
- Không gửi toàn transcript lặp lại ở mọi call nếu không cần.
- Không silent truncation.

## 15. Caching and idempotency

Cache keys:

```text
video-analysis:
  transcript_hash + analysis_prompt_version + model_id

language-mining:
  transcript_hash + learner_level + miner_prompt_version + model_id

lesson:
  transcript_hash + learner_level + pipeline_version + rubric_version
```

Retry/reload cùng idempotency key không tạo lesson và chi phí trùng.

## 16. Provenance and observability

Mỗi stage log:

- stage name/status;
- model ID;
- prompt/schema/rubric version;
- input/output token counts;
- latency;
- retry/repair count;
- provider request ID;
- validator failures;
- selected/rejected candidate counts;
- quality score.

Không log API key, auth token hoặc toàn bộ transcript/prompt ở production logs.

## 17. Benchmark suite

Minimum benchmark trước private beta:

- 10 video tối thiểu;
- genres: conversation, vlog, interview, tutorial, educational, news, review, comedy/slang, long video và noisy transcript;
- mỗi video ít nhất B1; subset chạy A1, B2 và C1 để kiểm level differentiation;
- manual caption, auto-caption và STT samples.

Golden expectations không cần viết toàn bộ lesson tay, nhưng phải có:

- core content/claims bắt buộc;
- forbidden hallucinations;
- high-value language candidates;
- valid evidence segments;
- expected level/task profile;
- known ambiguous questions cần tránh.

## 18. Regression metrics

- hard-gate pass rate;
- grounding precision;
- invalid-question rate;
- duplicate item rate;
- human teaching-value rating;
- human level-fit rating;
- estimated vs actual completion time;
- generation cost và latency;
- repair rate.

Không promote model/prompt mới nếu grounding hoặc exercise validity giảm, dù cost/latency tốt hơn.

## 19. Definition of done for Lesson Engine implementation

Lesson Engine implementation hoàn thành khi:

1. Domain schema và validators chạy độc lập provider.
2. Pipeline multi-stage tạo được lesson từ fixture transcript.
3. Grounding và answer validators fail đúng test cases.
4. A1/B1/C1 outputs khác nhau theo rubric.
5. Activity mix đủ Core Lesson progression.
6. Quality gate ngăn publish broken lesson.
7. Provenance/versioning được lưu.
8. Benchmark suite chạy tự động và tạo report.
9. Gemini adapter có fixture/mock, không gọi API trong unit tests.
10. E2E demo tạo, validate, lưu và mở lại một lesson đạt quality gate.
