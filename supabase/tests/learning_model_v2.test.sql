begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

-- ---------------------------------------------------------------------------
-- Shape, RLS and browser privileges
-- ---------------------------------------------------------------------------

select has_table('public', 'lesson_versions', 'lesson_versions table exists');
select has_table('public', 'lesson_sessions', 'lesson_sessions table exists');
select has_table('public', 'activity_attempts', 'activity_attempts table exists');
select has_table('public', 'learning_item_states', 'learning_item_states table exists');

select is(
  (select relrowsecurity from pg_class where oid = 'public.lesson_versions'::regclass),
  true,
  'lesson_versions RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.lesson_sessions'::regclass),
  true,
  'lesson_sessions RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.activity_attempts'::regclass),
  true,
  'activity_attempts RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.learning_item_states'::regclass),
  true,
  'learning_item_states RLS enabled'
);

select is(has_table_privilege('authenticated', 'public.lesson_versions', 'select'), true, 'browser reads owned lesson versions');
select is(has_table_privilege('authenticated', 'public.lesson_versions', 'insert'), false, 'browser cannot publish lesson versions');
select is(has_table_privilege('authenticated', 'public.lesson_sessions', 'select'), true, 'browser reads owned sessions');
select is(has_table_privilege('authenticated', 'public.lesson_sessions', 'insert'), false, 'browser cannot forge sessions');
select is(has_table_privilege('authenticated', 'public.lesson_sessions', 'update'), false, 'browser cannot advance sessions directly');
select is(has_table_privilege('authenticated', 'public.activity_attempts', 'select'), true, 'browser reads owned attempts');
select is(has_table_privilege('authenticated', 'public.activity_attempts', 'insert'), false, 'browser cannot write authoritative evaluations');
select is(has_table_privilege('authenticated', 'public.learning_item_states', 'select'), true, 'browser reads owned review state');
select is(has_table_privilege('authenticated', 'public.learning_item_states', 'update'), false, 'browser cannot claim mastery directly');
select is(
  has_function_privilege(
    'authenticated',
    'public.start_lesson_v2_session(uuid,uuid,text,text)',
    'execute'
  ),
  false,
  'browser cannot call the session mutation RPC'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.record_lesson_v2_attempt(uuid,uuid,text,uuid,jsonb,jsonb,text,text,boolean)',
    'execute'
  ),
  false,
  'browser cannot submit a precomputed evaluation directly'
);

-- ---------------------------------------------------------------------------
-- Fixtures: two owners and one immutable v2 lesson version
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner-v2@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'other-v2@example.com', '', now(),
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

-- ---------------------------------------------------------------------------
-- Session creation is idempotent for one active lesson version
-- ---------------------------------------------------------------------------

create temporary table first_session on commit drop as
select * from public.start_lesson_v2_session(
  '11111111-1111-4111-8111-111111111111',
  '77777777-7777-4777-8777-777777777777',
  'gist',
  'activity_gist'
);

select is((select created from first_session), true, 'first start creates a session');
select is((select session_status from first_session), 'in_progress', 'new session is active');

create temporary table resumed_session on commit drop as
select * from public.start_lesson_v2_session(
  '11111111-1111-4111-8111-111111111111',
  '77777777-7777-4777-8777-777777777777',
  'gist',
  'activity_gist'
);

select is((select created from resumed_session), false, 'second start resumes instead of duplicating');
select is(
  (select session_id from resumed_session),
  (select session_id from first_session),
  'resume returns the same active session'
);

