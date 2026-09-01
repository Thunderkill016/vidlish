-- The application proposes `good` vs `hard`, but PostgreSQL must not trust a
-- precomputed capability/scheduler outcome from service-role code. Derive the
-- allowed outcome from the persisted recall history of the active review.
--
-- `good` = the first delayed recall attempt was correct.
-- `hard` = recall succeeded only after one or more earlier attempts.

create or replace function public.validate_learning_review_outcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_session_id uuid;
  v_recall_attempts integer;
  v_successful_recall boolean;
  v_expected_outcome text;
begin
  -- Ordinary attempt-count/last-seen updates name these columns in the RPC but
  -- preserve their values. Only a newly recorded delayed-transfer timestamp is
  -- a capability-evidence transition that needs this validation.
  if new.last_delayed_transfer_at is not distinct from old.last_delayed_transfer_at then
    return new;
  end if;

  if new.last_delayed_transfer_at is null then
    raise exception 'delayed transfer evidence cannot be cleared through review progression';
  end if;

  select review.id into v_review_session_id
  from public.learning_review_sessions review
  where review.owner_user_id = new.owner_user_id
    and review.item_key = new.item_key
    and review.status = 'in_progress'
    and review.current_step = 'transfer'
  order by review.updated_at desc
  limit 1;

  if v_review_session_id is null then
    raise exception 'delayed transfer evidence requires an active transfer review session';
  end if;

  select
    count(*)::integer,
    coalesce(bool_or(attempt.evaluation ->> 'verdict' = 'correct'), false)
  into v_recall_attempts, v_successful_recall
  from public.learning_review_attempts attempt
  where attempt.review_session_id = v_review_session_id
    and attempt.owner_user_id = new.owner_user_id
    and attempt.step = 'recall';

  if v_recall_attempts < 1 or not v_successful_recall then
    raise exception 'delayed transfer evidence requires successful delayed recall';
  end if;

  v_expected_outcome := case when v_recall_attempts = 1 then 'good' else 'hard' end;
  if new.last_outcome is distinct from v_expected_outcome then
    raise exception 'delayed review outcome does not match persisted recall history';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_learning_review_outcome()
  from public, anon, authenticated;

create trigger learning_item_states_validate_delayed_review_outcome
  before update of last_delayed_transfer_at, last_outcome
  on public.learning_item_states
  for each row execute function public.validate_learning_review_outcome();
