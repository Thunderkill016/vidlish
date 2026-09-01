-- The v2 authoring branch is invisible in production.
--
-- Its two steps swallow their own failures on purpose — losing the richer
-- lesson must not turn a learner's finished job into a failure — and they
-- report through logs. So when production finished a job with zero
-- `lesson_versions` and zero `learning_authoring_briefs`, nothing on the record
-- could say whether the provider was off, the context was missing, or the model
-- call failed. Every one of those leaves the same absence behind.
--
-- One nullable column turns that guess into a fact anyone can query. It is
-- diagnostic only: no learner-visible behaviour depends on it, and a null means
-- the job predates this column rather than that anything went wrong.

alter table public.lesson_jobs
  add column if not exists learning_authoring_outcome text;

alter table public.lesson_jobs
  drop constraint if exists lesson_jobs_learning_authoring_outcome;

alter table public.lesson_jobs
  add constraint lesson_jobs_learning_authoring_outcome check (
    learning_authoring_outcome is null
    or learning_authoring_outcome in (
      'disabled',
      'job_missing',
      'transcript_missing',
      'not_eligible',
      'lesson_missing',
      'diagnosed',
      'authored',
      'diagnose_failed',
      'authoring_failed'
    )
  );

create or replace function public.record_learning_authoring_outcome(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_outcome text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lesson_jobs
  set learning_authoring_outcome = p_outcome
  where id = p_job_id
    and owner_user_id = p_owner_user_id;
end;
$$;

-- Server-side only. The browser has no business writing a diagnostic field, and
-- a learner must never be able to claim their lesson authored when it did not.
revoke all on function public.record_learning_authoring_outcome(uuid, uuid, text)
  from public, anon, authenticated;
