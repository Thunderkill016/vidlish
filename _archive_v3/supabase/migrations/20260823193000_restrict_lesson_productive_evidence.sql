-- Feature 017. The legacy item-state projection used every correct lesson
-- attempt attached to a target item as productive retrieval evidence. That made
-- a recognition task such as `meaning_in_context` increment
-- `successful_retrievals` and, when no support row existed, set
-- `last_independent_at` as though the learner had produced the language.
--
-- The four-skill capability projector already refuses that claim. Keep the
-- legacy review state aligned with it: only objectively checked `chunk_recall`
-- is productive retrieval. A correct recall can count as a successful retrieval
-- even when supported, but it becomes independent only when no support was
-- opened before the attempt AND the immutable activity did not ship with a
-- hint. Until runtime evidence can prove an immutable hint stayed hidden, its
-- presence is support.
--
-- This migration intentionally does not rewrite historical aggregate rows.
-- Existing `learning_item_states` combine lesson-session evidence with delayed
-- reviews, so subtracting old recognition attempts could erase legitimate later
-- retrieval evidence. The safe boundary is to stop future pollution and retain
-- the raw durable attempts for any future audited rebuild.

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
      select
        -- Attempt count remains generic item interaction history. Productive
        -- evidence is deliberately narrower below.
        count(*) filter (where attempt.id is not null) as attempt_count,
        count(*) filter (
          where activity.value ->> 'activityType' = 'chunk_recall'
            and attempt.evaluation ->> 'verdict' = 'correct'
        ) as successful_retrievals,
        max(attempt.submitted_at) filter (
          where activity.value ->> 'activityType' = 'chunk_recall'
            and attempt.evaluation ->> 'verdict' = 'correct'
            -- JSON null or a missing hint both become SQL NULL here. Any
            -- non-null immutable hint is conservatively supported because the
            -- durable event stream cannot prove it stayed hidden.
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
            and (
              attempt.evaluation ->> 'verdict' = 'correct'
              or (
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
