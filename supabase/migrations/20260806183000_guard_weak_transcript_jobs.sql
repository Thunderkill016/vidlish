create or replace function public.guard_weak_transcript_job_terminal_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'acquiring_transcript'
     and new.language_eligibility_report_id is not null
     and exists (
       select 1
       from public.language_eligibility_reports as report
       where report.id = new.language_eligibility_report_id
         and report.job_id = new.id
         and report.owner_user_id = new.owner_user_id
         and report.status = 'insufficient_evidence'
     ) then
    -- Compatibility guard for the currently deployed runtime. It understands
    -- TRANSCRIPT_UNAVAILABLE but not the new TRANSCRIPT_EVIDENCE_TOO_WEAK code
    -- yet. The important invariant is that a completed language check cannot
    -- put the learner back into an endlessly polled active state.
    new.status := 'failed';
    new.current_stage := 'transcript_unavailable';
    new.safe_error_code := 'TRANSCRIPT_UNAVAILABLE';
    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists guard_weak_transcript_job_terminal_state
  on public.lesson_jobs;

create trigger guard_weak_transcript_job_terminal_state
before update of status, language_eligibility_report_id
on public.lesson_jobs
for each row
execute function public.guard_weak_transcript_job_terminal_state();

comment on function public.guard_weak_transcript_job_terminal_state() is
  'Compatibility fail-safe: prevents insufficient-evidence transcript jobs from returning to an active polling state before the new runtime is deployed.';
