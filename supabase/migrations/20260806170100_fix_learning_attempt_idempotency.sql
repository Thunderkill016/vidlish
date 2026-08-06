-- A network retry arrives after the first request has already advanced the
-- session. Resolve an owned idempotency key before enforcing the current
-- activity invariant, otherwise the retry would fail even though its attempt
-- was committed successfully.

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

  select * into v_existing
  from public.activity_attempts
  where owner_user_id = p_owner_user_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.session_id <> p_session_id or v_existing.activity_id <> p_activity_id then
      raise exception 'idempotency key belongs to another learning attempt';
    end if;
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

revoke all on function public.record_lesson_v2_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, text, text, boolean
) from public, anon, authenticated;
grant execute on function public.record_lesson_v2_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, text, text, boolean
) to service_role;
