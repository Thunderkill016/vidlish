# MVP Activity Catalog

## 1. Contract chung

Mỗi activity phải có:

- `id` duy nhất;
- `phase` trong progression;
- `objective_ids`;
- `source_segment_ids` khi activity dựa trên video;
- `instruction_vi`;
- `estimated_seconds`;
- `difficulty`;
- answer contract hoặc acceptance criteria;
- validation rules.

Không activity nào tồn tại chỉ để “cho đa dạng”. Mỗi activity phải phục vụ objective và phù hợp CEFR.

## 2. ACT-PREDICT — Prediction/Activation

**Phase:** activation  
**Purpose:** kích hoạt kiến thức nền và tạo listening purpose.

```ts
type PredictionActivity = ActivityBase & {
  family: "prediction";
  prompt_vi: string;
  stimulus: {
    title?: string;
    thumbnail_description?: string;
    keywords?: string[];
  };
  response_mode: "choose" | "short-text" | "think-only";
  options?: string[];
};
```

Rules:

- Không reveal summary trước activity.
- Không scored bắt buộc.
- A1–A2 ưu tiên choose/think-only; B1+ có thể short-text.
- Estimated time 20–60 giây.

## 3. ACT-GIST — Gist Question

**Phase:** gist  
**Purpose:** kiểm tra ý chính trước khi learner phụ thuộc transcript.

```ts
type GistQuestionActivity = ActivityBase & {
  family: "gist-question";
  question_vi: string;
  options: string[];
  correct_option_index: number;
  rationale_vi: string;
  evidence_segment_ids: string[];
};
```

Validation:

- 3–4 options.
- Chỉ một đáp án đúng.
- Không dựa vào chi tiết vụn.
- Evidence phải phủ phần cốt lõi của video/section.
- Không dùng distractor vô lý chỉ để đủ số.

## 4. ACT-DETAIL — Detail Question

**Phase:** guided-practice  
**Purpose:** nghe/lọc thông tin cụ thể.

```ts
type DetailQuestionActivity = ActivityBase & {
  family: "detail-question";
  question_vi: string;
  response_mode: "multiple-choice" | "true-false" | "short-answer";
  options?: string[];
  correct_answer: string;
  accepted_answers?: string[];
  rationale_vi: string;
  evidence_segment_ids: string[];
};
```

Validation:

- Answer xuất hiện trực tiếp hoặc được paraphrase rõ từ evidence.
- Short answer có normalized accepted answers.
- Không hỏi trivia không phục vụ objective.

## 5. ACT-INFER — Inference/Attitude Question

**Phase:** guided-practice  
**Purpose:** suy ra thái độ, hàm ý, mục đích hoặc quan hệ logic.

```ts
type InferenceQuestionActivity = ActivityBase & {
  family: "inference-question";
  question_vi: string;
  options: string[];
  correct_option_index: number;
  rationale_vi: string;
  evidence_segment_ids: string[];
  inference_type: "attitude" | "purpose" | "implication" | "cause" | "stance";
};
```

Validation:

- A1: không dùng mặc định.
- A2: chỉ inference cực rõ.
- B1+: evidence phải đủ để loại distractors.
- Rationale phải giải thích bước suy luận, không chỉ nhắc lại đáp án.

## 6. ACT-CLOZE — Listening Cloze

**Phase:** noticing hoặc guided-practice  
**Purpose:** giải mã speech và củng cố target form.

```ts
type ClozeListeningActivity = ActivityBase & {
  family: "listening-cloze";
  segment_id: string;
  displayed_text: string;
  blanks: Array<{
    id: string;
    answer: string;
    accepted_variants?: string[];
    target_language_item_id?: string;
  }>;
  word_bank?: string[];
  replay_limit?: number;
};
```

Validation:

- Chỉ dùng segment confidence cao.
- Blank không được làm câu có nhiều đáp án hợp lý.
- Không xóa proper noun/số vô nghĩa cho learning objective.
- A1–A2 có word bank; B1+ có thể không.
- Tối đa 3 blanks trong một segment ngắn.

## 7. ACT-CONTEXT — Meaning from Context

**Phase:** noticing  
**Purpose:** đoán và xác nhận nghĩa/usage của language item.

```ts
type ContextMeaningActivity = ActivityBase & {
  family: "context-meaning";
  language_item_id: string;
  source_segment_ids: string[];
  question_vi: string;
  options: string[];
  correct_option_index: number;
  explanation_vi: string;
};
```

Validation:

- Context phải đủ để suy ra.
- Distractors là senses/uses hợp lý nhưng sai trong context.
- Không hỏi nghĩa dictionary tách khỏi video.

