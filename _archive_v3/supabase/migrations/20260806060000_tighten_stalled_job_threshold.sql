-- Hạ ngưỡng chờ từ 15 phút xuống 5 phút.
--
-- Sau khi resolveLessonFailureStep (PR #34) đánh dấu job hỏng ngay lúc cạn lượt
-- thử lại, watchdog không còn là đường xử lý chính mà chỉ là lưới cuối cho
-- trường hợp cả workflow chết chứ không riêng một bước. Soạn bài thật mất ~20
-- giây, nên 5 phút vẫn rộng gấp 15 lần, trong khi 15 phút là quá lâu để một
-- người ngồi nhìn màn hình.

select cron.unschedule('expire-stalled-lesson-jobs');
select cron.schedule(
  'expire-stalled-lesson-jobs',
  '*/2 * * * *',
  $$select public.expire_stalled_lesson_jobs(interval '5 minutes')$$
);
