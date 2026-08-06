-- Vidlish Learning Model v2 is additive. Lesson v1 remains readable while a
-- v2 immutable blueprint and mutable learner state live in separate tables.
-- Browser clients never author evaluation results or publish blueprints.

create table public.lesson_versions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null,
  blueprint jsonb not null,
  created_at timestamptz not null default now(),
  constraint lesson_versions_schema_v2 check (schema_version = 'lesson:v2'),
  constraint lesson_versions_blueprint_object check (jsonb_typeof(blueprint) = 'object'),
  constraint lesson_versions_blueprint_version check (blueprint ->> 'schemaVersion' = 'lesson:v2'),
  unique (lesson_id, schema_version)
);

create index lesson_versions_owner_created_at
  on public.lesson_versions (owner_user_id, created_at desc);

create table public.lesson_sessions (
  id uuid primary key default gen_random_uuid(),
  lesson_version_id uuid not null references public.lesson_versions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'not_started',
  current_phase text not null,
  current_activity_id text not null,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint lesson_sessions_status check (
    status in ('not_started', 'in_progress', 'completed', 'abandoned')
  ),
  constraint lesson_sessions_phase check (
    current_phase in (
      'orientation', 'activation', 'gist', 'focus', 'notice', 'practice',
      'retrieve', 'transfer', 'reflect', 'completed'
    )
  ),
  constraint lesson_sessions_activity_id check (current_activity_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
  constraint lesson_sessions_completion_time check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create unique index lesson_sessions_one_active_per_version
  on public.lesson_sessions (owner_user_id, lesson_version_id)
  where status in ('not_started', 'in_progress');

create index lesson_sessions_owner_updated_at
  on public.lesson_sessions (owner_user_id, updated_at desc);

create table public.activity_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  attempt_number integer not null,
  idempotency_key uuid not null,
  response jsonb not null,
  evaluation jsonb not null,
  submitted_at timestamptz not null default now(),
  constraint activity_attempts_activity_id check (activity_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
  constraint activity_attempts_number_positive check (attempt_number > 0),
  constraint activity_attempts_response_object check (jsonb_typeof(response) = 'object'),
  constraint activity_attempts_evaluation_object check (jsonb_typeof(evaluation) = 'object'),
  unique (session_id, activity_id, attempt_number),
  unique (owner_user_id, idempotency_key)
);

create index activity_attempts_owner_submitted_at
  on public.activity_attempts (owner_user_id, submitted_at desc);

create table public.learning_item_states (
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  exposure_count integer not null default 0,
  attempt_count integer not null default 0,
  successful_retrievals integer not null default 0,
  last_outcome text,
  last_seen_at timestamptz not null default now(),
  next_review_at timestamptz,
  source_lesson_version_id uuid not null references public.lesson_versions(id) on delete cascade,
  primary key (owner_user_id, item_key),
  constraint learning_item_states_item_key check (length(item_key) between 1 and 160),
  constraint learning_item_states_counts_nonnegative check (
    exposure_count >= 0 and attempt_count >= 0 and successful_retrievals >= 0
  ),
  constraint learning_item_states_outcome check (
    last_outcome is null or last_outcome in ('again', 'hard', 'good')
  )
);

create index learning_item_states_due
  on public.learning_item_states (owner_user_id, next_review_at)
  where next_review_at is not null;

alter table public.lesson_versions enable row level security;
alter table public.lesson_sessions enable row level security;
alter table public.activity_attempts enable row level security;
alter table public.learning_item_states enable row level security;

create policy lesson_versions_select_own
  on public.lesson_versions for select to authenticated
  using (auth.uid() = owner_user_id);
create policy lesson_sessions_select_own
  on public.lesson_sessions for select to authenticated
  using (auth.uid() = owner_user_id);
create policy activity_attempts_select_own
  on public.activity_attempts for select to authenticated
  using (auth.uid() = owner_user_id);
create policy learning_item_states_select_own
  on public.learning_item_states for select to authenticated
  using (auth.uid() = owner_user_id);

revoke all privileges on table public.lesson_versions from public, anon, authenticated;
revoke all privileges on table public.lesson_sessions from public, anon, authenticated;
revoke all privileges on table public.activity_attempts from public, anon, authenticated;
revoke all privileges on table public.learning_item_states from public, anon, authenticated;

grant select on table public.lesson_versions to authenticated;
grant select on table public.lesson_sessions to authenticated;
grant select on table public.activity_attempts to authenticated;
grant select on table public.learning_item_states to authenticated;

grant select, insert, update, delete on table public.lesson_versions to service_role;
grant select, insert, update, delete on table public.lesson_sessions to service_role;
grant select, insert, update, delete on table public.activity_attempts to service_role;
grant select, insert, update, delete on table public.learning_item_states to service_role;

create or replace function public.start_lesson_v2_session(
  p_owner_user_id uuid,
  p_lesson_version_id uuid,
  p_initial_phase text,
  p_initial_activity_id text
)
returns table (
  session_id uuid,
  session_status text,
  current_phase text,
  current_activity_id text,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.lesson_sessions%rowtype;
  v_created boolean := false;
begin
  if p_initial_phase not in (
    'orientation', 'activation', 'gist', 'focus', 'notice', 'practice',
    'retrieve', 'transfer', 'reflect'
  ) then
    raise exception 'invalid initial learning phase';
  end if;

  if p_initial_activity_id !~ '^[a-z][a-z0-9_-]{2,63}$' then
    raise exception 'invalid initial activity id';
  end if;

  perform 1
  from public.lesson_versions
  where id = p_lesson_version_id
    and owner_user_id = p_owner_user_id
  for update;

  if not found then
    raise exception 'owned lesson version not found';
  end if;

  select * into v_session
  from public.lesson_sessions
  where lesson_version_id = p_lesson_version_id
    and owner_user_id = p_owner_user_id
    and status in ('not_started', 'in_progress')
  order by updated_at desc
  limit 1
  for update;

  if v_session.id is null then
    insert into public.lesson_sessions (
      lesson_version_id, owner_user_id, status, current_phase,
      current_activity_id, started_at
    ) values (
      p_lesson_version_id, p_owner_user_id, 'in_progress', p_initial_phase,
      p_initial_activity_id, now()
    )
    returning * into v_session;
    v_created := true;
  end if;

  return query select
    v_session.id,
    v_session.status,
    v_session.current_phase,
    v_session.current_activity_id,
    v_session.started_at,
    v_session.completed_at,
    v_session.updated_at,
    v_created;
end;
$$;

create or replace function public.record_lesson_v2_attempt(
  p_owner_user_id uuid,
  p_session_id uuid,
  p_activity_id text,
  p_idempotency_key uuid,
  p_response jsonb,
  p_evaluation jsonb,
  p_next_phase text,
  p_next_activity_id text,
  p_complete boolean default false
)
returns table (
  attempt_id uuid,
  attempt_number integer,
  session_status text,
  current_phase text,
  current_activity_id text,
  completed_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.lesson_sessions%rowtype;
  v_existing public.activity_attempts%rowtype;
  v_attempt public.activity_attempts%rowtype;
  v_attempt_number integer;
  v_activity_exists boolean;
begin
  if jsonb_typeof(p_response) <> 'object' or jsonb_typeof(p_evaluation) <> 'object' then
    raise exception 'attempt response and evaluation must be objects';
  end if;

  if p_next_phase not in (
    'orientation', 'activation', 'gist', 'focus', 'notice', 'practice',
    'retrieve', 'transfer', 'reflect', 'completed'
  ) then
    raise exception 'invalid next learning phase';
  end if;

  select * into v_session
  from public.lesson_sessions
  where id = p_session_id and owner_user_id = p_owner_user_id
  for update;

  if v_session.id is null then
    raise exception 'owned learning session not found';
  end if;
  if v_session.status not in ('not_started', 'in_progress') then
    raise exception 'learning session is not active';
  end if;
  if v_session.current_activity_id <> p_activity_id then
    raise exception 'activity is not current for this session';
  end if;

  select exists (
    select 1
    from public.lesson_versions version,
      lateral jsonb_array_elements(version.blueprint -> 'activities') activity
    where version.id = v_session.lesson_version_id
      and version.owner_user_id = p_owner_user_id
      and activity ->> 'id' = p_activity_id
  ) into v_activity_exists;

  if not v_activity_exists then
    raise exception 'activity is not part of the immutable lesson blueprint';
  end if;

  select * into v_existing
  from public.activity_attempts
  where owner_user_id = p_owner_user_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    return query select
      v_existing.id,
      v_existing.attempt_number,
      v_session.status,
      v_session.current_phase,
      v_session.current_activity_id,
      v_session.completed_at,
      false;
    return;
  end if;

  select coalesce(max(activity_attempts.attempt_number), 0) + 1
    into v_attempt_number
  from public.activity_attempts
  where session_id = p_session_id and activity_id = p_activity_id;

  insert into public.activity_attempts (
    session_id, owner_user_id, activity_id, attempt_number,
    idempotency_key, response, evaluation
  ) values (
    p_session_id, p_owner_user_id, p_activity_id, v_attempt_number,
    p_idempotency_key, p_response, p_evaluation
  )
  returning * into v_attempt;

  update public.lesson_sessions
  set status = case when p_complete then 'completed' else 'in_progress' end,
      current_phase = case when p_complete then 'completed' else p_next_phase end,
      current_activity_id = p_next_activity_id,
      completed_at = case when p_complete then now() else null end,
      updated_at = now(),
      started_at = coalesce(started_at, now())
  where id = p_session_id
  returning * into v_session;

  return query select
    v_attempt.id,
    v_attempt.attempt_number,
    v_session.status,
    v_session.current_phase,
    v_session.current_activity_id,
    v_session.completed_at,
    true;
end;
$$;

revoke all on function public.start_lesson_v2_session(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.record_lesson_v2_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, text, text, boolean
) from public, anon, authenticated;

grant execute on function public.start_lesson_v2_session(uuid, uuid, text, text)
  to service_role;
grant execute on function public.record_lesson_v2_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, text, text, boolean
) to service_role;
