begin;

create extension if not exists pgtap with schema extensions;
select plan(6);

-- `learning_item_states` was created with a due index and then left empty by
-- every code path for as long as it existed. These assertions cover the
-- function that finally writes to it.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner-v2@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  '33333333-3333-4333-8333-333333333333',
  'dQw4w9WgXcQ', 'Fixture learning video', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('a', 64), 'transcript-normalization:v1', 40000, 2
);

update public.lesson_jobs
set canonical_transcript_id = '55555555-5555-4555-8555-555555555555'
where id = '44444444-4444-4444-8444-444444444444';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-lesson-model', repeat('a', 64), 1, 1,
  '{"titleVi":"Legacy parent"}'::jsonb,
  '[{"segmentId":"seg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

insert into public.lesson_versions (
  id, lesson_id, owner_user_id, schema_version, blueprint
) values (
  '77777777-7777-4777-8777-777777777777',
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  'lesson:v2',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[
      {"id":"activity_gist","phase":"gist"},
      {"id":"activity_transfer","phase":"transfer"}
    ]
  }'::jsonb
);

-- A second user, to prove the ownership guard rejects a borrowed lesson version.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'stranger-v2@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

select lives_ok(
  $$select public.upsert_learning_item_state(
    '11111111-1111-4111-8111-111111111111',
    'a-member-of',
    '77777777-7777-4777-8777-777777777777',
    'good',
    '2026-08-25T09:00:00+00:00'::timestamptz,
    '{"version":"review-state:v1","due":"2026-08-25T09:00:00.000Z"}'::jsonb,
    true
  )$$,
  'first review of an item creates its scheduling row'
);

select results_eq(
  $$select exposure_count, attempt_count, successful_retrievals, last_outcome
    from public.learning_item_states
    where owner_user_id = '11111111-1111-4111-8111-111111111111'
      and item_key = 'a-member-of'$$,
  $$values (1, 1, 1, 'good')$$,
  'the first write counts one exposure, one attempt and one successful recall'
);

-- Counts must accumulate. If the upsert overwrote them the learner's history
-- would reset on every review, and the whole point of the row is the history.
select lives_ok(
  $$select public.upsert_learning_item_state(
    '11111111-1111-4111-8111-111111111111',
    'a-member-of',
    '77777777-7777-4777-8777-777777777777',
    'again',
    '2026-08-20T09:00:00+00:00'::timestamptz,
    '{"version":"review-state:v1","due":"2026-08-20T09:00:00.000Z"}'::jsonb,
    false
  )$$,
  'a later review of the same item updates the existing row'
);

select results_eq(
  $$select exposure_count, attempt_count, successful_retrievals, last_outcome
    from public.learning_item_states
    where owner_user_id = '11111111-1111-4111-8111-111111111111'
      and item_key = 'a-member-of'$$,
  $$values (2, 2, 1, 'again')$$,
  'counts accumulate across reviews while the outcome reflects the latest one'
);

-- A malformed review state must be refused rather than stored. The version key
-- is the only handle a later migration has for reading these rows.
select throws_ok(
  $$select public.upsert_learning_item_state(
    '11111111-1111-4111-8111-111111111111',
    'unversioned',
    '77777777-7777-4777-8777-777777777777',
    'good',
    now(),
    '{"due":"2026-08-25T09:00:00.000Z"}'::jsonb,
    true
  )$$,
  '23514',
  null,
  'database rejects review state with no version key'
);

select throws_ok(
  $$select public.upsert_learning_item_state(
    '22222222-2222-4222-8222-222222222222',
    'borrowed',
    '77777777-7777-4777-8777-777777777777',
    'good',
    now(),
    '{"version":"review-state:v1"}'::jsonb,
    true
  )$$,
  'owned lesson version not found',
  'database refuses to pin item state to another owner''s lesson version'
);

select * from finish();
rollback;
