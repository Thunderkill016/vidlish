begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_table(
  'public',
  'learning_support_events',
  'learning support events table exists'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.learning_support_events'::regclass),
  true,
  'learning support events RLS enabled'
);
select is(
  has_table_privilege('authenticated', 'public.learning_support_events', 'select'),
  true,
  'browser may read owned support evidence'
);
select is(
  has_table_privilege('authenticated', 'public.learning_support_events', 'insert'),
  false,
  'browser cannot forge support evidence'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.record_lesson_v2_support_event(uuid,uuid,text,uuid,text,text)',
    'execute'
  ),
  false,
  'browser cannot call the authoritative support-event RPC'
);

-- Minimal owned lesson/version fixture for one active v2 session.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'support-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'a2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'support-other@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  'a3333333-3333-4333-8333-333333333333',
  'supportEvt1', 'Support evidence fixture', 'Fixture channel', 'fixture:v1'
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
  'unknown', 'unknown', repeat('b', 64), 'transcript-normalization:v1', 40000, 1
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
  'fixture-lesson-model', repeat('b', 64), 1, 1,
  '{"titleVi":"Support parent"}'::jsonb,
  '[{"segmentId":"seg_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
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
    "activities":[
      {"id":"activity_gist","phase":"gist"},
      {"id":"activity_transfer","phase":"transfer"}
    ]
  }'::jsonb
);

create temporary table support_session on commit drop as
select * from public.start_lesson_v2_session(
  'a1111111-1111-4111-8111-111111111111',
  'a7777777-7777-4777-8777-777777777777',
  'gist',
  'activity_gist'
);

create temporary table first_playback on commit drop as
select * from public.record_lesson_v2_support_event(
  'a1111111-1111-4111-8111-111111111111',
  (select session_id from support_session),
  'activity_gist',
  'a8111111-1111-4111-8111-111111111111',
  'playback',
  null
);

select is((select created from first_playback), true, 'first playback creates evidence');
select is((select playback_ordinal from first_playback), 1, 'first playback gets ordinal one');

create temporary table retried_playback on commit drop as
select * from public.record_lesson_v2_support_event(
  'a1111111-1111-4111-8111-111111111111',
  (select session_id from support_session),
  'activity_gist',
  'a8111111-1111-4111-8111-111111111111',
  'playback',
  null
);

select is((select created from retried_playback), false, 'same playback key is idempotent');
select is(
  (select event_id from retried_playback),
  (select event_id from first_playback),
  'playback retry returns the original event'
);

create temporary table second_playback on commit drop as
select * from public.record_lesson_v2_support_event(
  'a1111111-1111-4111-8111-111111111111',
  (select session_id from support_session),
  'activity_gist',
  'a8222222-2222-4222-8222-222222222222',
  'playback',
  null
);

select is((select playback_ordinal from second_playback), 2, 'second playback is replay evidence');

create temporary table first_support on commit drop as
select * from public.record_lesson_v2_support_event(
  'a1111111-1111-4111-8111-111111111111',
  (select session_id from support_session),
  'activity_gist',
  'a8333333-3333-4333-8333-333333333333',
  'support_opened',
  'context_hint'
);

select is((select created from first_support), true, 'first support open creates evidence');

create temporary table repeated_support on commit drop as
select * from public.record_lesson_v2_support_event(
  'a1111111-1111-4111-8111-111111111111',
  (select session_id from support_session),
  'activity_gist',
  'a8444444-4444-4444-8444-444444444444',
  'support_opened',
  'context_hint'
);

select is((select created from repeated_support), false, 'same support step is semantic state, not a counter');
select is(
  (select event_id from repeated_support),
  (select event_id from first_support),
  'same support step converges on the original event'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_support_event(
      'a1111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_gist',
      'a8555555-5555-4555-8555-555555555555',
      'support_opened',
      'replay'
    )$$,
    (select session_id from support_session)
  ),
  'invalid persisted support step',
  'replay cannot be forged as support-opened evidence'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_support_event(
      'a2222222-2222-4222-8222-222222222222',
      %L::uuid,
      'activity_gist',
      'a8666666-6666-4666-8666-666666666666',
      'playback',
      null
    )$$,
    (select session_id from support_session)
  ),
  'owned learning session not found',
  'another learner cannot write support evidence into this session'
);

set local role authenticated;
set local "request.jwt.claim.sub" = 'a1111111-1111-4111-8111-111111111111';
select is(
  (select count(*)::integer from public.learning_support_events),
  3,
  'owner reads their playback and support evidence'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = 'a2222222-2222-4222-8222-222222222222';
select is(
  (select count(*)::integer from public.learning_support_events),
  0,
  'other learner reads no support evidence'
);
reset role;

select * from finish();
rollback;
