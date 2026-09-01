alter table public.lesson_jobs
  drop constraint if exists lesson_jobs_safe_error_code;

alter table public.lesson_jobs
  add constraint lesson_jobs_safe_error_code
  check (
    safe_error_code is null
    or safe_error_code in (
      'VIDEO_LANGUAGE_UNSUPPORTED',
      'TRANSCRIPT_UNAVAILABLE',
      'TRANSCRIPT_EVIDENCE_TOO_WEAK',
      'LESSON_GENERATION_FAILED'
    )
  );

create or replace function public.mark_transcript_exhausted(
  p_job_id uuid,
  p_owner_user_id uuid,
  p_reason text
)
returns table(job_status text, safe_error_code text, changed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.lesson_job_status;
  v_safe_error_code text;
  v_current_stage text;
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

  if p_reason = 'TRANSCRIPT_EVIDENCE_TOO_WEAK' then
    v_safe_error_code := 'TRANSCRIPT_EVIDENCE_TOO_WEAK';
    v_current_stage := 'transcript_evidence_too_weak';
  else
    v_safe_error_code := 'TRANSCRIPT_UNAVAILABLE';
    v_current_stage := 'transcript_unavailable';
  end if;

  update public.lesson_jobs
  set status = 'failed',
      current_stage = v_current_stage,
      safe_error_code = v_safe_error_code,
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
