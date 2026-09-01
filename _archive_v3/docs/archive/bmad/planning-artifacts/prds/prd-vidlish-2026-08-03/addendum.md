# Vidlish MVP — PRD Addendum

Tài liệu này giữ các chi tiết có giá trị cho UX và Architecture nhưng không thuộc yêu cầu sản phẩm cốt lõi. PRD đã `final`; các lựa chọn provider/framework ở đây vẫn phải được Architecture xác nhận.

## A. Artifact bắt buộc downstream phải đọc

- `prd.md`
- `_bmad-output/specs/spec-vidlish-lesson-engine/SPEC.md`
- Toàn bộ companion trong folder Lesson Engine Spec:
  - `lesson-schema.md`
  - `selection-algorithm.md`
  - `cefr-rubrics.md`
  - `activity-catalog.md`
  - `generation-quality-pipeline.md`
- Research transcript acquisition và lesson content design trong `_bmad-output/planning-artifacts/research/`.

## B. Định hướng stack cần Architecture đánh giá

- Next.js + TypeScript cho web application.
- Tailwind CSS + shadcn/ui cho UI.
- Supabase Auth + Postgres + RLS cho identity và ownership.
- YouTube metadata/player qua API hoặc embed chính thức khi phù hợp.
- Transcript acquisition qua adapter chain, không khóa business logic vào một provider.
- Gemini qua `LessonGenerationProvider`; structured output, schema/versioning và token telemetry.
- Background job/state persistence để hỗ trợ generation dài, retry và reload.

Architecture phải chốt dựa trên độ ổn định, chi phí, runtime limits, privacy, retention, provider terms và khả năng thay vendor.

## C. Thành phần khái niệm

```text
Vidlish Web
├── Authentication
├── Create Lesson
├── Transcript Fallback UX
├── Lesson Viewer
└── Lesson Library

Application Services
├── VideoMetadataService
├── TranscriptAcquisitionOrchestrator
│   ├── CaptionProvider
│   ├── HostedTranscriptProvider
│   ├── UnofficialExtractorProvider
│   ├── TabAudioCaptureProvider
│   ├── SpeechToTextProvider
│   └── UserProvidedTranscriptProvider
├── TranscriptNormalizer
├── LessonGenerationOrchestrator
├── DeterministicValidators
├── LessonRepository
└── JobRepository
```

## D. Mô hình dữ liệu khái niệm

### User

- `id`
- `email`
- `created_at`

### Video

- `id`
- `youtube_video_id`
- `canonical_url`
- `title`
- `channel_name`
- `thumbnail_url`
- `duration_seconds`
- `availability_status`
- timestamps

### Transcript

- `id`
- `video_id`
- `owner_id` hoặc ownership scope phù hợp
- `source_type`: manual-caption | auto-caption | hosted-provider | extracted-caption | tab-audio-stt | uploaded-subtitle | pasted-text | uploaded-media-stt
- `source_provider`
- `language`
- `confidence`
- `transcript_hash`
- `retention_status`
- timestamps

### TranscriptSegment

- `id` hoặc stable segment ID
- `transcript_id`
- `position`
- `start_ms`
- `end_ms`
- `text`
- `confidence`

### LessonJob

- `id`
- `owner_id`
- `video_id`
- `transcript_id`
- `level`
- `status`
- `current_stage`
- `acquisition_strategy`
- `error_code`
- `attempt_count`
- `idempotency_key`
- provider/model/request metadata
- token/cost metadata
- timestamps

### Lesson

- `id`
- `owner_id`
- `video_id`
- `transcript_id`
- `job_id`
- `level`
- `schema_version`
- `pipeline_version`
- `prompt_version`
- `model_id`
- `transcript_hash`
- `lesson_payload` hoặc normalized lesson tables
- `quality_report`
- `is_completed`
- timestamps

Architecture được quyền chọn JSONB hoặc normalized tables, nhưng phải giữ versioning, evidence links và khả năng mở lại không gọi provider.

## E. Transcript acquisition policy

Waterfall đề xuất:

```text
manual/auto caption
→ hosted transcript provider
→ unofficial extractor
→ user-approved tab audio capture + STT
→ paste/upload subtitle
→ uploaded media owned by user + STT
```

Quy tắc:

- `NO_CAPTIONS` không kết thúc job.
- Mỗi provider có timeout/retry có giới hạn.
- Orchestrator ghi strategy đã thử và lý do chuyển bước.
- Không tải hoặc lưu video production mặc định.
- Audio tạm bị xóa sau transcription hoặc job failure.
- Video dài được chunk theo token/cost/semantic boundaries; không silently truncate.

## F. Lesson generation contract

Gemini không được tạo và publish lesson trong một call. Pipeline bắt buộc:

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
```

Provider interface phải độc lập với Gemini. Deterministic validators quyết định hard gates.

## G. Mã lỗi sản phẩm

### Video

- `INVALID_URL`
- `VIDEO_NOT_FOUND`
- `VIDEO_PRIVATE`
- `VIDEO_RESTRICTED`
- `VIDEO_NOT_PLAYABLE`

### Transcript acquisition

- `CAPTION_NOT_FOUND`
- `CAPTION_PROVIDER_ERROR`
- `TRANSCRIPT_PROVIDER_ERROR`
- `EXTRACTOR_BLOCKED`
- `TAB_CAPTURE_PERMISSION_DENIED`
- `TAB_AUDIO_NOT_AVAILABLE`
- `STT_PROVIDER_ERROR`
- `TRANSCRIPT_UPLOAD_INVALID`
- `TRANSCRIPT_LOW_CONFIDENCE`
- `TRANSCRIPT_BUDGET_EXCEEDED`

`CAPTION_NOT_FOUND` là transition signal, không phải lỗi cuối nếu còn fallback.

### Lesson generation

- `AI_PROVIDER_ERROR`
- `AI_SCHEMA_INVALID`
- `GROUNDING_FAILED`
- `EXERCISE_INVALID`
- `QUALITY_GATE_FAILED`
- `GENERATION_TIMEOUT`
- `REPAIR_LIMIT_REACHED`

### Platform

- `RATE_LIMITED`
- `QUOTA_EXCEEDED`
- `UNAUTHORIZED`
- `LESSON_NOT_FOUND`
- `NETWORK_ERROR`

UI phải map mã lỗi thành thông báo tiếng Việt và next action; không hiển thị raw provider errors.

## H. Rủi ro Architecture phải xử lý

1. YouTube/unofficial endpoints thay đổi hoặc cloud IP bị chặn.
2. Provider cost/latency tăng khi video dài hoặc phải STT.
3. Browser tab-audio capture khác nhau theo browser/OS và cần user permission.
4. Transcript/STT confidence thấp làm hỏng exercise.
5. Gemini trả output hợp schema nhưng sai pedagogy hoặc evidence.
6. Serverless timeout và duplicate job khi reload/retry.
7. Transcript/audio retention và quyền sử dụng trước public launch.
8. Vendor lock-in ở transcript, STT hoặc lesson generation.

## I. Thứ tự triển khai sau readiness

1. Foundation, auth, ownership và job persistence.
2. URL/metadata/player.
3. Transcript adapter contract + fixture provider.
4. Caption/provider fast paths.
5. Transcript normalization, source/confidence và storage.
6. Lesson Engine domain schema + deterministic validators.
7. Gemini adapter và multi-stage generation.
8. Lesson Viewer và Library.
9. Tab-audio/STT fallback.
10. Upload/paste fallback.
11. Observability, quotas, deletion, regression benchmark và E2E hardening.

Đây là input cho Architecture/Epics, chưa phải code plan cuối cùng.
