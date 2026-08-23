-- Feature 022. A speaking attempt must prove that the learner actually used the
-- microphone without turning private speech into durable product data. The HTTP
-- route receives the audio Blob, validates its bounded metadata, and discards
-- the raw bytes. This table stores only the receipt needed to say a speaking
-- self-check happened. It does not store audio, transcript, recognized words or
-- a pronunciation/intelligibility score.

create table public.learning_speaking_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  activity_id text not null,
  idempotency_key uuid not null,
  duration_ms integer not null,
  byte_count integer not null,
  mime_type text not null,
  replayed boolean not null,
  confirmed_audible_speech boolean not null,
  created_at timestamptz not null default now(),
  constraint learning_speaking_attempts_activity_id
    check (activity_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
  constraint learning_speaking_attempts_duration
    check (duration_ms between 500 and 120000),
  constraint learning_speaking_attempts_bytes
    check (byte_count between 256 and 5000000),
  constraint learning_speaking_attempts_mime
    check (length(mime_type) between 6 and 120 and mime_type like 'audio/%'),
  constraint learning_speaking_attempts_self_check
    check (replayed and confirmed_audible_speech),
  unique (owner_user_id, idempotency_key)
);

create index learning_speaking_attempts_owner_created_at
  on public.learning_speaking_attempts (owner_user_id, created_at desc);
create index learning_speaking_attempts_session_activity
  on public.learning_speaking_attempts (session_id, activity_id, created_at desc);

alter table public.learning_speaking_attempts enable row level security;

create policy learning_speaking_attempts_select_own
  on public.learning_speaking_attempts for select to authenticated
  using (auth.uid() = owner_user_id);

revoke all privileges on table public.learning_speaking_attempts
  from public, anon, authenticated;
grant select on table public.learning_speaking_attempts to authenticated;
grant select, insert, update, delete on table public.learning_speaking_attempts
  to service_role;

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

  select * into v_session
  from public.lesson_sessions
  where id = p_session_id
    and owner_user_id = p_owner_user_id;
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

  insert into public.learning_speaking_attempts (
    owner_user_id,
    session_id,
    activity_id,
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
