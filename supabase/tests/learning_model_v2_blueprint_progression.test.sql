begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select is(
  public.learning_v2_blueprint_progression_valid(
    '{
      "schemaVersion":"lesson:v2",
      "activities":[
        {"id":"activity_gist","phase":"gist"},
        {"id":"activity_practice","phase":"practice"},
        {"id":"activity_transfer","phase":"transfer"}
      ]
    }'::jsonb
  ),
  true,
  'ordered unique immutable activities are accepted'
);

select is(
  public.learning_v2_blueprint_progression_valid(
    '{
      "activities":[
        {"id":"activity_repeat","phase":"gist"},
        {"id":"activity_repeat","phase":"practice"}
      ]
    }'::jsonb
  ),
  false,
  'duplicate activity ids are rejected'
);

select is(
  public.learning_v2_blueprint_progression_valid(
    '{
      "activities":[
        {"id":"activity_transfer","phase":"transfer"},
        {"id":"activity_gist","phase":"gist"}
      ]
    }'::jsonb
  ),
  false,
  'learning phases cannot move backwards'
);

select is(
  public.learning_v2_blueprint_progression_valid(
    '{"activities":[{"id":"activity_gist"}]}'::jsonb
  ),
  false,
  'an activity without a phase is rejected'
);

select is(
  public.learning_v2_blueprint_progression_valid(
    '{"schemaVersion":"lesson:v2"}'::jsonb
  ),
  false,
  'missing activities array is rejected'
);

select * from finish();
rollback;
