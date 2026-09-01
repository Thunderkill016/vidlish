# Sự cố production: job đứng ở “Phân tích video” — 2026-08-06

## Trạng thái

**Đã sửa và đã kiểm chứng bằng production acceptance thật ngày 2026-08-06.**

Job `c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f` được chạy lại đúng một lần sau PR #39 và PR #41. Kết quả:

- 339 segment được phép được đọc đúng;
- Gemini Standard được gọi bằng `gemini-3.5-flash-lite`;
- structured log ghi `started` rồi `succeeded / published`;
- thời gian lesson step: 15.578 ms;
- thời gian endpoint acceptance: 17.638 ms;
- job chuyển sang `completed`;
- chỉ có một lesson được tạo;
- 16/16 citation thuộc canonical transcript và allowlist;
- 16/16 citation khớp tuyệt đối `text`, `startMs` và `endMs` với `transcript_segments`;
- endpoint acceptance một lần đã được xóa; production trả 404;
- deployment cleanup `a50cbeda4421bab6c383fb32aad196fa1e7c6a64` READY và trang chính trả HTTP 200.

## Triệu chứng ban đầu

Job đã lấy và lưu transcript, vượt cổng tiếng Anh, nhưng giữ trạng thái `analyzing_video` từ 22:05:31 UTC đến 22:21:00 UTC ngày 2026-08-05. Giao diện tiếp tục polling thành công với HTTP 200 nhưng không có bài học và không có lỗi terminal.

Dữ liệu production xác nhận:

- `dispatch_status = sent`;
- transcript canonical tồn tại;
- báo cáo ngôn ngữ là `eligible`;
- có 339 segment được phép và 1.630 từ tiếng Anh đáng tin cậy;
- không có `lesson_id`;
- pg_cron cuối cùng chuyển job sang `failed / LESSON_GENERATION_FAILED`.

## Nguyên nhân gốc đã tái hiện

`SupabaseLessonRepository.listPermittedSegments()` từng đọc toàn bộ `language_eligible_segments` của người học chỉ với `owner_user_id`, rồi mới lọc `transcript_id` trong Node.js.

Supabase Data API mặc định chỉ trả tối đa 1.000 dòng cho một `select()`. Tài khoản production đã có hơn 1.000 allowlist rows từ các lần thử trước. Route chẩn đoán an toàn đo được:

```json
{
  "keyKind": "secret",
  "job": { "visible": true, "hasTranscriptId": true },
  "allowed": { "visibleRows": 1000, "matchingRows": 0 },
  "segments": { "visibleRows": 364, "count": 364 }
}
```

SQL trực tiếp trên cùng job xác nhận 339 allowlist rows tồn tại và đều khớp cả `owner_user_id` lẫn `transcript_id`. Vì các dòng đó nằm ngoài 1.000 dòng đầu của truy vấn owner-wide, ứng dụng trả `no_permitted_segments`, không gọi Gemini và để job ở `analyzing_video`.

Cách sửa đúng không phải tăng giới hạn Data API hay tải nhiều trang hơn. Repository giờ lấy `canonical_transcript_id` trước rồi lọc allowlist ngay trong Postgres bằng cả:

```text
owner_user_id = <owner>
transcript_id = <current transcript>
```

Điều này sửa tính đúng đắn, giảm payload và giữ phạm vi dữ liệu tối thiểu.

## Các lớp bảo vệ bổ sung

### Workflow phải kết thúc terminal

`generateLessonWorkflow` trước đây chỉ gọi `resolveLessonFailureStep` khi `generateLessonStep` ném lỗi. Một kết quả không ném lỗi như `skipped` có thể làm workflow kết thúc trong khi database vẫn còn `analyzing_video`.

Workflow giờ đọc lại trạng thái cuối; nếu vẫn là `analyzing_video`, nó đánh dấu `LESSON_GENERATION_FAILED` và đọc lại lần nữa. Đây là lưới an toàn, không thay thế việc sửa query gốc.

### Structured observability

PR #41 thêm event JSON `vidlish_generation` có schema strict. Production acceptance đã quan sát được:

```json
{"event":"vidlish_generation","level":"info","jobId":"c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f","stage":"lesson_generation","action":"started","provider":"gemini","modelId":"gemini-3.5-flash-lite"}
{"event":"vidlish_generation","level":"info","jobId":"c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f","stage":"lesson_generation","action":"succeeded","provider":"gemini","modelId":"gemini-3.5-flash-lite","outcome":"published","elapsedMs":15578}
```

Event không chứa API key, OTP, email, transcript text, lesson draft hoặc provider response body.

### Migration production từng lệch khỏi repo

Migration `20260806060000_tighten_stalled_job_threshold.sql` đã merge nhưng chưa được áp lên Supabase production. Cron thật vẫn chạy mỗi 7 phút với ngưỡng 15 phút.

Migration đã được áp và xác minh:

```text
schedule: */2 * * * *
command: select public.expire_stalled_lesson_jobs(interval '5 minutes')
active: true
```

Vercel deploy không tự áp Supabase migration. Mỗi migration phải có bước deploy database riêng và truy vấn xác minh migration history cùng trạng thái runtime.

### Flex inference là trade-off UX sai, không phải nguyên nhân của job này

Job bị kẹt bắt đầu trước khi deployment dùng Gemini Flex lên production, nên Flex không gây ra sự cố cụ thể này. Lỗi provider chính xác của lần chạy cũ cũng không được log đủ để khôi phục.

Dù vậy, Flex là best-effort với độ trễ mục tiêu theo phút, trong khi Vidlish hiển thị màn hình người học chờ bài. Đường tạo bài học đã trở lại Standard; Flex chỉ phù hợp với tác vụ không tương tác có timeout, fallback và UX nói đúng thời gian chờ.

## Thay đổi

1. Lọc allowlist theo transcript tại database và thêm test mô phỏng ngưỡng 1.000 dòng.
2. Thêm fail-closed invariant ở cuối workflow.
3. Đưa lesson generation trở lại Standard tier.
4. Áp migration cron còn thiếu lên Supabase production.
5. Thêm structured observability và runbook production.
6. Chạy một production acceptance thật, xác minh grounding và xóa endpoint tạm.

## Cách xác minh

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- toàn bộ pgTAP và Playwright trong GitHub Actions
- deployment production đúng commit phải READY
- structured log phải có `started` và outcome terminal
- database phải có đúng một lesson cho job
- mọi citation phải thuộc canonical transcript + allowlist và khớp text/timestamp
- endpoint chẩn đoán/acceptance phải trả 404 sau cleanup

## Bài học giữ lại

- Không lọc client-side sau một query có giới hạn ngầm; đẩy khóa nghiệp vụ xuống database.
- Không coi HTTP 200 của polling là bằng chứng workflow đang tiến triển.
- Mọi background workflow phải có invariant terminal ở ranh giới cuối.
- Không merge migration mà không áp và kiểm tra production.
- Structured log phải được thiết kế bằng whitelist field, không log message thô.
- Không dùng tier có độ trễ theo phút cho UX đang hứa phản hồi theo giây chỉ vì rẻ hơn.
- Khi provider error không được lưu, phải nói rõ là chưa biết; không thay bằng một nguyên nhân nghe hợp lý nhưng không có bằng chứng.
