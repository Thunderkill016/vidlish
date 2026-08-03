# Vidlish MVP — PRD Addendum

Tài liệu này giữ các chi tiết có giá trị cho UX và Architecture nhưng không thuộc phần yêu cầu sản phẩm cốt lõi. Các lựa chọn công nghệ dưới đây là định hướng từ `IDEA.md`, chưa phải quyết định kiến trúc cuối cùng.

## A. Định hướng kỹ thuật từ IDEA.md

- Web framework được đề xuất: Next.js + TypeScript.
- UI được đề xuất: Tailwind CSS + shadcn/ui.
- Backend có thể dùng Next.js Route Handlers hoặc Server Actions.
- Database và authentication được đề xuất: Supabase.
- Cần một AI API cho structured lesson generation.
- Có thể cần YouTube Data API cho metadata và transcript library/provider cho phụ đề.

Architecture phải đánh giá lại từng lựa chọn dựa trên:
- độ ổn định của transcript retrieval;
- chi phí AI;
- hỗ trợ background/long-running processing;
- giới hạn runtime của nền tảng deploy;
- data ownership và row-level security;
- khả năng retry/idempotency;
- điều khoản sử dụng của YouTube và provider.

## B. Mô hình dữ liệu khái niệm

### User

- `id`
- `email`
- `name` (optional)
- `created_at`

Không lưu `english_level` hoặc `learning_goal` ở profile trong MVP nếu mỗi Bài học đã lưu Trình độ riêng.

### Video

- `id`
- `youtube_video_id` (unique)
- `url`
- `title`
- `channel_name`
- `thumbnail_url`
- `duration_seconds`
- `source_language`
- `created_at`

Quyết định lưu Transcript nằm ở OQ-4 của PRD.

### LessonGeneration

Bản ghi trạng thái giúp phục hồi khi tải lại và hỗ trợ retry:

- `id`
- `user_id`
- `video_id` hoặc URL tạm thời
- `level`
- `status`
- `current_stage`
- `error_code`
- `error_detail_safe`
- `provider_request_id`
- `attempt_count`
- `created_at`
- `updated_at`

### Lesson

- `id`
- `user_id`
- `video_id`
- `generation_id`
- `level`
- `schema_version`
- `summary_vi`
- `summary_en`
- `difficulty`
- `vocabulary` (structured JSON)
- `phrases` (structured JSON)
- `grammar_points` (structured JSON)
- `comprehension_questions` (structured JSON)
- `fill_in_the_blank` (structured JSON)
- `is_completed`
- `created_at`
- `updated_at`

### TranscriptSegment

Chỉ áp dụng nếu quyết định lưu Transcript:

- `id`
- `video_id` hoặc `lesson_id`
- `start_seconds`
- `duration_seconds` (optional)
- `text`
- `position`

## C. Schema đầu ra AI tối thiểu

```json
{
  "schema_version": "1.0",
  "difficulty": "Intermediate",
  "video_summary": {
    "vi": "",
    "en": ""
  },
  "vocabulary": [
    {
      "term": "",
      "part_of_speech": "",
      "meaning_vi": "",
      "definition_en": "",
      "source_quote": "",
      "source_segment_index": 0,
      "example": ""
    }
  ],
  "phrases": [],
  "grammar_points": [],
  "comprehension_questions": [],
  "fill_in_the_blank": {
    "items": [],
    "answers": []
  }
}
```

Architecture phải dùng schema validation ở server và lưu `schema_version` cùng Bài học.

## D. Mã lỗi sản phẩm đề xuất

- `INVALID_URL`
- `VIDEO_NOT_FOUND`
- `VIDEO_PRIVATE`
- `VIDEO_RESTRICTED`
- `TRANSCRIPT_UNAVAILABLE`
- `TRANSCRIPT_LANGUAGE_UNSUPPORTED`
- `VIDEO_TOO_LONG`
- `TRANSCRIPT_TOO_LONG`
- `TRANSCRIPT_PROVIDER_ERROR`
- `AI_PROVIDER_ERROR`
- `AI_SCHEMA_INVALID`
- `GENERATION_TIMEOUT`
- `RATE_LIMITED`
- `QUOTA_EXCEEDED`
- `UNAUTHORIZED`
- `LESSON_NOT_FOUND`
- `NETWORK_ERROR`

UI phải chuyển mã lỗi thành thông báo tiếng Việt có hành động tiếp theo; không hiển thị raw provider error.

## E. Rủi ro cần Architecture xử lý

1. **Transcript retrieval không ổn định** — cần abstraction provider và test bằng tập video đại diện.
2. **Serverless timeout** — có thể cần job model thay vì một request đồng bộ dài.
3. **AI trả nội dung không đúng schema hoặc bịa trích dẫn** — schema validation, quote matching và retry có giới hạn.
4. **Chi phí không kiểm soát** — giới hạn video, quota, model selection và token telemetry.
5. **Tạo trùng khi reload/retry** — idempotency key và trạng thái generation có persistence.
6. **Lộ dữ liệu giữa người dùng** — server-side ownership check và database row-level security nếu dùng Supabase.
7. **Rủi ro điều khoản/pháp lý khi lưu Transcript** — cần quyết định OQ-4 và review trước public launch.

## F. Thứ tự xây dựng đề xuất sau readiness

1. Foundation + authentication + database ownership.
2. URL parsing + video eligibility + metadata.
3. Transcript retrieval + normalization + limits.
4. Generation state machine + AI schema.
5. Lesson viewer + timestamp interaction.
6. Exercises + completion state.
7. Library + delete.
8. Error hardening, observability and E2E tests.

Đây chưa phải epics/stories chính thức; `bmad-create-epics-and-stories` sẽ tạo chúng sau UX và Architecture.
