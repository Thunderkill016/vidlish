begin;

create extension if not exists pgtap with schema extensions;

select plan(46);

-- ---------------------------------------------------------------------------
-- Shape, RLS and browser privileges
-- ---------------------------------------------------------------------------

select has_table('public', 'learning_review_sessions', 'review sessions table exists');
select has_table('public', 'learning_review_attempts', 'review attempts table exists');
select has_column('public', 'learning_item_states', 'last_delayed_transfer_at', 'item state stores delayed-transfer timestamp');
select is(
  (select relrowsecurity from pg_class where oid = 'public.learning_review_sessions'::regclass),
  true,
  'review sessions RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.learning_review_attempts'::regclass),
  true,
  'review attempts RLS enabled'
);
select is(has_table_privilege('authenticated', 'public.learning_review_sessions', 'select'), true, 'browser reads owned review sessions');
select is(has_table_privilege('authenticated', 'public.learning_review_sessions', 'insert'), false, 'browser cannot forge review sessions');
select is(has_table_privilege('authenticated', 'public.learning_review_attempts', 'select'), true, 'browser reads owned review attempts');
select is(has_table_privilege('authenticated', 'public.learning_review_attempts', 'insert'), false, 'browser cannot forge review attempts');
select is(
  has_function_privilege(
    'authenticated',
    'public.start_learning_review_session(uuid,text,text)',
    'execute'
  ),
  false,
  'browser cannot start authoritative review RPC directly'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.record_learning_review_attempt(uuid,uuid,text,uuid,jsonb,jsonb,boolean,boolean,text)',
    'execute'
  ),
  false,
  'browser cannot submit precomputed delayed evidence directly'
);

-- ---------------------------------------------------------------------------
-- Minimal immutable lesson fixture with one target item
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'review-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'a2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'review-other@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  'a3333333-3333-4333-8333-333333333333',
  'M7lc1UVf-VE', 'Review fixture video', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  'a4444444-4444-4444-8444-444444444444',
  'a1111111-1111-4111-8111-111111111111',
  'a3333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  'a5555555-5555-4555-8555-555555555555',
  'a1111111-1111-4111-8111-111111111111',
  'a4444444-4444-4444-8444-444444444444',
  'a3333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('d', 64), 'transcript-normalization:v1', 24000, 1
);

update public.lesson_jobs
set canonical_transcript_id = 'a5555555-5555-4555-8555-555555555555'
where id = 'a4444444-4444-4444-8444-444444444444';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  'a6666666-6666-4666-8666-666666666666',
  'a1111111-1111-4111-8111-111111111111',
  'a4444444-4444-4444-8444-444444444444',
  'a5555555-5555-4555-8555-555555555555',
  'a3333333-3333-4333-8333-333333333333',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-review-model', repeat('d', 64), 1, 1,
  '{"titleVi":"Review parent"}'::jsonb,
  '[{"segmentId":"seg_dddddddddddddddddddddddddddddddd","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

insert into public.lesson_versions (
  id, lesson_id, owner_user_id, schema_version, blueprint
) values (
  'a7777777-7777-4777-8777-777777777777',
  'a6666666-6666-4666-8666-666666666666',
  'a1111111-1111-4111-8111-111111111111',
  'lesson:v2',
  '{
    "schemaVersion":"lesson:v2",
    "targetItems":[{"id":"item_member_of","itemKey":"a-member-of"}],
    "activities":[{"id":"activity_exit","phase":"reflect"}]
  }'::jsonb
);

create temporary table immediate_session on commit drop as
select * from public.start_lesson_v2_session(
  'a1111111-1111-4111-8111-111111111111',
  'a7777777-7777-4777-8777-777777777777',
  'reflect',
  'activity_exit'
);

select * from public.record_lesson_v2_attempt(
  'a1111111-1111-4111-8111-111111111111',
  (select session_id from immediate_session),
  'activity_exit',
  'a8888888-8888-4888-8888-888888888888',
  '{"kind":"reflection","submitted":true,"characterCount":12}'::jsonb,
  '{"verdict":"unscored"}'::jsonb,
  'completed',
  'activity_exit',
  true
);

