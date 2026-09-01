-- Study progress: the learner's side of a published lesson.
--
-- A lesson row is immutable once published, so progress lives beside it rather
-- than inside it. Nothing written here is model output — it is what the learner
-- answered, marked as learned and finished — so it cannot weaken the grounding
-- invariant that protects `lessons.citations`.
--
-- Writes go through `save_lesson_progress` only. The RPC resolves the lesson
-- from `(job_id, owner_user_id)`, so a guessed job ID belonging to someone else
-- resolves to nothing and is refused, exactly like `publish_lesson`.

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  job_id uuid not null references public.lesson_jobs(id) on delete cascade,
  state jsonb not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_progress_state_object check (jsonb_typeof(state) = 'object'),
  -- The application validates the full shape. The database refuses a payload
  -- that does not even claim the schema this column is read as.
  -- `is not distinct from`, not `=`. A payload with no `version` key makes
  -- `state ->> 'version'` NULL, and `NULL = '...'` is NULL, which a CHECK
  -- constraint accepts. Written with `=` this guard failed open on exactly the
  -- payload it exists to refuse.
  constraint lesson_progress_state_version
    check ((state ->> 'version') is not distinct from 'study-progress:v1'),
  -- One progress row per lesson: reopening a lesson continues where the
  -- learner stopped instead of starting a parallel record.
  --
  -- Named on purpose. The upsert below targets this constraint by name because
  -- `on conflict (lesson_id)` is ambiguous inside `save_lesson_progress`:
  -- `lesson_id` is also one of its RETURNS TABLE output parameters, and
  -- PL/pgSQL resolves the inference target against those variables too.
  constraint lesson_progress_one_per_lesson unique (lesson_id)
);

create index lesson_progress_owner_updated_at
  on public.lesson_progress (owner_user_id, updated_at desc);

alter table public.lesson_progress enable row level security;
create policy lesson_progress_select_own
  on public.lesson_progress for select to authenticated
  using (auth.uid() = owner_user_id);
revoke all privileges on table public.lesson_progress from public, anon, authenticated;
grant select on table public.lesson_progress to authenticated;
grant select, insert, update, delete on table public.lesson_progress to service_role;

create or replace function public.save_lesson_progress(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_state jsonb,
  p_completed boolean
)
returns table (
  lesson_id uuid,
  job_id uuid,
  state jsonb,
  completed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lesson_id uuid;
  v_completed_at timestamptz;
  v_updated_at timestamptz;
begin
  -- The lesson is the ownership boundary. A job ID belonging to someone else
  -- resolves to nothing here, exactly as in publish_lesson.
  select lessons.id into v_lesson_id
  from public.lessons
  where lessons.job_id = p_job_id
    and lessons.owner_user_id = p_owner_user_id
  order by lessons.created_at desc
  limit 1;

  if v_lesson_id is null then
    raise exception 'lesson not found for study progress';
  end if;

  insert into public.lesson_progress as progress (
    owner_user_id, lesson_id, job_id, state, completed_at
  ) values (
    p_owner_user_id, v_lesson_id, p_job_id, p_state,
    case when p_completed then now() else null end
  )
  on conflict on constraint lesson_progress_one_per_lesson do update
  set state = excluded.state,
      -- Finishing a lesson keeps the moment it was first finished; unfinishing
      -- it clears the mark rather than back-dating a new one.
      completed_at = case
        when p_completed then coalesce(progress.completed_at, now())
        else null
      end,
      updated_at = now()
  returning progress.completed_at, progress.updated_at
  into v_completed_at, v_updated_at;

  return query
  select v_lesson_id, p_job_id, p_state, v_completed_at, v_updated_at;
end;
$$;

revoke all on function public.save_lesson_progress(uuid, uuid, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.save_lesson_progress(uuid, uuid, jsonb, boolean)
  to service_role;
