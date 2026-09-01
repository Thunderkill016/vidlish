-- `SELECT DISTINCT` resolves bare NULL literals before the INSERT target can
-- coerce them. Keep the scheduler trigger strongly typed so last_outcome and
-- delayed-transfer evidence cannot be inferred as text by PostgreSQL.

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
      null::text,
      now(),
      now() + interval '1 day',
      new.lesson_version_id,
      null::timestamptz
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