-- ---------------------------------------------------------------------------
-- Attempt progression, ownership and idempotency
-- ---------------------------------------------------------------------------

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_attempt(
      '11111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_transfer',
      '88888888-8888-4888-8888-888888888888',
      '{"kind":"self_check"}'::jsonb,
      '{"verdict":"self_check"}'::jsonb,
      'transfer',
      'activity_transfer',
      false
    )$$,
    (select session_id from first_session)
  ),
  'activity is not current for this session',
  'server refuses skipping ahead in the immutable activity sequence'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_attempt(
      '11111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_gist',
      '88888888-8888-4888-8888-888888888889',
      '{"kind":"choice"}'::jsonb,
      '{"verdict":"incorrect"}'::jsonb,
      'transfer',
      'activity_gist',
      false
    )$$,
    (select session_id from first_session)
  ),
  'a non-advancing attempt must preserve the current phase',
  'database rejects changing phase while staying on the same activity'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_attempt(
      '11111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_gist',
      '88888888-8888-4888-8888-888888888890',
      '{"kind":"choice"}'::jsonb,
      '{"verdict":"correct"}'::jsonb,
      'transfer',
      'activity_unknown',
      false
    )$$,
    (select session_id from first_session)
  ),
  'attempt progression must follow the immutable activity order',
  'database rejects an arbitrary next activity id'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_attempt(
      '11111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_gist',
      '88888888-8888-4888-8888-888888888891',
      '{"kind":"choice"}'::jsonb,
      '{"verdict":"correct"}'::jsonb,
      'completed',
      'activity_gist',
      true
    )$$,
    (select session_id from first_session)
  ),
  'only the final immutable activity can complete a session',
  'database rejects premature session completion'
);

create temporary table first_attempt on commit drop as
select * from public.record_lesson_v2_attempt(
  '11111111-1111-4111-8111-111111111111',
  (select session_id from first_session),
  'activity_gist',
  '99999999-9999-4999-8999-999999999999',
  '{"kind":"choice","optionId":"option_whole_message"}'::jsonb,
  '{"verdict":"correct"}'::jsonb,
  'transfer',
  'activity_transfer',
  false
);

select is((select created from first_attempt), true, 'first submit creates an attempt');
select is((select attempt_number from first_attempt), 1, 'first attempt is numbered one');
select is((select current_activity_id from first_attempt), 'activity_transfer', 'successful submit advances the session');

create temporary table retried_attempt on commit drop as
select * from public.record_lesson_v2_attempt(
  '11111111-1111-4111-8111-111111111111',
  (select session_id from first_session),
  'activity_gist',
  '99999999-9999-4999-8999-999999999999',
  '{"kind":"choice","optionId":"option_whole_message"}'::jsonb,
  '{"verdict":"correct"}'::jsonb,
  'transfer',
  'activity_transfer',
  false
);

select is((select created from retried_attempt), false, 'network retry reuses the committed attempt');
select is(
  (select attempt_id from retried_attempt),
  (select attempt_id from first_attempt),
  'idempotent retry returns the original attempt id'
);
select is(
  (select count(*)::integer from public.activity_attempts),
  1,
  'idempotent retry leaves one attempt row'
);

insert into public.learning_item_states (
  owner_user_id, item_key, exposure_count, attempt_count,
  successful_retrievals, last_outcome, source_lesson_version_id
) values (
  '11111111-1111-4111-8111-111111111111',
  'pay-attention-to', 1, 1, 1, 'good',
  '77777777-7777-4777-8777-777777777777'
);

-- ---------------------------------------------------------------------------
-- RLS: each learner sees only their own immutable and mutable learning data
-- ---------------------------------------------------------------------------

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
select is((select count(*)::integer from public.lesson_versions), 1, 'owner reads their lesson version');
select is((select count(*)::integer from public.lesson_sessions), 1, 'owner reads their session');
select is((select count(*)::integer from public.activity_attempts), 1, 'owner reads their attempt');
select is((select count(*)::integer from public.learning_item_states), 1, 'owner reads their review state');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select is((select count(*)::integer from public.lesson_versions), 0, 'other learner reads no lesson version');
select is((select count(*)::integer from public.lesson_sessions), 0, 'other learner reads no session');
select is((select count(*)::integer from public.activity_attempts), 0, 'other learner reads no attempt');
select is((select count(*)::integer from public.learning_item_states), 0, 'other learner reads no review state');
reset role;

select * from finish();
rollback;
