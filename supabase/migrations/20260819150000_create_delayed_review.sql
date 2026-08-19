-- Delayed review is a separate lifecycle from the immediate lesson session.
-- The scheduler only decides when an item returns; a completed review does not
-- imply mastery. Raw learner free text is never stored in review attempts.

alter table public.learning_item_states
  add column last_delayed_transfer_at timestamptz;

create table public.learning_review_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  source_lesson_version_id uuid not null references public.lesson_versions(id) on delete cascade,
  scheduled_for timestamptz not null,
  variant_id text not null,
  status text not null default 'in_progress',
  current_step text not null default 'recall',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint learning_review_sessions_item_fk
    foreign key (owner_user_id, item_key)
    references public.learning_item_states(owner_user_id, item_key)
    on delete cascade,
  constraint learning_review_sessions_item_key
    check (length(item_key) between 1 and 160),
  constraint learning_review_sessions_variant_id
    check (variant_id ~ '^[a-z][a-z0-9_-]{2,63}$'),
  constraint learning_review_sessions_status
    check (status in ('in_progress', 'completed', 'abandoned')),
  constraint learning_review_sessions_step
    check (current_step in ('recall', 'transfer', 'completed')),
  constraint learning_review_sessions_completion_time check (
    (status = 'completed' and completed_at is not null and current_step = 'completed')
    or (status <> 'completed' and completed_at is null and current_step <> 'completed')
  )
);

create unique index learning_review_sessions_one_active_per_item
  on public.learning_review_sessions (owner_user_id, item_key)
  where status = 'in_progress';

create index learning_review_sessions_owner_updated_at
  on public.learning_review_sessions (owner_user_id, updated_at desc);

