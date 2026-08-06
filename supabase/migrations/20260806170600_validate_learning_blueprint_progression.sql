-- The full lesson contract is validated by the application. PostgreSQL also
-- validates the subset required to make session progression deterministic and
-- safe: ordered activities with unique IDs and nondecreasing learning phases.

create or replace function public.learning_v2_blueprint_progression_valid(
  p_blueprint jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = public
as $$
declare
  v_activity_count integer;
begin
  if jsonb_typeof(p_blueprint -> 'activities') <> 'array' then
    return false;
  end if;

  v_activity_count := jsonb_array_length(p_blueprint -> 'activities');
  if v_activity_count < 1 or v_activity_count > 12 then
    return false;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_blueprint -> 'activities') activity
    where jsonb_typeof(activity) <> 'object'
      or activity ->> 'id' is null
      or activity ->> 'id' !~ '^[a-z][a-z0-9_-]{2,63}$'
      or activity ->> 'phase' not in (
        'orientation', 'activation', 'gist', 'focus', 'notice', 'practice',
        'retrieve', 'transfer', 'reflect'
      )
  ) then
    return false;
  end if;

  if (
    select count(*) <> count(distinct activity ->> 'id')
    from jsonb_array_elements(p_blueprint -> 'activities') activity
  ) then
    return false;
  end if;

  if exists (
    with ordered as (
      select
        ordinal_position,
        case activity ->> 'phase'
          when 'orientation' then 0
          when 'activation' then 1
          when 'gist' then 2
          when 'focus' then 3
          when 'notice' then 4
          when 'practice' then 5
          when 'retrieve' then 6
          when 'transfer' then 7
          when 'reflect' then 8
          else 99
        end as phase_order
      from jsonb_array_elements(p_blueprint -> 'activities')
        with ordinality as activities(activity, ordinal_position)
    )
    select 1
    from ordered current_activity
    join ordered previous_activity
      on previous_activity.ordinal_position = current_activity.ordinal_position - 1
    where current_activity.phase_order < previous_activity.phase_order
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.learning_v2_blueprint_progression_valid(jsonb)
  from public, anon, authenticated;
grant execute on function public.learning_v2_blueprint_progression_valid(jsonb)
  to service_role;

alter table public.lesson_versions
  add constraint lesson_versions_progression_shape check (
    public.learning_v2_blueprint_progression_valid(blueprint)
  );
