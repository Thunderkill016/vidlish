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

## Nguyên nhân

### 1. Workflow thiếu invariant terminal

`generateLessonWorkflow` chỉ gọi `resolveLessonFailureStep` khi `generateLessonStep` ném lỗi. Một kết quả không ném lỗi như `skipped`, hoặc một lần resume không hoàn chỉnh, có thể làm workflow kết thúc trong khi database vẫn còn `analyzing_video`.

Quy tắc đúng là: workflow đã kết thúc thì job phải terminal. Workflow giờ đọc lại trạng thái cuối; nếu vẫn là `analyzing_video`, nó đánh dấu `LESSON_GENERATION_FAILED` và đọc lại lần nữa trước khi trả kết quả.

### 2. Migration production bị lệch khỏi repo

Migration `20260806060000_tighten_stalled_job_threshold.sql` đã merge nhưng chưa được áp lên Supabase production. Cron thật vẫn chạy mỗi 7 phút với ngưỡng 15 phút, thay vì mỗi 2 phút với ngưỡng 5 phút.

Migration đã được áp và xác minh trên production:

```text
schedule: */2 * * * *
command: select public.expire_stalled_lesson_jobs(interval '5 minutes')
active: true
```

Vercel deploy không tự áp Supabase migration. Mỗi thay đổi migration phải có bước deploy database riêng và truy vấn xác minh migration history + trạng thái runtime.

### 3. Flex inference không phù hợp với đường tương tác

Gemini Flex là best-effort, ưu tiên chi phí thay vì độ trễ và có mục tiêu xử lý 1–15 phút. Vidlish hiển thị màn hình người học chờ bài học và baseline Standard đã đo khoảng 13–20 giây, nên hardcode Flex vào đường production chính là sai trade-off sản phẩm.

Đường tạo bài học đã trở lại service tier Standard. Flex chỉ nên quay lại dưới dạng tác vụ không tương tác, có timeout/fallback rõ ràng và UX nói đúng thời gian chờ.

## Thay đổi

1. Bỏ `ServiceTier.FLEX` khỏi Gemini lesson provider production.
2. Thêm fail-closed invariant ở cuối workflow.
3. Thêm unit test cho workflow thành công, lỗi ném ra và kết thúc không terminal.
4. Áp migration cron còn thiếu lên Supabase production.

## Cách xác minh

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- toàn bộ pgTAP và Playwright trong GitHub Actions
- deployment production phải READY
- bài học thật phải rời `analyzing_video` để sang `completed` hoặc `failed` trong thời gian hữu hạn

## Bài học giữ lại

- Không coi HTTP 200 của polling là bằng chứng workflow đang tiến triển.
- Mọi background workflow phải có invariant terminal ở ranh giới cuối.
- Không merge migration mà không áp và kiểm tra production.
- Không dùng tier có độ trễ theo phút cho UX đang hứa phản hồi theo giây chỉ vì rẻ hơn.
