-- Watchdog cho MỌI trạng thái chưa kết thúc, không riêng giai đoạn transcript.
--
-- expire_stalled_transcript_jobs chỉ quét tới 'checking_language'. Một job đi
-- qua được cổng ngôn ngữ rồi kẹt ở 'analyzing_video' (bước gọi model) sẽ không
-- bao giờ trở thành terminal: nó vĩnh viễn bị đếm là job đang chạy, chiếm một
-- suất trong GENERATION_MAX_ACTIVE_JOBS, và người học bị bảo "hãy chờ một bài
-- hoàn tất" trong khi không bài nào sẽ hoàn tất. Hai job như vậy là khoá tài
-- khoản vĩnh viễn.
--
-- Quan sát trên production 2026-08-06: hai job kẹt ở analyzing_video hơn một
-- giờ, người dùng không tạo được bài học nào nữa.

alter table public.lesson_jobs
  drop constraint if exists lesson_jobs_safe_error_code;

alter table public.lesson_jobs
  add constraint lesson_jobs_safe_error_code check (
    safe_error_code is null
    or safe_error_code in (
      'VIDEO_LANGUAGE_UNSUPPORTED',
      'TRANSCRIPT_UNAVAILABLE',
      'LESSON_GENERATION_FAILED'
    )
  );

comment on column public.lesson_jobs.safe_error_code is
  'Learner-safe terminal reason. VIDEO_LANGUAGE_UNSUPPORTED means confirmed insufficient original English. TRANSCRIPT_UNAVAILABLE means no transcript strategy could produce a usable source. LESSON_GENERATION_FAILED means the job stalled after a usable transcript was in hand.';

create or replace function public.expire_stalled_lesson_jobs(
  p_stale_after interval
)
returns table (job_id uuid)
language sql
security definer
set search_path = public
as $$
  update public.lesson_jobs
  set status = 'failed',
      current_stage = 'failed',
      safe_error_code = 'LESSON_GENERATION_FAILED',
      updated_at = now()
  where status in (
      'analyzing_video',
      'mining_language',
      'planning_lesson',
      'composing_activities',
      'validating_lesson',
      'repairing_lesson',
      'publishing'
    )
    and updated_at < now() - p_stale_after
  returning id;
$$;

revoke all on function public.expire_stalled_lesson_jobs(interval)
  from public, anon, authenticated;
grant execute on function public.expire_stalled_lesson_jobs(interval)
  to service_role;

-- Cùng nhịp với watchdog transcript: cron của Supabase, không phụ thuộc dịch vụ
-- orchestration bên ngoài.
select cron.schedule(
  'expire-stalled-lesson-jobs',
  '*/7 * * * *',
  $$select public.expire_stalled_lesson_jobs(interval '15 minutes')$$
);
