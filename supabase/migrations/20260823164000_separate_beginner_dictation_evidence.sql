-- Dictation is useful listening/orthographic evidence, but it is not the same
-- capability as independently producing a target word. The previous challenge
-- RPC ignored the server-owned challenge kind, so a perfect no-support
-- dictation could set `last_independent_at`; `learner_known_words()` would then
-- treat that word as productive-known and widen the beginner comprehensibility
-- gate on the wrong evidence dimension.
--
-- Keep the existing productive fields intact and add bounded dictation evidence
-- alongside them. Historical aggregate rows are deliberately not rewritten:
-- old rows do not contain enough provenance to prove which prior write created
-- `last_independent_at`, and guessing would manufacture learner history.

alter table public.learning_item_states
  add column successful_dictations integer not null default 0,
  add column last_successful_dictation_at timestamptz,
  add column last_independent_dictation_at timestamptz;

alter table public.learning_item_states
  add constraint learning_item_states_dictation_count_nonnegative
  check (successful_dictations >= 0);

-- Remove the old three-argument function entirely so neither service code nor a
-- stale caller can keep using the modality-collapsing contract.
drop function public.record_beginner_challenge_evidence(uuid, uuid, boolean);

create function public.record_beginner_challenge_evidence(
  p_owner_user_id uuid,
  p_challenge_id uuid,
  p_successful boolean,
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

  if p_independent and not p_successful then
    raise exception 'independent beginner evidence must be successful';
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
    successful_dictations,
    last_seen_at,
    last_independent_at,
    last_successful_dictation_at,
    last_independent_dictation_at
  ) values (
    p_owner_user_id,
    lower(v_challenge.target_word),
    'beginner_input',
    null,
    1,
    1,
    case
      when v_challenge.kind = 'introduce_word' and p_independent then 1
      else 0
    end,
    case
      when v_challenge.kind = 'dictation' and p_successful then 1
      else 0
    end,
    now(),
    case
      when v_challenge.kind = 'introduce_word' and p_independent then now()
      else null
    end,
    case
      when v_challenge.kind = 'dictation' and p_successful then now()
      else null
    end,
    case
      when v_challenge.kind = 'dictation' and p_independent then now()
      else null
    end
  )
  on conflict (owner_user_id, item_key) do update set
    exposure_count = public.learning_item_states.exposure_count + 1,
    attempt_count = public.learning_item_states.attempt_count + 1,
    successful_retrievals = public.learning_item_states.successful_retrievals
      + case
          when v_challenge.kind = 'introduce_word' and p_independent then 1
          else 0
        end,
    successful_dictations = public.learning_item_states.successful_dictations
      + case
          when v_challenge.kind = 'dictation' and p_successful then 1
          else 0
        end,
    last_seen_at = now(),
    last_independent_at = case
      when v_challenge.kind = 'introduce_word' and p_independent then now()
      else public.learning_item_states.last_independent_at
    end,
    last_successful_dictation_at = case
      when v_challenge.kind = 'dictation' and p_successful then now()
      else public.learning_item_states.last_successful_dictation_at
    end,
    last_independent_dictation_at = case
      when v_challenge.kind = 'dictation' and p_independent then now()
      else public.learning_item_states.last_independent_dictation_at
    end
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.record_beginner_challenge_evidence(uuid, uuid, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.record_beginner_challenge_evidence(uuid, uuid, boolean, boolean)
  to service_role;
