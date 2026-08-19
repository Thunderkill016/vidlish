begin;

create extension if not exists pgtap with schema extensions;
select plan(1);

-- This test builds its own fixture, like every other pgTAP file here.
--
-- It used to call the RPC against ids that only existed in
-- `supabase/fixtures/learning_model_v2_durable.sql`. That fixture is loaded
-- only by the `durable_learning` CI job, so under `supabase test db` the row was
-- absent and the RPC raised "owned lesson version not found" — the test failed
-- for a missing fixture rather than for the guard it exists to prove.

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

-- The first immutable activity is the gist one. Starting anywhere else must be
-- refused, however valid-looking the phase and activity id are on their own.
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

select throws_ok(
  $$select * from public.start_lesson_v2_session(
    '11111111-1111-4111-8111-111111111111',
    '77777777-7777-4777-8777-777777777777',
    'transfer',
    'activity_transfer'
  )$$,
  'initial session state must match the first immutable activity',
  'database rejects starting a session after the first immutable activity'
);

select * from finish();
rollback;
