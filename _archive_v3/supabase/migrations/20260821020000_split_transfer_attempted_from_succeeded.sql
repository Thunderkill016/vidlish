-- `transfer_succeeded_at` overclaimed. It was set for any attempt whose verdict
-- was `self_check`, and a self-check verdict means the learner submitted one —
-- not that they met the criteria. So the column recorded attempting the task
-- and called it succeeding, which is the exact shape of claim this product is
-- built to refuse.
--
-- Split in two. `transfer_attempted_at` is any attempt on a changed-context
-- activity. `transfer_succeeded_at` needs the learner to have confirmed every
-- criterion the activity set, or a graded-correct verdict.

alter table public.learning_item_states
  add column if not exists transfer_attempted_at timestamptz;

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
      transfer_attempted_at,
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
      evidence.transfer_attempted_at,
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
        ) as transfer_attempted_at,
        max(attempt.submitted_at) filter (
          where activity.value ->> 'activityType' = 'guided_transfer'
            and (
              attempt.evaluation ->> 'verdict' = 'correct'
              or (
                -- A self-check counts only when the learner confirmed every
                -- criterion the activity set. Submitting one is attempting the
                -- task; meeting the criteria is the claim.
                jsonb_typeof(attempt.response -> 'checkedCriteria') = 'array'
                and jsonb_typeof(
                  activity.value -> 'evaluation' -> 'criteriaVi'
                ) = 'array'
                and jsonb_array_length(attempt.response -> 'checkedCriteria')
                  >= jsonb_array_length(
                    activity.value -> 'evaluation' -> 'criteriaVi'
                  )
              )
            )
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
          transfer_attempted_at = greatest(
            public.learning_item_states.transfer_attempted_at,
            excluded.transfer_attempted_at
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
