-- The scheduling half of Learning Model v2 has been inert since it was created:
-- `learning_item_states` exists, carries a due index on
-- (owner_user_id, next_review_at), and nothing in the application has ever
-- written a row to it. Spaced repetition without persisted state is a table.
--
-- FSRS cannot run in Postgres, so the application computes the next state and
-- this function persists it. That split is deliberate: the algorithm stays where
-- it can be tested and swapped, and the database stays the record of when an
-- item is next due.

alter table public.learning_item_states
  add column review_state jsonb;

-- `is not distinct from`, not `=`. A missing key makes `->>` return NULL, and
-- `NULL = 'review-state:v1'` is NULL, which CHECK accepts — so the plain
-- equality form would wave through exactly the malformed rows it exists to
-- reject. This same bug shipped twice in this schema before it was caught.
alter table public.learning_item_states
  add constraint learning_item_states_review_state_version
    check (
      review_state is null
      or (review_state ->> 'version') is not distinct from 'review-state:v1'
    );

create or replace function public.upsert_learning_item_state(
  p_owner_user_id uuid,
  p_item_key text,
  p_source_lesson_version_id uuid,
  p_last_outcome text,
  p_next_review_at timestamptz,
  p_review_state jsonb,
  p_successful boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The caller owns the lesson version or it owns nothing. Without this the
  -- function would let any authenticated user pin item state to someone else's
  -- lesson, since security definer bypasses the table's own policies.
  if not exists (
    select 1
    from public.lesson_versions
    where id = p_source_lesson_version_id
      and owner_user_id = p_owner_user_id
  ) then
    raise exception 'owned lesson version not found';
  end if;

  insert into public.learning_item_states (
    owner_user_id,
    item_key,
    exposure_count,
    attempt_count,
    successful_retrievals,
    last_outcome,
    last_seen_at,
    next_review_at,
    review_state,
    source_lesson_version_id
  )
  values (
    p_owner_user_id,
    p_item_key,
    1,
    1,
    case when p_successful then 1 else 0 end,
    p_last_outcome,
    now(),
    p_next_review_at,
    p_review_state,
    p_source_lesson_version_id
  )
  -- Targeted by constraint name rather than by column list. A bare
  -- `on conflict (owner_user_id, item_key)` reads those identifiers against the
  -- function's own scope first, and that ambiguity is what broke every call to
  -- save_lesson_progress the last time this pattern was written.
  on conflict on constraint learning_item_states_pkey do update
  set
    exposure_count = public.learning_item_states.exposure_count + 1,
    attempt_count = public.learning_item_states.attempt_count + 1,
    successful_retrievals =
      public.learning_item_states.successful_retrievals
      + case when p_successful then 1 else 0 end,
    last_outcome = excluded.last_outcome,
    last_seen_at = excluded.last_seen_at,
    next_review_at = excluded.next_review_at,
    review_state = excluded.review_state,
    source_lesson_version_id = excluded.source_lesson_version_id;
end;
$$;

revoke all privileges on function public.upsert_learning_item_state(
  uuid, text, uuid, text, timestamptz, jsonb, boolean
) from public, anon, authenticated;

grant execute on function public.upsert_learning_item_state(
  uuid, text, uuid, text, timestamptz, jsonb, boolean
) to service_role;
