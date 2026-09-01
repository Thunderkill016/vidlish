-- Completion was defined by v1.
--
-- `publish_lesson` marks the job `completed` in the same commit that writes the
-- v1 lesson, under the invariant that "a job can never report completed without
-- a readable lesson behind it". That invariant is right; the assumption that
-- "lesson" means the v1 row is what is being retired.
--
-- A published v2 blueprint is a readable lesson — more readable than the v1 row,
-- since it is what the learner is now routed to. So publishing one completes the
-- job too, and v1 stops being the only thing that can.
--
-- Both paths stay owner-scoped and both refuse to touch a terminal job, so a
-- failed or cancelled job cannot be revived by a late blueprint.

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
  if (p_blueprint ->> 'schemaVersion') is distinct from 'lesson:v2' then
    raise exception 'blueprint schema version must be lesson:v2';
  end if;

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

  -- Same commit as the blueprint, same rule as the v1 path: a job reports
  -- completed only when something readable exists behind it.
  update public.lesson_jobs
  set status = 'completed',
      current_stage = 'completed',
      safe_error_code = null,
      updated_at = now()
  where id = p_job_id
    and owner_user_id = p_owner_user_id
    and status not in ('completed', 'failed', 'cancelled');

  return query select v_inserted.id, true;
end;
$$;

revoke all privileges on function public.publish_lesson_version_for_job(uuid, uuid, jsonb)
  from public, anon, authenticated;