select is(
  (select count(*)::integer from public.learning_item_states where item_key = 'a-member-of'),
  1,
  'immediate completion schedules the immutable target item'
);
select is(
  (select exposure_count from public.learning_item_states where item_key = 'a-member-of'),
  1,
  'first completion records one exposure'
);
select ok(
  (select next_review_at > now() from public.learning_item_states where item_key = 'a-member-of'),
  'initial review is scheduled in the future'
);
select is(
  (select last_delayed_transfer_at is null from public.learning_item_states where item_key = 'a-member-of'),
  true,
  'immediate completion does not create delayed transfer evidence'
);

select throws_ok(
  $$select * from public.start_learning_review_session(
    'a1111111-1111-4111-8111-111111111111',
    'a-member-of',
    'review_variant_affiliation_01'
  )$$,
  'learning review item is not due yet',
  'review cannot start before next_review_at'
);

update public.learning_item_states
set next_review_at = now() - interval '1 minute'
where owner_user_id = 'a1111111-1111-4111-8111-111111111111'
  and item_key = 'a-member-of';

create temporary table first_review on commit drop as
select * from public.start_learning_review_session(
  'a1111111-1111-4111-8111-111111111111',
  'a-member-of',
  'review_variant_affiliation_01'
);

select is((select created from first_review), true, 'due review start creates a session');
select is((select current_step from first_review), 'recall', 'review starts at delayed recall');
select ok((select scheduled_for <= now() from first_review), 'review session snapshots the due time');

create temporary table resumed_review on commit drop as
select * from public.start_learning_review_session(
  'a1111111-1111-4111-8111-111111111111',
  'a-member-of',
  'review_variant_affiliation_01'
);

select is((select created from resumed_review), false, 'second start resumes active review');
select is(
  (select review_session_id from resumed_review),
  (select review_session_id from first_review),
  'resume returns the same review session'
);

select throws_ok(
  $$select * from public.start_learning_review_session(
    'a2222222-2222-4222-8222-222222222222',
    'a-member-of',
    'review_variant_affiliation_01'
  )$$,
  'owned scheduled review item not found',
  'another learner cannot start the owner review item'
);

create temporary table wrong_recall on commit drop as
select * from public.record_learning_review_attempt(
  'a1111111-1111-4111-8111-111111111111',
  (select review_session_id from first_review),
  'recall',
  'a9999999-9999-4999-8999-999999999991',
  '{"kind":"text","submitted":true,"characterCount":9}'::jsonb,
  '{"step":"recall","verdict":"incorrect"}'::jsonb,
  false,
  false,
  null
);

select is((select created from wrong_recall), true, 'wrong recall creates an attempt');
select is((select current_step from wrong_recall), 'recall', 'wrong recall cannot advance');

create temporary table correct_recall on commit drop as
select * from public.record_learning_review_attempt(
  'a1111111-1111-4111-8111-111111111111',
  (select review_session_id from first_review),
  'recall',
  'a9999999-9999-4999-8999-999999999992',
  '{"kind":"text","submitted":true,"characterCount":11}'::jsonb,
  '{"step":"recall","verdict":"correct"}'::jsonb,
  true,
  false,
  null
);

select is((select created from correct_recall), true, 'correct delayed recall creates an attempt');
select is((select current_step from correct_recall), 'transfer', 'correct delayed recall advances to changed context');

create temporary table retried_recall on commit drop as
select * from public.record_learning_review_attempt(
  'a1111111-1111-4111-8111-111111111111',
  (select review_session_id from first_review),
  'recall',
  'a9999999-9999-4999-8999-999999999992',
  '{"kind":"text","submitted":true,"characterCount":11}'::jsonb,
  '{"step":"recall","verdict":"correct"}'::jsonb,
  true,
  false,
  null
);

select is((select created from retried_recall), false, 'network retry reuses delayed recall attempt');
select is(
  (select review_attempt_id from retried_recall),
  (select review_attempt_id from correct_recall),
  'idempotent delayed recall returns the original attempt'
);
select is(
  (select count(*)::integer from public.learning_review_attempts where step = 'recall'),
  2,
  'wrong then correct recall produces exactly two attempts'
);
select is(
  (select attempt_count from public.learning_item_states where item_key = 'a-member-of'),
  2,
  'item attempt count reflects delayed recall attempts'
);
select is(
  (select successful_retrievals from public.learning_item_states where item_key = 'a-member-of'),
  1,
  'only successful delayed recall increments retrieval evidence'
);

