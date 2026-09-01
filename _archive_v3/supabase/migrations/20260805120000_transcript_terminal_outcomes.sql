-- Story 2.3.5: transcript acquisition must reach a terminal state.
--
-- Before this migration the only terminal outcome was VIDEO_LANGUAGE_UNSUPPORTED.
-- Exhausting every transcript strategy left the job in 'acquiring_transcript'
-- forever, which held an active-quota slot and made the progress page poll
-- indefinitely. TRANSCRIPT_UNAVAILABLE is the terminal outcome for a source we
-- could not obtain; it is never a statement about the spoken language.

alter table public.lesson_jobs
  add constraint lesson_jobs_safe_error_code check (
    safe_error_code is null
    or safe_error_code in ('VIDEO_LANGUAGE_UNSUPPORTED', 'TRANSCRIPT_UNAVAILABLE')
  );

comment on column public.lesson_jobs.safe_error_code is
  'Learner-safe terminal reason. VIDEO_LANGUAGE_UNSUPPORTED means confirmed insufficient original English. TRANSCRIPT_UNAVAILABLE means no transcript strategy could produce a usable source.';

-- Terminal transition for transcript exhaustion.
--
-- Idempotent by design: the durable workflow and the watchdog can both reach
-- this for the same job, and Inngest event idempotency is time-bounded so it
-- cannot be relied on to prevent a second call (see Story 2.1 validation note).
-- Only non-terminal jobs are moved, so a job already failed, completed or
-- cancelled keeps its original outcome and reason.
create or replace function public.mark_transcript_exhausted(
  p_job_id uuid,
  p_owner_user_id uuid,
  p_reason text
)
returns table (job_status text, safe_error_code text, changed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.lesson_job_status;
  v_safe_error_code text;
  v_changed boolean := false;
begin
  select status into v_status
  from public.lesson_jobs
  where id = p_job_id and owner_user_id = p_owner_user_id
  for update;

  if v_status is null then
    raise exception 'generation job not found';
  end if;

  if v_status in ('completed', 'failed', 'cancelled') then
    select lesson_jobs.status, lesson_jobs.safe_error_code
      into v_status, v_safe_error_code
    from public.lesson_jobs
    where id = p_job_id;
    return query select v_status::text, v_safe_error_code, false;
    return;
  end if;

  update public.lesson_jobs
  set status = 'failed',
      current_stage = 'transcript_unavailable',
      safe_error_code = 'TRANSCRIPT_UNAVAILABLE',
      updated_at = now()
  where id = p_job_id and owner_user_id = p_owner_user_id;

  v_changed := true;
  select lesson_jobs.status, lesson_jobs.safe_error_code
    into v_status, v_safe_error_code
  from public.lesson_jobs
  where id = p_job_id;

  return query select v_status::text, v_safe_error_code, v_changed;
end;
$$;

revoke all on function public.mark_transcript_exhausted(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.mark_transcript_exhausted(uuid, uuid, text)
  to service_role;

-- Which strategies have already produced a non-retryable outcome for a job.
-- Retryable failures are excluded: the durable workflow retries those, and a
-- strategy is only finished when it says it cannot help or fails terminally.
create or replace function public.list_exhausted_transcript_strategies(
  p_job_id uuid,
  p_owner_user_id uuid
)
returns table (strategy_id text)
language sql
security definer
set search_path = public
as $$
  select distinct attempts.strategy_id
  from public.transcript_acquisition_attempts as attempts
  join public.lesson_jobs as jobs on jobs.id = attempts.job_id
  where attempts.job_id = p_job_id
    and jobs.owner_user_id = p_owner_user_id
    and attempts.result_kind in ('not_applicable', 'terminal_failure')
  order by attempts.strategy_id;
$$;

revoke all on function public.list_exhausted_transcript_strategies(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.list_exhausted_transcript_strategies(uuid, uuid)
  to service_role;

-- Watchdog for jobs whose workflow died without reaching a terminal state.
--
-- A durable workflow can disappear: Inngest exhausts its retries, a deploy
-- interrupts a run, or a step throws in a way no handler catches. The job row
-- then sits non-terminal forever, holding an active-quota slot. This scan is
-- deliberately outside the workflow, because an in-workflow timer dies with the
-- workflow it was supposed to guard.
--
-- Scoped to the stages that exist today, all of which are transcript
-- acquisition or the language gate, so TRANSCRIPT_UNAVAILABLE stays truthful.
-- Lesson Engine stages are excluded on purpose: when Epic 3 adds them it must
-- also decide what a stalled generation means and which reason to record.
create or replace function public.expire_stalled_transcript_jobs(
  p_stale_after interval
)
returns table (job_id uuid)
language sql
security definer
set search_path = public
as $$
  update public.lesson_jobs
  set status = 'failed',
      current_stage = 'transcript_unavailable',
      safe_error_code = 'TRANSCRIPT_UNAVAILABLE',
      updated_at = now()
  where status in (
      'queued',
      'validating_video',
      'acquiring_transcript',
      'awaiting_user_input',
      'normalizing_transcript',
      'checking_language'
    )
    and updated_at < now() - p_stale_after
  returning id;
$$;

revoke all on function public.expire_stalled_transcript_jobs(interval)
  from public, anon, authenticated;
grant execute on function public.expire_stalled_transcript_jobs(interval)
  to service_role;
