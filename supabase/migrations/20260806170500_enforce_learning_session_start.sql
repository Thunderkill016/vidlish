-- A new learning session must begin at the first activity encoded in the
-- immutable lesson blueprint. Callers cannot choose an arbitrary valid-looking
-- activity or phase.

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
  v_expected_initial_activity_id text;
  v_expected_initial_phase text;
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

  select
    version.blueprint -> 'activities' -> 0 ->> 'id',
    version.blueprint -> 'activities' -> 0 ->> 'phase'
  into
    v_expected_initial_activity_id,
    v_expected_initial_phase
  from public.lesson_versions version
  where version.id = p_lesson_version_id
    and version.owner_user_id = p_owner_user_id
  for update;

  if not found then
    raise exception 'owned lesson version not found';
  end if;
  if v_expected_initial_activity_id is null or v_expected_initial_phase is null then
    raise exception 'immutable lesson blueprint has no valid initial activity';
  end if;
  if p_initial_activity_id <> v_expected_initial_activity_id
    or p_initial_phase <> v_expected_initial_phase then
    raise exception 'initial session state must match the first immutable activity';
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

revoke all on function public.start_lesson_v2_session(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.start_lesson_v2_session(uuid, uuid, text, text)
  to service_role;
