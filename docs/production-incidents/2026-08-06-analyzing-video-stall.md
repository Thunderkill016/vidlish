# Sự cố production: job đứng ở “Phân tích video” — 2026-08-06

## Triệu chứng

Job `c1f4ac68-ff00-4c92-a9c5-010c9e5c0b9f` đã lấy và lưu transcript, vượt cổng tiếng Anh, nhưng giữ trạng thái `analyzing_video` từ 22:05:31 UTC đến 22:21:00 UTC. Giao diện tiếp tục polling thành công với HTTP 200 nhưng không có bài học và không có lỗi terminal.

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
5. Route chẩn đoán production chỉ tồn tại trong một lượt kiểm tra và đã được xóa.

## Cách xác minh

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- toàn bộ pgTAP và Playwright trong GitHub Actions
- deployment production phải READY
- route chẩn đoán phải trả 404
- lượt tạo bài thật phải lấy được permitted segments, gọi Gemini Standard và chuyển sang `completed`, hoặc thành `failed` trong thời gian hữu hạn

## Bài học giữ lại

- Không lọc client-side sau một query có giới hạn ngầm; đẩy khóa nghiệp vụ xuống database.
- Không coi HTTP 200 của polling là bằng chứng workflow đang tiến triển.
- Mọi background workflow phải có invariant terminal ở ranh giới cuối.
- Không merge migration mà không áp và kiểm tra production.
- Không dùng tier có độ trễ theo phút cho UX đang hứa phản hồi theo giây chỉ vì rẻ hơn.
- Khi provider error không được lưu, phải nói rõ là chưa biết; không thay bằng một nguyên nhân nghe hợp lý nhưng không có bằng chứng.
