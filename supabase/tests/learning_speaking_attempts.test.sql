begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

select has_table(
  'public',
  'learning_speaking_attempts',
  'speaking capture receipt table exists'
);
select hasnt_column(
  'public',
  'learning_speaking_attempts',
  'audio',
  'raw audio is not a durable column'
);
select hasnt_column(
  'public',
  'learning_speaking_attempts',
  'transcript',
  'speech transcript is not a durable column'
);
select hasnt_column(
  'public',
  'learning_speaking_attempts',
  'text',
  'learner speech text is not a durable column'
);
select has_column(
  'public',
  'learning_speaking_attempts',
  'attempt_number',
  'speaking receipt persists authoritative attempt ordinal'
);
select has_column(
  'public',
  'learning_speaking_attempts',
  'support_level',
  'speaking receipt persists authoritative support strength'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.learning_speaking_attempts'::regclass),
  true,
  'speaking receipt RLS enabled'
);
select is(
  has_table_privilege('authenticated', 'public.learning_speaking_attempts', 'select'),
  true,
  'learner may read owned speaking receipts'
);
select is(
  has_table_privilege('authenticated', 'public.learning_speaking_attempts', 'insert'),
  false,
  'browser cannot forge speaking receipts'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.record_learning_speaking_attempt(uuid,uuid,text,uuid,integer,integer,text,boolean,boolean)',
    'execute'
  ),
  false,
  'browser cannot call authoritative speaking RPC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'c1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'speaking-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  'c2222222-2222-4222-8222-222222222222',
  'M7lc1UVf-VE', 'Speaking fixture', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  'c3333333-3333-4333-8333-333333333333',
  'c1111111-1111-4111-8111-111111111111',
  'c2222222-2222-4222-8222-222222222222',
  'A2', 'fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  'c4444444-4444-4444-8444-444444444444',
  'c1111111-1111-4111-8111-111111111111',
  'c3333333-3333-4333-8333-333333333333',
  'c2222222-2222-4222-8222-222222222222',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('c', 64), 'transcript-normalization:v1', 10000, 1
);

update public.lesson_jobs
set canonical_transcript_id = 'c4444444-4444-4444-8444-444444444444'
where id = 'c3333333-3333-4333-8333-333333333333';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  'c5555555-5555-4555-8555-555555555555',
  'c1111111-1111-4111-8111-111111111111',
  'c3333333-3333-4333-8333-333333333333',
  'c4444444-4444-4444-8444-444444444444',
  'c2222222-2222-4222-8222-222222222222',
  'A2', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-speaking-model', repeat('c', 64), 1, 1,
  '{"titleVi":"Speaking parent"}'::jsonb,
  '[{"segmentId":"seg_cccccccccccccccccccccccccccccccc","startMs":0,"endMs":1000,"text":"hello"}]'::jsonb
);

insert into public.lesson_versions (
  id, lesson_id, owner_user_id, schema_version, blueprint
) values (
  'c6666666-6666-4666-8666-666666666666',
  'c5555555-5555-4555-8555-555555555555',
  'c1111111-1111-4111-8111-111111111111',
  'lesson:v2',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[
      {"id":"activity_transfer","phase":"transfer","activityType":"guided_transfer"},
      {"id":"activity_exit","phase":"reflect","activityType":"exit_ticket"}
    ]
  }'::jsonb
);

insert into public.lesson_sessions (
  id, lesson_version_id, owner_user_id, status, current_phase,
  current_activity_id, started_at, completed_at, updated_at
) values (
  'c7777777-7777-4777-8777-777777777777',
  'c6666666-6666-4666-8666-666666666666',
  'c1111111-1111-4111-8111-111111111111',
  'completed', 'completed', 'activity_exit', now(), now(), now()
);

create temporary table first_capture on commit drop as
select * from public.record_learning_speaking_attempt(
  'c1111111-1111-4111-8111-111111111111',
  'c7777777-7777-4777-8777-777777777777',
  'activity_transfer',
  'c8888888-8888-4888-8888-888888888888',
  2400,
  9000,
  'audio/webm;codecs=opus',
  true,
  true
);

