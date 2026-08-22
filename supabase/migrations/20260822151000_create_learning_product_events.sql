-- Product-observation evidence for the Golden Session. This is deliberately
-- separate from learning evidence: rows here never advance capability, review
-- state, completion or mastery claims.

create table public.learning_product_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  idempotency_key uuid not null,
  event_kind text not null,
  detail_kind text,
  occurred_at timestamptz not null default now(),
  constraint learning_product_events_activity_id
    check (activity_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
  constraint learning_product_events_kind
    check (event_kind in (
      'source_play_completed',
      'correction_shown',
      'runtime_error'
    )),
  constraint learning_product_events_detail_kind
    check (
      detail_kind is null
      or detail_kind in (
        'youtube_api_load',
        'youtube_player',
        'session_request',
        'attempt_request',
        'support_request'
      )
    ),
  constraint learning_product_events_shape
    check (
      (event_kind = 'runtime_error' and detail_kind is not null)
      or (event_kind <> 'runtime_error' and detail_kind is null)
    ),
  unique (owner_user_id, idempotency_key)
);

create index learning_product_events_owner_occurred_at
  on public.learning_product_events (owner_user_id, occurred_at desc);
create index learning_product_events_session_occurred_at
  on public.learning_product_events (session_id, occurred_at);

alter table public.learning_product_events enable row level security;

create policy learning_product_events_select_own
  on public.learning_product_events
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all privileges on table public.learning_product_events
  from public, anon, authenticated;
grant select on table public.learning_product_events to authenticated;
grant select, insert, update, delete on table public.learning_product_events
  to service_role;

create or replace function public.record_lesson_v2_product_event(
  p_owner_user_id uuid,
  p_session_id uuid,
  p_activity_id text,
  p_idempotency_key uuid,
  p_event_kind text,
  p_detail_kind text default null
)
returns table (
  event_id uuid,
  idempotency_key uuid,
  event_kind text,
  detail_kind text,
  occurred_at timestamptz,
  created boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.lesson_sessions%rowtype;
  v_existing public.learning_product_events%rowtype;
  v_event public.learning_product_events%rowtype;
  v_activity jsonb;
begin
  if p_activity_id !~ '^[a-z][a-z0-9_-]{2,63}$' then
    raise exception 'invalid product event activity id';
  end if;

  if p_event_kind not in (
    'source_play_completed',
    'correction_shown',
    'runtime_error'
  ) then
    raise exception 'invalid learning product event kind';
  end if;

  if p_event_kind = 'runtime_error' then
    if p_detail_kind is null or p_detail_kind not in (
      'youtube_api_load',
      'youtube_player',
      'session_request',
      'attempt_request',
      'support_request'
    ) then
      raise exception 'invalid learning runtime error kind';
    end if;
  elsif p_detail_kind is not null then
    raise exception 'non-error product event cannot carry detail';
  end if;

  select * into v_session
  from public.lesson_sessions
  where id = p_session_id
    and owner_user_id = p_owner_user_id;

  if v_session.id is null then
    raise exception 'owned learning session not found';
  end if;

  -- Idempotency is checked before any mutable activity/session-stage condition.
  -- A response retry can arrive after the learner advanced; the same request
  -- must still return the event it already created rather than fail differently.
  select existing.* into v_existing
  from public.learning_product_events as existing
  where existing.owner_user_id = p_owner_user_id
    and existing.idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.session_id <> p_session_id
      or v_existing.activity_id <> p_activity_id
      or v_existing.event_kind <> p_event_kind
      or v_existing.detail_kind is distinct from p_detail_kind then
      raise exception 'idempotency key belongs to another product event';
    end if;

    return query select
      v_existing.id,
      v_existing.idempotency_key,
      v_existing.event_kind,
      v_existing.detail_kind,
      v_existing.occurred_at,
      false;
    return;
  end if;

  select activity into v_activity
  from public.lesson_versions version,
    lateral jsonb_array_elements(version.blueprint -> 'activities') activity
  where version.id = v_session.lesson_version_id
    and version.owner_user_id = p_owner_user_id
    and activity ->> 'id' = p_activity_id
  limit 1;

  if v_activity is null then
    raise exception 'activity is not part of the immutable lesson blueprint';
  end if;

  if p_event_kind = 'source_play_completed'
    and coalesce(jsonb_array_length(v_activity -> 'evidence'), 0) = 0 then
    raise exception 'source completion requires bounded source evidence';
  end if;

  -- The UI deliberately uses the incorrect attempt's immutable row id as this
  -- event's idempotency key. Binding the two here means a crafted client cannot
  -- claim that correction was displayed after a correct/unrelated attempt.
  -- Reading a correction is still product-observation evidence only; this check
  -- never mutates the attempt or upgrades learning state.
  if p_event_kind = 'correction_shown'
    and not exists (
      select 1
      from public.activity_attempts attempt
      where attempt.id = p_idempotency_key
        and attempt.owner_user_id = p_owner_user_id
        and attempt.session_id = p_session_id
        and attempt.activity_id = p_activity_id
        and attempt.evaluation ->> 'verdict' = 'incorrect'
    ) then
    raise exception 'correction display requires the matching incorrect attempt';
  end if;

  insert into public.learning_product_events (
    session_id,
    owner_user_id,
    activity_id,
    idempotency_key,
    event_kind,
    detail_kind
  ) values (
    p_session_id,
    p_owner_user_id,
    p_activity_id,
    p_idempotency_key,
    p_event_kind,
    p_detail_kind
  )
  returning * into v_event;

  return query select
    v_event.id,
    v_event.idempotency_key,
    v_event.event_kind,
    v_event.detail_kind,
    v_event.occurred_at,
    true;
end;
$$;

revoke execute on function public.record_lesson_v2_product_event(
  uuid, uuid, text, uuid, text, text
) from public, anon, authenticated;
grant execute on function public.record_lesson_v2_product_event(
  uuid, uuid, text, uuid, text, text
) to service_role;
