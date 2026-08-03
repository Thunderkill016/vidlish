# Selection and Assembly Algorithm

## 1. Inputs

```ts
type SelectionInput = {
  transcript_segments: TranscriptSegment[];
  video_metadata: VideoMetadata;
  learner_level: "A1" | "A2" | "B1" | "B2" | "C1";
  target_duration_minutes: 10 | 15 | 20;
  transcript_source: "manual-caption" | "auto-caption" | "stt" | "uploaded" | "pasted";
  transcript_confidence_by_segment?: Record<string, number>;
};
```

## 2. Stage A — Analyze the video

1. Detect language and reject non-English source unless a future multilingual mode explicitly allows it.
2. Classify genre.
3. Split transcript into semantic sections using topic shifts, speakers, pauses, chapters and discourse markers.
4. Estimate video-level CEFR and section-level difficulty.
5. Detect content structure: narrative, explanation, procedure, opinion, debate, review or conversation.
6. Mark low-confidence or corrupted transcript segments.
7. Produce a video map with core, supporting and optional sections.

## 3. Stage B — Generate candidates

Candidate classes:

- lexical: word, collocation, chunk, phrasal verb, idiom, slang, discourse marker;
- grammar/pragmatics;
- listening-decoding moments;
- comprehension facts and claims;
- transfer/task opportunities.

Mỗi candidate phải chứa:

```ts
type Candidate = {
  id: string;
  kind: string;
  canonical_form: string;
  source_segment_ids: string[];
  estimated_cefr: string;
  occurrence_count: number;
  video_importance: number;
  contextual_clarity: number;
  usefulness: number;
  transferability: number;
  level_fit: number;
  transcript_confidence: number;
  penalties: string[];
};
```

## 4. Stage C — Score candidates

Tất cả thành phần được chuẩn hóa 0–1.

```text
base_score =
  0.24 × usefulness
+ 0.20 × level_fit
+ 0.18 × contextual_clarity
+ 0.16 × transferability
+ 0.12 × video_importance
+ 0.06 × recurrence
+ 0.04 × transcript_confidence

final_score = base_score - penalty_total
```

Default penalties:

| Condition | Penalty |
|---|---:|
| Proper noun không cần cho comprehension | 0.40 |
| Thuật ngữ quá chuyên ngành so với mục tiêu | 0.25 |
| Item thấp hơn level ít nhất hai bậc và không có pragmatic value | 0.20 |
| Context mơ hồ hoặc transcript confidence thấp | 0.30 |
| Trùng lemma + sense với item đã chọn | 1.00 |
| Chỉ xuất hiện trong phần quảng cáo/tài trợ không liên quan | 0.35 |
| Không có khả năng dùng ngoài câu gốc | 0.20 |

Không publish candidate có `final_score < 0.55` trừ khi nó là prerequisite bắt buộc để hiểu video.

## 5. Stage D — Choose lesson objectives

Objective planner chọn 1–3 outcomes bằng các rule:

- Luôn có ít nhất một reception objective.
- Core Lesson luôn có ít nhất một language hoặc production/mediation objective.
- Chỉ chọn inference objective từ B1 trở lên và khi transcript có evidence đủ mạnh.
- Không chọn pronunciation-production objective trong MVP; chỉ cho phép pronunciation noticing.
- Objective phải phủ được bởi candidate có điểm đủ ngưỡng.

## 6. Stage E — Determine content budget

### Language item budget

| Level | Default range | Selection emphasis |
|---|---:|---|
| A1 | 5–8 | concrete high-frequency words/chunks |
| A2 | 6–10 | everyday vocabulary, routine chunks |
| B1 | 8–12 | useful chunks, collocations, phrasal verbs |
| B2 | 8–12 | nuance, register, discourse markers |
| C1 | 6–10 | fewer but deeper items: stance, rhetoric, pragmatics |

Rules:

- Range là ceiling/floor mục tiêu, không phải quota bắt buộc.
- Có thể thấp hơn floor nếu không đủ item `final_score ≥ 0.55`.
- Không vượt ceiling trong Core Lesson.
- Ít nhất 40% item từ B1 trở lên nên là multiword unit nếu video cho phép.

### Insight budget

- A1: 0–1 insight.
- A2: 0–1 insight.
- B1: 1–2 insights.
- B2/C1: 1–2 insights.
- Chỉ chọn khi evidence rõ và communicative value cao.

### Activity budget