select is((select created from first_capture), true, 'valid capture creates receipt');
select is(
  (select count(*)::integer from public.learning_speaking_attempts),
  1,
  'one receipt is persisted'
);
select is(
  (select duration_ms from public.learning_speaking_attempts),
  2400,
  'bounded duration metadata is persisted'
);
select is(
  (select confirmed_audible_speech from public.learning_speaking_attempts),
  true,
  'self-check confirmation is persisted'
);
select is(
  (select attempt_number from public.learning_speaking_attempts),
  1,
  'immediate first capture receives attempt number one'
);
select is(
  (select support_level from public.learning_speaking_attempts),
  'supported',
  'immediate post-lesson speaking remains supported'
);

create temporary table retried_capture on commit drop as
select * from public.record_learning_speaking_attempt(
  'c1111111-1111-4111-8111-111111111111',
  'c7777777-7777-4777-8777-777777777777',
  'activity_transfer',
  'c8888888-8888-4888-8888-888888888888',
  2400,
  9000,
  'audio/webm;codecs=opus',
  true,
  true
);
select is((select created from retried_capture), false, 'network retry is idempotent');

insert into public.lesson_sessions (
  id, lesson_version_id, owner_user_id, status, current_phase,
  current_activity_id, started_at, completed_at, updated_at
) values (
  'd7777777-7777-4777-8777-777777777777',
  'c6666666-6666-4666-8666-666666666666',
  'c1111111-1111-4111-8111-111111111111',
  'completed', 'completed', 'activity_exit',
  now() - interval '26 hours', now() - interval '25 hours', now()
);

select * from public.record_learning_speaking_attempt(
  'c1111111-1111-4111-8111-111111111111',
  'd7777777-7777-4777-8777-777777777777',
  'activity_transfer',
  'd8888888-8888-4888-8888-888888888888',
  2600,
  9100,
  'audio/webm;codecs=opus',
  true,
  true
);
select is(
  (select attempt_number from public.learning_speaking_attempts where session_id = 'd7777777-7777-4777-8777-777777777777'),
  1,
  'delayed first speaking capture receives attempt number one'
);
select is(
  (select support_level from public.learning_speaking_attempts where session_id = 'd7777777-7777-4777-8777-777777777777'),
  'independent',
  'first capture after twenty-four hours is independent self-check evidence'
);

select * from public.record_learning_speaking_attempt(
  'c1111111-1111-4111-8111-111111111111',
  'd7777777-7777-4777-8777-777777777777',
  'activity_transfer',
  'd9999999-9999-4999-8999-999999999999',
  2700,
  9200,
  'audio/webm',
  true,
  true
);
select is(
  (select max(attempt_number) from public.learning_speaking_attempts where session_id = 'd7777777-7777-4777-8777-777777777777'),
  2,
  'delayed retry receives attempt number two'
);
select is(
  (select support_level from public.learning_speaking_attempts where session_id = 'd7777777-7777-4777-8777-777777777777' and attempt_number = 2),
  'supported',
  'every delayed retry is conservatively supported'
);

select throws_ok(
  $$select * from public.record_learning_speaking_attempt(
    'c1111111-1111-4111-8111-111111111111',
    'c7777777-7777-4777-8777-777777777777',
    'activity_exit',
    'c9999999-9999-4999-8999-999999999999',
    2400, 9000, 'audio/webm', true, true
  )$$,
  'speaking capture must belong to guided transfer',
  'non-transfer activity cannot create speaking evidence'
);

select throws_ok(
  $$select * from public.record_learning_speaking_attempt(
    'c1111111-1111-4111-8111-111111111111',
    'c7777777-7777-4777-8777-777777777777',
    'activity_transfer',
    'c9999999-9999-4999-8999-999999999998',
    2400, 9000, 'audio/webm', false, true
  )$$,
  'invalid speaking capture receipt',
  'capture cannot be saved before replay self-check'
);

update public.lesson_sessions
set status = 'in_progress', completed_at = null, current_phase = 'transfer', current_activity_id = 'activity_transfer'
where id = 'c7777777-7777-4777-8777-777777777777';

select throws_ok(
  $$select * from public.record_learning_speaking_attempt(
    'c1111111-1111-4111-8111-111111111111',
    'c7777777-7777-4777-8777-777777777777',
    'activity_transfer',
    'c9999999-9999-4999-8999-999999999997',
    2400, 9000, 'audio/webm', true, true
  )$$,
  'speaking capture requires completed lesson session',
  'in-progress lesson cannot mint speaking practice evidence'
);

select * from finish();
rollback;