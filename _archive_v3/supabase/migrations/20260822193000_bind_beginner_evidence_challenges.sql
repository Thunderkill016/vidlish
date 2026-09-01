-- Beginner capability evidence is durable and feeds the comprehensibility gate.
-- The previous RPC accepted an arbitrary word + independence boolean and was
-- executable by `authenticated`, while the route accepted its answer key from
-- the browser. That made "server-decided evidence" a client-controlled claim.
--
-- A challenge is the server-owned fact the attempt refers to. The browser may
-- know the learner-visible sentence, but it cannot invent a different target or
-- answer key and have the database bank it. Challenges are deliberately not
-- readable/writable through browser RLS policies.

create table public.beginner_evidence_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  target_word text not null,
  sentence_text text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours'),
  consumed_at timestamptz,
  constraint beginner_evidence_challenges_kind
    check (kind in ('introduce_word', 'dictation')),
  constraint beginner_evidence_challenges_target_word
    check (char_length(target_word) between 1 and 64),
  constraint beginner_evidence_challenges_sentence_shape check (
    (kind = 'introduce_word' and sentence_text is null)
    or
    (kind = 'dictation' and sentence_text is not null
      and char_length(sentence_text) between 1 and 200)
  ),
  constraint beginner_evidence_challenges_expiry
    check (expires_at > created_at),
  constraint beginner_evidence_challenges_consumed_after_create
    check (consumed_at is null or consumed_at >= created_at)
);

create index beginner_evidence_challenges_owner_active
  on public.beginner_evidence_challenges (owner_user_id, expires_at)
  where consumed_at is null;

alter table public.beginner_evidence_challenges enable row level security;

-- No authenticated policies. This table is server authority, not learner state
-- that the browser is entitled to query. The service role is the only runtime
-- role that creates/reads challenges.
revoke all on table public.beginner_evidence_challenges from public;
revoke all on table public.beginner_evidence_challenges from anon;
revoke all on table public.beginner_evidence_challenges from authenticated;
grant select, insert, update, delete
  on table public.beginner_evidence_challenges to service_role;

-- One transaction owns both single-use consumption and the evidence upsert.
-- A request can read/score a challenge in application code first, but only this
-- function decides whether it is still available when evidence is committed.
create or replace function public.record_beginner_challenge_evidence(
  p_owner_user_id uuid,
  p_challenge_id uuid,
  p_independent boolean
)
returns public.learning_item_states
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge public.beginner_evidence_challenges;
  v_row public.learning_item_states;
begin
  if p_owner_user_id is null or p_challenge_id is null then
    raise exception 'beginner evidence challenge is not available';
  end if;

  select *
    into v_challenge
  from public.beginner_evidence_challenges
  where id = p_challenge_id
    and owner_user_id = p_owner_user_id
    and consumed_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'beginner evidence challenge is not available';
  end if;

  update public.beginner_evidence_challenges
  set consumed_at = now()
  where id = v_challenge.id;

  insert into public.learning_item_states (
    owner_user_id,
    item_key,
    origin,
    source_lesson_version_id,
    exposure_count,
    attempt_count,
    successful_retrievals,
    last_seen_at,
    last_independent_at
  ) values (
    p_owner_user_id,
    lower(v_challenge.target_word),
    'beginner_input',
    null,
    1,
    1,
    case when p_independent then 1 else 0 end,
    now(),
    case when p_independent then now() else null end
  )
  on conflict (owner_user_id, item_key) do update set
    exposure_count = public.learning_item_states.exposure_count + 1,
    attempt_count = public.learning_item_states.attempt_count + 1,
    successful_retrievals = public.learning_item_states.successful_retrievals
      + case when p_independent then 1 else 0 end,
    last_seen_at = now(),
    last_independent_at = case
      when p_independent then now()
      else public.learning_item_states.last_independent_at
    end
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.record_beginner_challenge_evidence(uuid, uuid, boolean) from public;
revoke all on function public.record_beginner_challenge_evidence(uuid, uuid, boolean) from anon;
revoke all on function public.record_beginner_challenge_evidence(uuid, uuid, boolean) from authenticated;
grant execute on function public.record_beginner_challenge_evidence(uuid, uuid, boolean) to service_role;

-- Calibration used to be browser-executable and therefore defended itself with
-- `auth.uid()`. The beginner repository, however, is intentionally composed
-- with the server admin/secret client; once browser EXECUTE is revoked there is
-- no user JWT at this boundary. Keep the verdict calculation in application
-- code and make this persistence primitive service-only instead of depending on
-- an auth claim the server client does not carry.
create or replace function public.record_learner_calibration(
  p_owner_user_id uuid,
  p_word_trials integer,
  p_nonword_trials integer,
  p_hits integer,
  p_false_alarms integer,
  p_reliable boolean
)
returns public.learner_calibrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.learner_calibrations;
begin
  if p_owner_user_id is null then
    raise exception 'calibration owner is required';
  end if;

  insert into public.learner_calibrations (
    owner_user_id, word_trials, nonword_trials, hits, false_alarms, reliable
  ) values (
    p_owner_user_id, p_word_trials, p_nonword_trials, p_hits, p_false_alarms,
    p_reliable
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- The legacy arbitrary-word evidence function is retained only for migration
-- history/internal compatibility. No learner route uses it after this feature,
-- and browser roles must not be able to call it.
revoke execute on function public.record_beginner_word_evidence(uuid, text, boolean) from authenticated;
grant execute on function public.record_beginner_word_evidence(uuid, text, boolean) to service_role;

revoke execute on function public.record_learner_calibration(uuid, integer, integer, integer, integer, boolean) from public;
revoke execute on function public.record_learner_calibration(uuid, integer, integer, integer, integer, boolean) from anon;
revoke execute on function public.record_learner_calibration(uuid, integer, integer, integer, integer, boolean) from authenticated;
grant execute on function public.record_learner_calibration(uuid, integer, integer, integer, integer, boolean) to service_role;

-- This function is SECURITY DEFINER and accepts an owner id. It previously had
-- no auth.uid check, so an authenticated caller could ask for another learner's
-- capability set. All application reads already happen server-side through the
-- admin repository, so remove the browser bypass instead of adding a second
-- client-facing capability API accidentally.
revoke execute on function public.learner_known_words(uuid) from authenticated;
grant execute on function public.learner_known_words(uuid) to service_role;
