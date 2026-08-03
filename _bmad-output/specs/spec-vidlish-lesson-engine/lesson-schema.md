# Lesson Content Model and JSON Contract

## 1. Design principles

- Schema mô tả **nội dung học**, không mô tả component UI.
- Mọi nội dung gắn với video dùng `segment_ids`; không nhận timestamp do model tự bịa.
- `source_quote` được server hydrate từ transcript bằng segment ID; model không phải nguồn sự thật cho quote.
- `generated_example` luôn được đánh dấu là nội dung mới.
- Mỗi activity phải khai báo learning outcome, activity family, expected time và validation metadata.
- Schema được version hóa; breaking change tăng major version.

## 2. Top-level lesson

```ts
type Lesson = {
  schema_version: "1.0";
  lesson_id: string;
  source: SourceRef;
  learner: LearnerProfile;
  design: LessonDesign;
  objectives: LearningObjective[];
  video_map: VideoSection[];
  overview: LessonOverview;
  language_items: LanguageItem[];
  insights: LanguageInsight[];
  activities: Activity[];
  wrap_up: LessonWrapUp;
  quality: LessonQualityReport;
  provenance: GenerationProvenance;
};
```

## 3. Source and learner

```ts
type SourceRef = {
  video_id: string;
  transcript_id: string;
  transcript_hash: string;
  transcript_source: "manual-caption" | "auto-caption" | "stt" | "uploaded" | "pasted";
  transcript_confidence?: number;
  source_language: "en";
};

type LearnerProfile = {
  product_level: "Beginner" | "Elementary" | "Intermediate" | "Upper Intermediate" | "Advanced";
  cefr_level: "A1" | "A2" | "B1" | "B2" | "C1";
  explanation_language: "vi";
  lesson_mode: "core";
  target_duration_minutes: { min: 10; max: 20 };
};
```

## 4. Lesson design

```ts
type LessonDesign = {
  video_genre:
    | "conversation"
    | "vlog"
    | "interview"
    | "podcast"
    | "tutorial"
    | "educational"
    | "news"
    | "review"
    | "comedy-slang"
    | "other";
  primary_family:
    | "content-comprehension"
    | "listening-decoding"
    | "contextual-language"
    | "task-based";
  secondary_families: string[];
  progression: [
    "activation",
    "gist",
    "noticing",
    "guided-practice",
    "retrieval",
    "transfer",
    "reflection"
  ];
  support_mode: "full-caption" | "english-caption" | "caption-fading" | "transcript-on-demand";
  estimated_duration_minutes: number;
};
```

## 5. Learning objectives

```ts
type LearningObjective = {
  id: `OBJ-${number}`;
  category: "reception" | "production" | "interaction" | "mediation" | "language";
  statement_vi: string;
  success_criterion_vi: string;
  evidence_segment_ids: string[];
};
```

Rules:

- 1–3 objectives.
- Mỗi objective có criterion quan sát được.
- Objective không được chỉ là “học từ vựng”; phải nói người học làm được gì.

## 6. Video map

```ts
type VideoSection = {
  id: string;
  title_vi: string;
  summary_vi: string;
  start_segment_id: string;
  end_segment_id: string;
  start_ms: number;
  end_ms: number;
  importance: "core" | "supporting" | "optional";
};
```

## 7. Overview

```ts
type LessonOverview = {
  title_vi: string;
  topic_vi: string;
  summary_vi: string;
  summary_en: string;
  estimated_video_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  difficulty_reasons_vi: string[];
  prerequisite_knowledge_vi: string[];
};
```

## 8. Language items

```ts
type LanguageItem = {
  id: `LI-${number}`;
  kind: "word" | "collocation" | "chunk" | "phrasal-verb" | "idiom" | "slang" | "discourse-marker";
  form: string;
  lemma?: string;
  part_of_speech?: string;
  ipa?: string;
  meaning_vi: string;
  definition_en: string;
  register: "formal" | "neutral" | "informal" | "slang" | "technical";
  estimated_cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  source_segment_ids: string[];
  source_quote?: string;
  context_explanation_vi: string;
  generated_example: string;
  common_error_vi?: string;
  collocations?: string[];
  teaching_value: {
    total: number;
    usefulness: number;
    level_fit: number;
    contextual_clarity: number;
    transferability: number;
    video_relevance: number;
    penalties: string[];
  };
};
```

Rules:

- `source_quote` do server hydrate, không tin trực tiếp model.
- `generated_example` không được sao chép source quote.
- Không lặp `lemma + sense`.
- Không bắt buộc IPA cho proper noun hoặc item không phù hợp.

## 9. Language insights

```ts
type LanguageInsight = {
  id: `INS-${number}`;
  kind: "grammar" | "pragmatics" | "pronunciation-noticing" | "discourse";
  title_vi: string;
  explanation_vi: string;
  pattern?: string;
  communicative_function_vi: string;
  source_segment_ids: string[];
  examples_generated: string[];
  micro_check?: ActivityRef;
};
```

MVP có tối đa hai insight. Không tạo insight khi không có evidence hoặc không giúp hiểu/sử dụng ngôn ngữ.

## 10. Activity union

```ts
type Activity =
  | PredictionActivity
  | GistQuestionActivity
  | DetailQuestionActivity
  | InferenceQuestionActivity
  | ClozeListeningActivity
  | ContextMeaningActivity
  | CollocationActivity
  | GrammarNoticingActivity
  | RetrievalActivity
  | TransferActivity
  | ExitTicketActivity;

type ActivityBase = {
  id: `ACT-${number}`;
  phase: "activation" | "gist" | "noticing" | "guided-practice" | "retrieval" | "transfer" | "reflection";
  family: string;
  objective_ids: string[];
  instruction_vi: string;
  estimated_seconds: number;
  source_segment_ids: string[];
  scored: boolean;
  difficulty: "easy" | "target" | "stretch";
};
```

Mỗi subtype khai báo payload và answer contract theo `activity-catalog.md`.

## 11. Wrap-up

```ts
type LessonWrapUp = {
  key_takeaways_vi: string[];
  can_do_checklist_vi: string[];
  exit_ticket_activity_id: string;
  suggested_rewatch_segment_ids: string[];
};
```

## 12. Quality and provenance

```ts
type LessonQualityReport = {
  status: "passed" | "failed";
  hard_gates: {
    schema_valid: boolean;
    grounding_valid: boolean;
    answers_valid: boolean;
    objectives_aligned: boolean;
  };
  scores: {
    grounding: number;
    level_fit: number;
    teaching_value: number;
    coherence: number;
    exercise_validity: number;
    naturalness: number;
    cognitive_load: number;
    non_redundancy: number;
  };
  total_score: number;
  repairs_applied: string[];
  warnings: string[];
};

type GenerationProvenance = {
  pipeline_version: string;
  prompt_version: string;
  rubric_version: string;
  model_id: string;
  generated_at: string;
  generation_attempts: number;
  repair_attempts: number;
};
```

## 13. Publish invariants

Một lesson chỉ được publish khi:

- `status = passed`.
- Tất cả hard gates là `true`.
- Mọi `segment_id` tồn tại trong transcript tương ứng.
- Có 1–3 objectives.
- Có đủ bảy progression phases, nhưng phase có thể chứa activity rất ngắn.
- Có ít nhất một retrieval activity và một transfer activity.
- Estimated duration 10–20 phút.
- Không có duplicate language item hoặc duplicate question intent.
