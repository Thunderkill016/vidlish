-- `authoring_failed` says which step lost, not why it lost.
--
-- The step's catch block discarded the error entirely — `catch {}`, not even
-- bound — and reported a hardcoded `provider_failure`. So a draft rejected by
-- the quality gate, a response the schema refused, and a genuine provider
-- outage all produced the same word. That is the same defect this project has
-- already paid for once: a failure thrown without a kind, reported generically,
-- and five wrong guesses before anyone found the real cause.
--
-- The detail is a classification, never a message. Model output and learner
-- content must not reach a diagnostic column.

alter table public.lesson_jobs
  add column if not exists learning_authoring_detail text;

alter table public.lesson_jobs
  drop constraint if exists lesson_jobs_learning_authoring_detail;

alter table public.lesson_jobs
  add constraint lesson_jobs_learning_authoring_detail check (
    learning_authoring_detail is null
    or learning_authoring_detail ~ '^[a-z_]+(:[A-Z_]+)?$'
  );

create or replace function public.record_learning_authoring_outcome(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_outcome text,
  p_detail text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lesson_jobs
  set learning_authoring_outcome = p_outcome,
      learning_authoring_detail = p_detail
  where id = p_job_id
    and owner_user_id = p_owner_user_id;
end;
$$;

revoke all on function public.record_learning_authoring_outcome(uuid, uuid, text, text)
  from public, anon, authenticated;
