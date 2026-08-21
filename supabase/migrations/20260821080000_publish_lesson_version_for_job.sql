-- v2 could not exist without v1.
--
-- `lesson_versions.lesson_id` was a not-null foreign key to `lessons` — the v1
-- table — so every v2 blueprint needed a v1 lesson as its parent, and the
-- workflow only ran authoring after v1 published. Production showed what that
-- costs: a job failed six times inside v1's quality gate
-- (UNGROUNDED_PHRASE, INVALID_CLOZE_BLANK), so v2 was never reached. v1 was
-- both fragile and a gate standing in front of v2.
--
-- A v2 blueprint belongs to the job that produced it. The job is what owns the
-- transcript, the eligibility decision and the learner's request; the v1 lesson
-- is a sibling artefact, not a parent.
--
-- `lesson_id` stays, nullable, so blueprints published the old way keep their
-- link and nothing has to be rewritten.

alter table public.lesson_versions
  add column if not exists job_id uuid references public.lesson_jobs(id) on delete cascade;

alter table public.lesson_versions
  alter column lesson_id drop not null;

-- One v2 blueprint per job, the same publish-once rule the lesson-scoped
-- constraint gave: a learner may already have a session running on it, and
-- replacing it changes the task under them.
create unique index if not exists lesson_versions_job_schema_version
  on public.lesson_versions (job_id, schema_version)
  where job_id is not null;

alter table public.lesson_versions
  drop constraint if exists lesson_versions_parent_present;

alter table public.lesson_versions
  add constraint lesson_versions_parent_present check (
    lesson_id is not null or job_id is not null
  );

create or replace function public.publish_lesson_version_for_job(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_blueprint jsonb
)
returns table (lesson_version_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.lesson_versions%rowtype;
  v_inserted public.lesson_versions%rowtype;
begin
  -- Shape before the publish-once rule, for the same reason the lesson-scoped
  -- function checks it first: a rubbish payload sent for an already-published
  -- job would otherwise be swallowed and reported as success.
  if (p_blueprint ->> 'schemaVersion') is distinct from 'lesson:v2' then
    raise exception 'blueprint schema version must be lesson:v2';
  end if;

  -- `security definer` bypasses RLS, so without this anyone signed in could
  -- attach a blueprint to someone else's job.
  if not exists (
    select 1
    from public.lesson_jobs
    where id = p_job_id
      and owner_user_id = p_owner_user_id
  ) then
    raise exception 'owned job not found';
  end if;

  select * into v_existing
  from public.lesson_versions
  where job_id = p_job_id
    and schema_version = 'lesson:v2';

  if v_existing.id is not null then
    return query select v_existing.id, false;
    return;
  end if;

  insert into public.lesson_versions (
    job_id, owner_user_id, schema_version, blueprint
  )
  values (p_job_id, p_owner_user_id, 'lesson:v2', p_blueprint)
  returning * into v_inserted;

  return query select v_inserted.id, true;
end;
$$;

revoke all privileges on function public.publish_lesson_version_for_job(uuid, uuid, jsonb)
  from public, anon, authenticated;