- 1 activation.
- 1 gist.
- 2–4 noticing/guided-practice activities.
- 1 retrieval.
- 1 transfer.
- 1 reflection/exit ticket.

Estimated time tổng phải nằm trong 10–20 phút.

## 7. Stage F — Select teachable moments

Teachable moment selection:

1. Rank candidates theo `final_score`.
2. Enforce diversity: không chọn quá nhiều item cùng một loại hoặc cùng một segment.
3. Enforce lesson coherence: ưu tiên item phục vụ objectives và cùng chủ đề.
4. Enforce evidence spread: chọn từ nhiều section cốt lõi nhưng không dàn trải toàn video.
5. Enforce cognitive load theo CEFR.
6. Enforce transcript-confidence threshold:
   - manual caption: segment ≥ 0.70 nếu có confidence;
   - auto-caption/STT: segment ≥ 0.80 cho dictation/cloze;
   - segment thấp hơn có thể dùng cho gist nhưng không dùng cho exact-word exercise.

## 8. Stage G — Choose lesson family and activities

Default routing:

| Genre | Primary family | Preferred activities |
|---|---|---|
| conversation/vlog | contextual-language | chunks, pragmatics, gist, role response |
| interview/podcast | content-comprehension | note, detail, discourse markers, summary |
| tutorial | task-based | sequence, checklist, imperatives, transfer task |
| educational/documentary | content-comprehension | concept map, gist/detail, mediation |
| news | content-comprehension | fact/opinion, evidence, summary |
| review | task-based | comparison language, decision task |
| comedy/slang | contextual-language | tone, wordplay, register; avoid literal-only quiz |

MVP activity mix phải lấy từ `activity-catalog.md`.

## 9. Stage H — Assemble progression

```text
activation
→ gist
→ noticing
→ guided practice
→ retrieval
→ transfer
→ reflection
```

Assembly rules:

- Không reveal toàn bộ explanation trước gist task.
- Recognition phải xuất hiện trước free production ở A1–A2.
- Retrieval không hiển thị answer trong cùng viewport/state.
- Transfer dùng tình huống mới, không yêu cầu chép lại source sentence.
- Reflection đo can-do outcome, không chỉ hỏi “bạn thích bài không?”.

## 10. Long-video policy

Không dùng fixed duration rejection cho Lesson Engine. Thay vào đó:

1. Tạo overview map toàn video.
2. Chấm importance cho chapters/sections.
3. Chọn một Core Lesson từ các section cốt lõi trong budget.
4. Nếu phần quan trọng vượt budget, tạo `series_plan` gồm nhiều micro-lessons.
5. Mỗi micro-lesson có objectives và evidence riêng.
6. Không silently truncate theo token mà không phản ánh trong video map.

## 11. Deterministic rejection rules

Reject hoặc loại candidate/activity khi:

- segment ID không tồn tại;
- transcript confidence không đủ cho exact listening task;
- item là duplicate;
- question answer không có evidence;
- distractor có thể đúng tương đương đáp án;
- target form không xuất hiện trong source với activity tuyên bố là source-based;
- level vượt quá rubric và không có scaffold;
- activity không map objective;
- tổng thời gian vượt budget;
- content safety policy chặn nội dung.

## 12. Pseudocode

```ts
function designLesson(input: SelectionInput): LessonPlan {
  const analysis = analyzeVideo(input);
  const candidates = mineCandidates(analysis, input);
  const scored = candidates
    .map(scoreCandidate)
    .filter((c) => c.finalScore >= 0.55 || c.isComprehensionPrerequisite);

  const objectives = chooseObjectives(scored, analysis, input.learner_level);
  const budgets = resolveBudgets(input.learner_level, input.target_duration_minutes);
  const selected = selectDiverseItems(scored, objectives, budgets);
  const family = routeLessonFamily(analysis.genre, objectives);
  const activities = composeActivityPlan(family, selected, objectives, budgets);
  const plan = assembleProgression(analysis, selected, activities, objectives);

  assertPlanInvariants(plan);
  return plan;
}
```

## 13. Tunable parameters

Weights, thresholds và budgets là versioned configuration, không hardcode rải rác trong prompts. Mọi thay đổi phải:

1. tăng `rubric_version` hoặc `pipeline_version`;
2. chạy benchmark regression;
3. ghi so sánh grounding, pass rate, duration và human rating;
4. chỉ promote khi không làm giảm hard-gate performance.
