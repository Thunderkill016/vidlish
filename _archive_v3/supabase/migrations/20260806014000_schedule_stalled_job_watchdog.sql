create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'expire-stalled-transcript-jobs',
  '*/7 * * * *',
  $schedule$
    select count(*)
    from public.expire_stalled_transcript_jobs(interval '15 minutes');
  $schedule$
);
