-- Feature 021. `transfer_succeeded_at` was still stronger than the evidence that
-- produced it. The lesson runtime's guided_transfer activity is self-check only:
-- the learner writes an open response and confirms criteria, while the server
-- deliberately refuses to label that response correct or incorrect. Historical
-- item state nevertheless stored a fully checked self-check as "succeeded".
--
-- Keep the two claims separate. `transfer_self_checked_at` records the bounded
-- self-check fact. `transfer_succeeded_at` is rebuilt from objective `correct`
-- outcomes only and remains available for a future objectively graded transfer
-- task. Raw attempts + immutable lesson blueprints are the migration authority;
-- the old aggregate timestamp is not trusted during the rebuild.

alter table public.learning_item_states
  add column if not exists transfer_self_checked_at timestamptz;

-- Clear the overclaimed aggregate before rebuilding both dimensions from the
-- durable source rows. Delayed-review transfer is separate and remains in
-- `last_delayed_transfer_at`; this rebuild only concerns immediate lesson
-- guided-transfer evidence.
update public.learning_item_states
set transfer_self_checked_at = null,
    transfer_succeeded_at = null
where transfer_self_checked_at is not null
   or transfer_succeeded_at is not null;

with rebuilt_transfer as (
  select
    state.owner_user_id,
    state.item_key,
    max(attempt.submitted_at) filter (
      where activity.value ->> 'activityType' = 'guided_transfer'
        and attempt.evaluation ->> 'verdict' = 'self_check'
        and jsonb_typeof(attempt.evaluation -> 'checkedCriteria') = 'array'
        and jsonb_typeof(
          activity.value -> 'evaluation' -> 'criteriaVi'
        ) = 'array'
        and jsonb_array_length(
          activity.value -> 'evaluation' -> 'criteriaVi'
        ) > 0
        and jsonb_array_length(attempt.evaluation -> 'checkedCriteria')
          >= jsonb_array_length(
            activity.value -> 'evaluation' -> 'criteriaVi'
          )
    ) as transfer_self_checked_at,
    max(attempt.submitted_at) filter (
      where activity.value ->> 'activityType' = 'guided_transfer'
        and attempt.evaluation ->> 'verdict' = 'correct'
    ) as transfer_succeeded_at
  from public.learning_item_states state
  join public.lesson_versions version
    on version.owner_user_id = state.owner_user_id
  join public.lesson_sessions session
    on session.owner_user_id = state.owner_user_id
   and session.lesson_version_id = version.id
   and session.status = 'completed'
  cross join lateral jsonb_array_elements(
    coalesce(version.blueprint -> 'targetItems', '[]'::jsonb)
  ) target
  cross join lateral jsonb_array_elements(
    coalesce(version.blueprint -> 'activities', '[]'::jsonb)
  ) activity
  join public.activity_attempts attempt
    on attempt.owner_user_id = state.owner_user_id
   and attempt.session_id = session.id
   and attempt.activity_id = activity.value ->> 'id'
  where target ->> 'itemKey' = state.item_key
    and (
      activity.value ->> 'targetItemId' = target ->> 'id'
      or (
        activity.value -> 'targetItemIds' is not null
        and activity.value -> 'targetItemIds' @> to_jsonb(target ->> 'id')
      )
    )
  group by state.owner_user_id, state.item_key
)
update public.learning_item_states state
set transfer_self_checked_at = rebuilt.transfer_self_checked_at,
    transfer_succeeded_at = rebuilt.transfer_succeeded_at
from rebuilt_transfer rebuilt
where state.owner_user_id = rebuilt.owner_user_id
  and state.item_key = rebuilt.item_key;

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
      transfer_self_checked_at,
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
      evidence.transfer_self_checked_at,
      evidence.transfer_succeeded_at
    from public.lesson_versions version
    cross join lateral jsonb_array_elements(
      coalesce(version.blueprint -> 'targetItems', '[]'::jsonb)
    ) target
    cross join lateral (
      select
        count(*) filter (where attempt.id is not null) as attempt_count,
        count(*) filter (
          where activity.value ->> 'activityType' = 'chunk_recall'
            and attempt.evaluation ->> 'verdict' = 'correct'
        ) as successful_retrievals,
        max(attempt.submitted_at) filter (
          where activity.value ->> 'activityType' = 'chunk_recall'
            and attempt.evaluation ->> 'verdict' = 'correct'
            and activity.value ->> 'hintVi' is null
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
            and attempt.evaluation ->> 'verdict' = 'self_check'
            and jsonb_typeof(attempt.evaluation -> 'checkedCriteria') = 'array'
            and jsonb_typeof(
              activity.value -> 'evaluation' -> 'criteriaVi'
            ) = 'array'
            and jsonb_array_length(
              activity.value -> 'evaluation' -> 'criteriaVi'
            ) > 0
            and jsonb_array_length(attempt.evaluation -> 'checkedCriteria')
              >= jsonb_array_length(
                activity.value -> 'evaluation' -> 'criteriaVi'
              )
        ) as transfer_self_checked_at,
        max(attempt.submitted_at) filter (
          where activity.value ->> 'activityType' = 'guided_transfer'
            and attempt.evaluation ->> 'verdict' = 'correct'
        ) as transfer_succeeded_at
      from jsonb_array_elements(
        coalesce(version.blueprint -> 'activities', '[]'::jsonb)
      ) activity
      join public.activity_attempts attempt
        on attempt.session_id = new.id
       and attempt.activity_id = activity.value ->> 'id'
      where activity.value ->> 'targetItemId' = target ->> 'id'
         or (
           activity.value -> 'targetItemIds' is not null
           and activity.value -> 'targetItemIds' @> to_jsonb(target ->> 'id')
         )
    ) evidence
    where version.id = new.lesson_version_id
      and version.owner_user_id = new.owner_user_id
      and length(coalesce(target ->> 'itemKey', '')) between 1 and 160
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
          last_independent_at = greatest(
            public.learning_item_states.last_independent_at,
            excluded.last_independent_at
          ),
          transfer_attempted_at = greatest(
            public.learning_item_states.transfer_attempted_at,
            excluded.transfer_attempted_at
          ),
          transfer_self_checked_at = greatest(
            public.learning_item_states.transfer_self_checked_at,
            excluded.transfer_self_checked_at
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