create table public.learning_review_attempts (
  id uuid primary key default gen_random_uuid(),
  review_session_id uuid not null references public.learning_review_sessions(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  step text not null,
  attempt_number integer not null,
  idempotency_key uuid not null,
  response jsonb not null,
  evaluation jsonb not null,
  submitted_at timestamptz not null default now(),
  constraint learning_review_attempts_step
    check (step in ('recall', 'transfer')),
  constraint learning_review_attempts_number_positive
    check (attempt_number > 0),
  constraint learning_review_attempts_response_object
    check (jsonb_typeof(response) = 'object'),
  constraint learning_review_attempts_evaluation_object
    check (jsonb_typeof(evaluation) = 'object'),
  constraint learning_review_attempts_response_privacy_safe check (
    not (response ? 'text')
    and coalesce(response ->> 'kind', '') in ('text', 'self_check')
    and case response ->> 'kind'
      when 'text' then
        response ?& array['kind', 'submitted', 'characterCount']
        and response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
      when 'self_check' then
        response ?& array['kind', 'submitted', 'characterCount', 'checkedCriteria']
        and response -> 'submitted' = 'true'::jsonb
        and jsonb_typeof(response -> 'characterCount') = 'number'
        and jsonb_typeof(response -> 'checkedCriteria') = 'array'
      else false
    end
  ),
  unique (review_session_id, step, attempt_number),
  unique (owner_user_id, idempotency_key)
);

create index learning_review_attempts_owner_submitted_at
  on public.learning_review_attempts (owner_user_id, submitted_at desc);

alter table public.learning_review_sessions enable row level security;
alter table public.learning_review_attempts enable row level security;

create policy learning_review_sessions_select_own
  on public.learning_review_sessions for select to authenticated
  using (auth.uid() = owner_user_id);
create policy learning_review_attempts_select_own
  on public.learning_review_attempts for select to authenticated
  using (auth.uid() = owner_user_id);

revoke all privileges on table public.learning_review_sessions
  from public, anon, authenticated;
revoke all privileges on table public.learning_review_attempts
  from public, anon, authenticated;

grant select on table public.learning_review_sessions to authenticated;
grant select on table public.learning_review_attempts to authenticated;

grant select, insert, update, delete on table public.learning_review_sessions
  to service_role;
grant select, insert, update, delete on table public.learning_review_attempts
  to service_role;

-- Completing an immediate lesson schedules each immutable target item once per
-- completion. If the same item is already due earlier, a new exposure must not
-- push that review farther into the future.
create or replace function public.schedule_lesson_v2_target_reviews()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.learning_item_states (
      owner_user_id,
      item_key,
      exposure_count,
      attempt_count,
      successful_retrievals,
      last_outcome,
      last_seen_at,
      next_review_at,
      source_lesson_version_id,
      last_delayed_transfer_at
    )
    select distinct
      new.owner_user_id,
      target ->> 'itemKey',
      1,
      0,
      0,
      null,
      now(),
      now() + interval '1 day',
      new.lesson_version_id,
      null
    from public.lesson_versions version
    cross join lateral jsonb_array_elements(
      coalesce(version.blueprint -> 'targetItems', '[]'::jsonb)
    ) target
    where version.id = new.lesson_version_id
      and version.owner_user_id = new.owner_user_id
      and length(coalesce(target ->> 'itemKey', '')) between 1 and 160
    on conflict (owner_user_id, item_key) do update
      set exposure_count = public.learning_item_states.exposure_count + 1,
          last_seen_at = excluded.last_seen_at,
          next_review_at = case
            when public.learning_item_states.next_review_at is null
              then excluded.next_review_at
            else least(
              public.learning_item_states.next_review_at,
              excluded.next_review_at
            )
          end,
          source_lesson_version_id = excluded.source_lesson_version_id;
  end if;
  return new;
end;
$$;

revoke all on function public.schedule_lesson_v2_target_reviews()
  from public, anon, authenticated;

create trigger lesson_sessions_schedule_delayed_review
  after update of status on public.lesson_sessions
  for each row execute function public.schedule_lesson_v2_target_reviews();

create or replace function public.start_learning_review_session(
  p_owner_user_id uuid,
  p_item_key text,
  p_variant_id text
)
returns table (
  review_session_id uuid,
  session_status text,
  current_step text,
  scheduled_for timestamptz,
  variant_id text,
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
  v_item public.learning_item_states%rowtype;
  v_session public.learning_review_sessions%rowtype;
  v_created boolean := false;
begin
  if p_variant_id !~ '^[a-z][a-z0-9_-]{2,63}$' then
    raise exception 'invalid review variant id';
  end if;

  select * into v_item
  from public.learning_item_states
  where owner_user_id = p_owner_user_id
    and item_key = p_item_key
  for update;

  if v_item.item_key is null then
    raise exception 'owned scheduled review item not found';
  end if;

  select * into v_session
  from public.learning_review_sessions
  where owner_user_id = p_owner_user_id
    and item_key = p_item_key
    and status = 'in_progress'
  order by updated_at desc
  limit 1
  for update;

  if v_session.id is not null then
    if v_session.variant_id <> p_variant_id then
      raise exception 'active review session belongs to another variant';
    end if;
    return query select
      v_session.id,
      v_session.status,
      v_session.current_step,
      v_session.scheduled_for,
      v_session.variant_id,
      v_session.started_at,
      v_session.completed_at,
      v_session.updated_at,
      false;
    return;
  end if;

  if v_item.next_review_at is null or v_item.next_review_at > now() then
    raise exception 'learning review item is not due yet';
  end if;

  insert into public.learning_review_sessions (
    owner_user_id,
    item_key,
    source_lesson_version_id,
    scheduled_for,
    variant_id,
    status,
    current_step
  ) values (
    p_owner_user_id,
    p_item_key,
    v_item.source_lesson_version_id,
    v_item.next_review_at,
    p_variant_id,
    'in_progress',
    'recall'
  )
  returning * into v_session;
  v_created := true;

  return query select
    v_session.id,
    v_session.status,
    v_session.current_step,
    v_session.scheduled_for,
    v_session.variant_id,
    v_session.started_at,
    v_session.completed_at,
    v_session.updated_at,
    v_created;
end;
$$;

create or replace function public.record_learning_review_attempt(
  p_owner_user_id uuid,
  p_review_session_id uuid,
  p_step text,
  p_idempotency_key uuid,
  p_response jsonb,
  p_evaluation jsonb,
  p_advance boolean default false,
  p_complete boolean default false,
  p_outcome text default null
)
returns table (
  review_attempt_id uuid,
  attempt_number integer,
  session_status text,
  current_step text,
  completed_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.learning_review_sessions%rowtype;
  v_existing public.learning_review_attempts%rowtype;
  v_attempt public.learning_review_attempts%rowtype;
  v_attempt_number integer;
  v_confirmed boolean;
  v_has_successful_recall boolean;
begin
  if p_step not in ('recall', 'transfer') then
    raise exception 'invalid learning review step';
  end if;
  if jsonb_typeof(p_response) <> 'object' or jsonb_typeof(p_evaluation) <> 'object' then
    raise exception 'review response and evaluation must be objects';
  end if;
  if coalesce(p_evaluation ->> 'step', '') <> p_step then
    raise exception 'review evaluation does not match the current step';
  end if;

  select * into v_session
  from public.learning_review_sessions
  where id = p_review_session_id
    and owner_user_id = p_owner_user_id
  for update;

  if v_session.id is null then
    raise exception 'owned learning review session not found';
  end if;

  -- Resolve the owned idempotency key before mutable progression checks. A
  -- network retry may arrive after the original attempt advanced/completed.
  select * into v_existing
  from public.learning_review_attempts
  where owner_user_id = p_owner_user_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.review_session_id <> p_review_session_id
      or v_existing.step <> p_step then
      raise exception 'idempotency key belongs to another review attempt';
    end if;
    return query select
      v_existing.id,
      v_existing.attempt_number,
      v_session.status,
      v_session.current_step,
      v_session.completed_at,
      false;
    return;
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'learning review session is not active';
  end if;
  if v_session.current_step <> p_step then
    raise exception 'review step is not current for this session';
  end if;

  if p_step = 'recall' then
    if coalesce(p_evaluation ->> 'verdict', '') not in ('correct', 'incorrect') then
      raise exception 'invalid delayed recall verdict';
    end if;
    if p_complete or p_outcome is not null then
      raise exception 'delayed recall cannot complete the review session';
    end if;
    if p_advance <> ((p_evaluation ->> 'verdict') = 'correct') then
      raise exception 'delayed recall advance must match correctness';
    end if;
  else
    if coalesce(p_evaluation ->> 'verdict', '') <> 'self_check' then
      raise exception 'invalid delayed transfer verdict';
    end if;
    if coalesce(p_evaluation ->> 'confirmed', '') not in ('true', 'false') then
      raise exception 'delayed transfer confirmation must be boolean';
    end if;
    v_confirmed := (p_evaluation ->> 'confirmed')::boolean;
    if p_advance then
      raise exception 'delayed transfer does not use recall advance';
    end if;
    if p_complete <> v_confirmed then
      raise exception 'delayed transfer completion must match confirmation';
    end if;
    if p_complete and p_outcome not in ('hard', 'good') then
      raise exception 'completed delayed transfer requires hard or good outcome';
    end if;
    if not p_complete and p_outcome is not null then
      raise exception 'incomplete delayed transfer cannot set an outcome';
    end if;
    if p_complete then
      select exists (
        select 1
        from public.learning_review_attempts attempt
        where attempt.review_session_id = p_review_session_id
          and attempt.owner_user_id = p_owner_user_id
          and attempt.step = 'recall'
          and attempt.evaluation ->> 'verdict' = 'correct'
      ) into v_has_successful_recall;
      if not v_has_successful_recall then
        raise exception 'delayed transfer cannot complete before successful recall';
      end if;
    end if;
  end if;

  select coalesce(max(learning_review_attempts.attempt_number), 0) + 1
    into v_attempt_number
  from public.learning_review_attempts
  where review_session_id = p_review_session_id
    and step = p_step;

  insert into public.learning_review_attempts (
    review_session_id,
    owner_user_id,
    step,
    attempt_number,
    idempotency_key,
    response,
    evaluation
  ) values (
    p_review_session_id,
    p_owner_user_id,
    p_step,
    v_attempt_number,
    p_idempotency_key,
    p_response,
    p_evaluation
  )
  returning * into v_attempt;

  update public.learning_item_states
  set attempt_count = attempt_count + 1,
      successful_retrievals = successful_retrievals + case
        when p_step = 'recall' and p_evaluation ->> 'verdict' = 'correct' then 1
        else 0
      end,
      last_seen_at = now(),
      last_outcome = case when p_complete then p_outcome else last_outcome end,
      last_delayed_transfer_at = case
        when p_complete then now() else last_delayed_transfer_at
      end,
      next_review_at = case
        when p_complete and p_outcome = 'good' then now() + interval '3 days'
        when p_complete and p_outcome = 'hard' then now() + interval '1 day'
        else next_review_at
      end
  where owner_user_id = p_owner_user_id
    and item_key = v_session.item_key;

  if not found then
    raise exception 'scheduled review item disappeared';
  end if;

  update public.learning_review_sessions
  set status = case when p_complete then 'completed' else 'in_progress' end,
      current_step = case
        when p_complete then 'completed'
        when p_step = 'recall' and p_advance then 'transfer'
        else p_step
      end,
      completed_at = case when p_complete then now() else null end,
      updated_at = now()
  where id = p_review_session_id
  returning * into v_session;

  return query select
    v_attempt.id,
    v_attempt.attempt_number,
    v_session.status,
    v_session.current_step,
    v_session.completed_at,
    true;
end;
$$;

revoke all on function public.start_learning_review_session(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.record_learning_review_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, boolean, boolean, text
) from public, anon, authenticated;

grant execute on function public.start_learning_review_session(uuid, text, text)
  to service_role;
grant execute on function public.record_learning_review_attempt(
  uuid, uuid, text, uuid, jsonb, jsonb, boolean, boolean, text
) to service_role;
