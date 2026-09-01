-- Persist only bounded evidence that runtime support was used. No learner free
-- text, caption text, generated hint copy or audio is stored here. Replay is
-- derived from playback_ordinal >= 2 rather than duplicated as another event.

create table public.learning_support_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.lesson_sessions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  idempotency_key uuid not null,
  event_kind text not null,
  support_step text,
  playback_ordinal integer,
  occurred_at timestamptz not null default now(),
  constraint learning_support_events_activity_id
    check (activity_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
  constraint learning_support_events_kind
    check (event_kind in ('playback', 'support_opened')),
  constraint learning_support_events_support_step
    check (
      support_step is null or support_step in (
        'context_hint', 'keyword_hint', 'english_caption', 'chunk_boundaries',
        'vietnamese_meaning', 'slower_playback'
      )
    ),
  constraint learning_support_events_shape check (
    (
      event_kind = 'playback'
      and support_step is null
      and playback_ordinal is not null
      and playback_ordinal > 0
    )
    or
    (event_kind = 'support_opened' and support_step is not null and playback_ordinal is null)
  ),
  unique (owner_user_id, idempotency_key),
  unique (session_id, activity_id, playback_ordinal)
);

create unique index learning_support_events_one_support_step
  on public.learning_support_events (session_id, activity_id, support_step)
  where event_kind = 'support_opened';

create index learning_support_events_owner_occurred_at
  on public.learning_support_events (owner_user_id, occurred_at desc);

alter table public.learning_support_events enable row level security;

create policy learning_support_events_select_own
  on public.learning_support_events for select to authenticated
  using (auth.uid() = owner_user_id);

revoke all privileges on table public.learning_support_events
  from public, anon, authenticated;
grant select on table public.learning_support_events to authenticated;
grant select, insert, update, delete on table public.learning_support_events
  to service_role;

create or replace function public.record_lesson_v2_support_event(
  p_owner_user_id uuid,
  p_session_id uuid,
  p_activity_id text,
  p_idempotency_key uuid,
  p_event_kind text,
  p_support_step text default null
)
returns table (
  event_id uuid,
  idempotency_key uuid,
  event_kind text,
  support_step text,
  playback_ordinal integer,
  occurred_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.lesson_sessions%rowtype;
  v_existing public.learning_support_events%rowtype;
  v_event public.learning_support_events%rowtype;
  v_playback_ordinal integer;
  v_activity_exists boolean;
begin
  -- Network retries may arrive after a later attempt has advanced the session.
  -- Resolve an owned idempotency key before checking the current activity.
  select events.* into v_existing
  from public.learning_support_events events
  where events.owner_user_id = p_owner_user_id
    and events.idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.session_id <> p_session_id
      or v_existing.activity_id <> p_activity_id
      or v_existing.event_kind <> p_event_kind
      or v_existing.support_step is distinct from p_support_step then
      raise exception 'idempotency key belongs to another learning support event';
    end if;

    return query select
      v_existing.id,
      v_existing.idempotency_key,
      v_existing.event_kind,
      v_existing.support_step,
      v_existing.playback_ordinal,
      v_existing.occurred_at,
      false;
    return;
  end if;

  if p_event_kind not in ('playback', 'support_opened') then
    raise exception 'invalid learning support event kind';
  end if;

  if p_event_kind = 'playback' then
    if p_support_step is not null then
      raise exception 'playback cannot carry a support step';
    end if;
  elsif p_support_step is null or p_support_step not in (
    'context_hint', 'keyword_hint', 'english_caption', 'chunk_boundaries',
    'vietnamese_meaning', 'slower_playback'
  ) then
    raise exception 'invalid persisted support step';
  end if;

  -- This row lock serializes playback ordinals and same-step support opens for
  -- one session. It also proves ownership before semantic dedup is returned.
  select sessions.* into v_session
  from public.lesson_sessions sessions
  where sessions.id = p_session_id
    and sessions.owner_user_id = p_owner_user_id
  for update;

  if v_session.id is null then
    raise exception 'owned learning session not found';
  end if;

  if p_event_kind = 'support_opened' then
    -- Opening a support level is a state fact, not a counter. Re-check after
    -- the session lock so concurrent requests with different keys converge.
    select events.* into v_existing
    from public.learning_support_events events
    where events.owner_user_id = p_owner_user_id
      and events.session_id = p_session_id
      and events.activity_id = p_activity_id
      and events.event_kind = 'support_opened'
      and events.support_step = p_support_step;

    if v_existing.id is not null then
      return query select
        v_existing.id,
        v_existing.idempotency_key,
        v_existing.event_kind,
        v_existing.support_step,
        v_existing.playback_ordinal,
        v_existing.occurred_at,
        false;
      return;
    end if;
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

  if p_event_kind = 'playback' then
    select coalesce(max(events.playback_ordinal), 0) + 1
      into v_playback_ordinal
    from public.learning_support_events events
    where events.session_id = p_session_id
      and events.activity_id = p_activity_id
      and events.event_kind = 'playback';
  else
    v_playback_ordinal := null;
  end if;

  insert into public.learning_support_events (
    session_id,
    owner_user_id,
    activity_id,
    idempotency_key,
    event_kind,
    support_step,
    playback_ordinal
  ) values (
    p_session_id,
    p_owner_user_id,
    p_activity_id,
    p_idempotency_key,
    p_event_kind,
    p_support_step,
    v_playback_ordinal
  )
  returning * into v_event;

  update public.lesson_sessions sessions
  set updated_at = now(),
      started_at = coalesce(sessions.started_at, now())
  where sessions.id = p_session_id;

  return query select
    v_event.id,
    v_event.idempotency_key,
    v_event.event_kind,
    v_event.support_step,
    v_event.playback_ordinal,
    v_event.occurred_at,
    true;
end;
$$;

revoke all on function public.record_lesson_v2_support_event(
  uuid, uuid, text, uuid, text, text
) from public, anon, authenticated;

grant execute on function public.record_lesson_v2_support_event(
  uuid, uuid, text, uuid, text, text
) to service_role;