## 8. ACT-COLLOCATION — Collocation/Chunk Assembly

**Phase:** guided-practice  
**Purpose:** học multiword units và naturalness.

```ts
type CollocationActivity = ActivityBase & {
  family: "collocation";
  mode: "match-halves" | "choose-natural" | "repair-unnatural";
  items: Array<{
    prompt: string;
    options: string[];
    correct_option_index: number;
    rationale_vi: string;
    language_item_ids: string[];
  }>;
};
```

Validation:

- Correct answer phải là collocation/chunk được evidence hoặc corpus-backed rule hỗ trợ.
- Không đánh dấu một alternative tự nhiên khác là sai nếu không có constraint rõ.

## 9. ACT-GRAMMAR-NOTICE — Grammar/Pragmatics Noticing

**Phase:** noticing  
**Purpose:** nhận ra form và communicative function trong lời nói thật.

```ts
type GrammarNoticingActivity = ActivityBase & {
  family: "grammar-noticing";
  insight_id: string;
  source_segment_ids: string[];
  task_type: "highlight-pattern" | "choose-function" | "compare-examples" | "infer-rule";
  prompt_vi: string;
  options?: string[];
  correct_answer: string;
  rationale_vi: string;
};
```

Validation:

- Pattern thực sự xuất hiện.
- Explanation tập trung meaning/function, không biến thành bài giảng dài.
- Tối đa hai insight trong Core Lesson.

## 10. ACT-RECALL — Retrieval Activity

**Phase:** retrieval  
**Purpose:** buộc learner nhớ lại mà không nhìn đáp án.

```ts
type RetrievalActivity = ActivityBase & {
  family: "retrieval";
  mode: "vi-to-en" | "complete-new-context" | "keyword-retell" | "short-summary";
  prompts: Array<{
    prompt_vi: string;
    expected_elements: string[];
    accepted_answers?: string[];
    language_item_ids?: string[];
  }>;
  reveal_policy: "after-submit";
};
```

Validation:

- Đáp án/explanation không hiện trước submit.
- A1–A2 có hint/scaffold.
- B1+ ưu tiên recall và production thay vì recognition.
- Open response có expected elements, không chấm exact string duy nhất.

## 11. ACT-TRANSFER — Transfer Task

**Phase:** transfer  
**Purpose:** dùng language/content trong tình huống mới.

```ts
type TransferActivity = ActivityBase & {
  family: "transfer";
  mode: "personal-response" | "role-response" | "retell" | "mediation" | "decision-task" | "mini-writing";
  scenario_vi: string;
  required_language_item_ids: string[];
  success_criteria_vi: string[];
  scaffold?: {
    sentence_frames?: string[];
    keywords?: string[];
    outline?: string[];
  };
};
```

Validation:

- Scenario khác câu gốc nhưng liên quan objective.
- Không yêu cầu kiến thức ngoài video nếu không cung cấp đủ context.
- Success criteria phù hợp level.
- A1–A2 scaffold bắt buộc; C1 có audience/register constraint.

## 12. ACT-EXIT — Exit Ticket

**Phase:** reflection  
**Purpose:** đo mức đạt outcome và chỉ ra phần cần xem lại.

```ts
type ExitTicketActivity = ActivityBase & {
  family: "exit-ticket";
  prompts: Array<{
    type: "can-do" | "one-sentence-summary" | "target-language-use";
    prompt_vi: string;
    objective_id: string;
    success_criteria_vi: string[];
  }>;
  rewatch_segment_ids: string[];
};
```

Validation:

- Ít nhất một prompt gắn objective.
- Không chỉ hỏi mức hài lòng.
- Có rewatch suggestion khi objective phụ thuộc segment cụ thể.

## 13. Required MVP mix

Mỗi Core Lesson phải có tối thiểu:

- 1 `ACT-PREDICT` hoặc activation tương đương;
- 1 `ACT-GIST`;
- 1–3 activity từ `ACT-DETAIL`, `ACT-INFER`, `ACT-CLOZE`, `ACT-CONTEXT`, `ACT-COLLOCATION`, `ACT-GRAMMAR-NOTICE`;
- 1 `ACT-RECALL`;
- 1 `ACT-TRANSFER`;
- 1 `ACT-EXIT`.

Không bắt buộc dùng mọi loại. Engine chọn mix theo genre, level và objective.

## 14. Future activity families — không thuộc MVP

- pronunciation recording/scoring;
- full shadowing workflow;
- spaced repetition review;
- adaptive branch after every answer;
- debate with AI;
- project-based multi-session work;
- exam simulation;
- peer interaction;
- teacher-assigned activities.