create temporary table transfer_draft on commit drop as
select * from public.record_learning_review_attempt(
  'a1111111-1111-4111-8111-111111111111',
  (select review_session_id from first_review),
  'transfer',
  'a9999999-9999-4999-8999-999999999993',
  '{"kind":"self_check","submitted":true,"characterCount":42,"checkedCriteria":[]}'::jsonb,
  '{"step":"transfer","verdict":"self_check","checkedCriteria":[],"requiredCriteria":3,"confirmed":false}'::jsonb,
  false,
  false,
  null
);

select is((select created from transfer_draft), true, 'first changed-context submission creates an attempt');
select is((select current_step from transfer_draft), 'transfer', 'unchecked transfer cannot complete review');

select throws_ok(
  format(
    $$select * from public.record_learning_review_attempt(
      'a1111111-1111-4111-8111-111111111111',
      %L::uuid,
      'transfer',
      'a9999999-9999-4999-8999-999999999994',
      '{"kind":"self_check","submitted":true,"characterCount":42,"checkedCriteria":[0,1,2]}'::jsonb,
      '{"step":"transfer","verdict":"self_check","checkedCriteria":[0,1,2],"requiredCriteria":3,"confirmed":true}'::jsonb,
      false,
      true,
      null
    )$$,
    (select review_session_id from first_review)
  ),
  'completed delayed transfer requires hard or good outcome',
  'NULL outcome cannot fail open on delayed completion'
);

create temporary table completed_transfer on commit drop as
select * from public.record_learning_review_attempt(
  'a1111111-1111-4111-8111-111111111111',
  (select review_session_id from first_review),
  'transfer',
  'a9999999-9999-4999-8999-999999999995',
  '{"kind":"self_check","submitted":true,"characterCount":42,"checkedCriteria":[0,1,2]}'::jsonb,
  '{"step":"transfer","verdict":"self_check","checkedCriteria":[0,1,2],"requiredCriteria":3,"confirmed":true}'::jsonb,
  false,
  true,
  'hard'
);

select is((select created from completed_transfer), true, 'confirmed delayed transfer creates an attempt');
select is((select session_status from completed_transfer), 'completed', 'confirmed transfer completes the review session');
select is(
  (select last_outcome from public.learning_item_states where item_key = 'a-member-of'),
  'hard',
  'review outcome records hard after a corrected recall'
);
select is(
  (select last_delayed_transfer_at is not null from public.learning_item_states where item_key = 'a-member-of'),
  true,
  'completed changed-context review records delayed transfer separately'
);
select ok(
  (select next_review_at > now() from public.learning_item_states where item_key = 'a-member-of'),
  'scheduler assigns the next review after delayed evidence'
);
select is(
  (select count(*)::integer from public.learning_review_attempts),
  4,
  'review stores wrong recall, correct recall, transfer draft and confirmation'
);

create temporary table retried_transfer on commit drop as
select * from public.record_learning_review_attempt(
  'a1111111-1111-4111-8111-111111111111',
  (select review_session_id from first_review),
  'transfer',
  'a9999999-9999-4999-8999-999999999995',
  '{"kind":"self_check","submitted":true,"characterCount":42,"checkedCriteria":[0,1,2]}'::jsonb,
  '{"step":"transfer","verdict":"self_check","checkedCriteria":[0,1,2],"requiredCriteria":3,"confirmed":true}'::jsonb,
  false,
  true,
  'hard'
);

select is((select created from retried_transfer), false, 'completed transfer network retry is idempotent');
select is(
  (select review_attempt_id from retried_transfer),
  (select review_attempt_id from completed_transfer),
  'completed transfer retry returns the original attempt'
);

-- ---------------------------------------------------------------------------
-- RLS ownership after durable review evidence exists
-- ---------------------------------------------------------------------------

set local role authenticated;
set local "request.jwt.claim.sub" = 'a1111111-1111-4111-8111-111111111111';
select is((select count(*)::integer from public.learning_review_sessions), 1, 'owner reads their review session');
select is((select count(*)::integer from public.learning_review_attempts), 4, 'owner reads their review attempts');
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = 'a2222222-2222-4222-8222-222222222222';
select is((select count(*)::integer from public.learning_review_sessions), 0, 'other learner reads no review session');
select is((select count(*)::integer from public.learning_review_attempts), 0, 'other learner reads no review attempts');
reset role;

select * from finish();
rollback;