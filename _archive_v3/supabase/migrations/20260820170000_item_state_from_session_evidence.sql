-- VLR-201. Item state is meant to say what a learner has done with an item, and
-- it did not: the completion trigger wrote `attempt_count` and
-- `successful_retrievals` as literal zeros, and nothing in the lesson path ever
-- updated them. Only the delayed-review RPC moved them afterwards, so an item
-- the learner had attempted, recalled and reused inside the session still
-- looked untouched until its first review.
--
-- Two dimensions the plan asks for had nowhere to live at all:
--
--   last_independent_at   -- last correct production with no support open
--   transfer_succeeded_at -- last confirmed changed-context reuse
--
-- `last_independent_at` is the one that matters most. Completion is not mastery
-- and a due date is not capability; producing the item correctly with no help
-- open is the closest thing the product observes to independent use, and until
-- now nothing recorded when it happened.

alter table public.learning_item_states
  add column if not exists last_independent_at timestamptz,
  add column if not exists transfer_succeeded_at timestamptz;

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
      last_delayed_transfer_at,
      last_independent_at,
      transfer_succeeded_at
    )
    select distinct on (target ->> 'itemKey')
      new.owner_user_id,
      target ->> 'itemKey',
      1,
      evidence.attempt_count,
      evidence.successful_retrievals,
      null::text,
      now(),
      now() + interval '1 day',
      new.lesson_version_id,
      null::timestamptz,
      evidence.last_independent_at,
      evidence.transfer_succeeded_at
    from public.lesson_versions version
    cross join lateral jsonb_array_elements(
      coalesce(version.blueprint -> 'targetItems', '[]'::jsonb)
    ) target
    cross join lateral (
      -- Everything below is read from rows this session already wrote. Nothing
      -- here is a new claim about the learner; it is the evidence that was
      -- always there and never reached the item.
      select
        count(*) filter (where attempt.id is not null) as attempt_count,
        count(*) filter (
          where attempt.evaluation ->> 'verdict' = 'correct'
        ) as successful_retrievals,
        max(attempt.submitted_at) filter (
          where attempt.evaluation ->> 'verdict' = 'correct'
            and not exists (
              select 1
              from public.learning_support_events support
              where support.session_id = new.id
                and support.activity_id = attempt.activity_id
                and support.event_kind = 'support_opened'
                and support.occurred_at <= attempt.submitted_at
            )
        ) as last_independent_at,
        max(attempt.submitted_at) filter (
          where activity.value ->> 'activityType' = 'guided_transfer'
            and attempt.evaluation ->> 'verdict' in ('correct', 'self_check')
        ) as transfer_succeeded_at
      from jsonb_array_elements(
        coalesce(version.blueprint -> 'activities', '[]'::jsonb)
      ) activity
      join public.activity_attempts attempt
        on attempt.session_id = new.id
       and attempt.activity_id = activity.value ->> 'id'
      where (activity.value ->> 'targetItemId') = (target ->> 'id')
         or (
           activity.value -> 'targetItemIds' is not null
           and activity.value -> 'targetItemIds' @> to_jsonb(target ->> 'id')
         )
    ) evidence
    where version.id = new.lesson_version_id
      and version.owner_user_id = new.owner_user_id
      and length(coalesce(target ->> 'itemKey', '')) between 1 and 160
    -- Deterministic pick when a blueprint lists the same itemKey twice: without
    -- an order, `distinct on` chooses arbitrarily, and two rows carrying the
    -- same key would make one statement touch a row twice and fail outright.
    order by
      target ->> 'itemKey',
      evidence.successful_retrievals desc,
      evidence.attempt_count desc
    on conflict (owner_user_id, item_key) do update
      set exposure_count = public.learning_item_states.exposure_count + 1,
          attempt_count =
            public.learning_item_states.attempt_count + excluded.attempt_count,
          successful_retrievals =
            public.learning_item_states.successful_retrievals
              + excluded.successful_retrievals,
          last_seen_at = excluded.last_seen_at,
          -- Only ever moves forward. An item produced independently once has
          -- been produced independently, and a later session where the learner
          -- needed help does not undo that.
          last_independent_at = greatest(
            public.learning_item_states.last_independent_at,
            excluded.last_independent_at
          ),
          transfer_succeeded_at = greatest(
            public.learning_item_states.transfer_succeeded_at,
            excluded.transfer_succeeded_at
          ),
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
