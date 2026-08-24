-- Feature 024. Speaking remains self-check / unscored, but support strength is
-- now authoritative durable evidence instead of a hard-coded read-model guess.
-- Existing receipts came from the immediate post-lesson flow, so preserve them
-- conservatively as supported. Only a future first receipt at least 24 hours
-- after lesson completion may be classified independent by the server-side RPC.

alter table public.learning_speaking_attempts
  add column attempt_number integer,
  add column support_level text;

with ranked as (
  select
    id,
    row_number() over (
      partition by owner_user_id, session_id, activity_id
      order by created_at, id
    )::integer as attempt_number
  from public.learning_speaking_attempts
)
update public.learning_speaking_attempts attempt
set
  attempt_number = ranked.attempt_number,
  support_level = 'supported'
from ranked
where ranked.id = attempt.id;

alter table public.learning_speaking_attempts
  alter column attempt_number set not null,
  alter column support_level set not null,
  add constraint learning_speaking_attempts_attempt_number
    check (attempt_number > 0),
  add constraint learning_speaking_attempts_support_level
    check (support_level in ('supported', 'independent')),
  add constraint learning_speaking_attempts_activity_attempt_unique
    unique (owner_user_id, session_id, activity_id, attempt_number);

comment on column public.learning_speaking_attempts.support_level is
  'Immediate bounded support strength only. independent is still self-check/unscored and never means speaking success or mastery.';

create or replace function public.record_learning_speaking_attempt(
  p_owner_user_id uuid,
  p_session_id uuid,
  p_activity_id text,
  p_idempotency_key uuid,
  p_duration_ms integer,
  p_byte_count integer,
  p_mime_type text,
  p_replayed boolean,
  p_confirmed_audible_speech boolean
)
returns table (
  speaking_attempt_id uuid,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.learning_speaking_attempts%rowtype;
  v_session public.lesson_sessions%rowtype;
  v_blueprint jsonb;
  v_attempt_number integer;
  v_support_level text;
begin
  if p_activity_id !~ '^[a-z][a-z0-9_-]{2,63}$'
    or p_duration_ms not between 500 and 120000
    or p_byte_count not between 256 and 5000000
    or length(coalesce(p_mime_type, '')) not between 6 and 120
    or p_mime_type not like 'audio/%'
    or p_replayed is distinct from true
    or p_confirmed_audible_speech is distinct from true then
    raise exception 'invalid speaking capture receipt';
  end if;

  select * into v_existing
  from public.learning_speaking_attempts
  where owner_user_id = p_owner_user_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.session_id <> p_session_id
      or v_existing.activity_id <> p_activity_id then
      raise exception 'idempotency key belongs to another speaking attempt';
    end if;
    return query select v_existing.id, false;
    return;
  end if;

  -- Lock the owned lesson session so concurrent speaking submissions for one
  -- session cannot mint the same ordinal or both become a first attempt.
  select * into v_session
  from public.lesson_sessions
  where id = p_session_id
    and owner_user_id = p_owner_user_id
  for update;
  if v_session.id is null then
    raise exception 'owned lesson session not found';
  end if;
  if v_session.status <> 'completed' or v_session.completed_at is null then
    raise exception 'speaking capture requires completed lesson session';
  end if;

  select version.blueprint into v_blueprint
  from public.lesson_versions version
  where version.id = v_session.lesson_version_id
    and version.owner_user_id = p_owner_user_id;
  if v_blueprint is null then
    raise exception 'owned lesson blueprint not found';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(coalesce(v_blueprint -> 'activities', '[]'::jsonb)) activity
    where activity.value ->> 'id' = p_activity_id
      and activity.value ->> 'activityType' = 'guided_transfer'
  ) then
    raise exception 'speaking capture must belong to guided transfer';
  end if;

  select coalesce(max(attempt.attempt_number), 0) + 1
  into v_attempt_number
  from public.learning_speaking_attempts attempt
  where attempt.owner_user_id = p_owner_user_id
    and attempt.session_id = p_session_id
    and attempt.activity_id = p_activity_id;

  v_support_level := case
    when v_attempt_number = 1
      and v_session.completed_at <= now() - interval '24 hours'
      then 'independent'
    else 'supported'
  end;

  insert into public.learning_speaking_attempts (
    owner_user_id,
    session_id,
    activity_id,
    attempt_number,
    support_level,
    idempotency_key,
    duration_ms,
    byte_count,
    mime_type,
    replayed,
    confirmed_audible_speech
  ) values (
    p_owner_user_id,
    p_session_id,
    p_activity_id,
    v_attempt_number,
    v_support_level,
    p_idempotency_key,
    p_duration_ms,
    p_byte_count,
    p_mime_type,
    p_replayed,
    p_confirmed_audible_speech
  ) returning id into v_existing.id;

  return query select v_existing.id, true;
end;
$$;

revoke all on function public.record_learning_speaking_attempt(
  uuid, uuid, text, uuid, integer, integer, text, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.record_learning_speaking_attempt(
  uuid, uuid, text, uuid, integer, integer, text, boolean, boolean
) to service_role;
