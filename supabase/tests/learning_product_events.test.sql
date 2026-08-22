begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

select has_table(
  'public',
  'learning_product_events',
  'learning product events table exists'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.learning_product_events'::regclass),
  true,
  'learning product events RLS enabled'
);
select is(
  has_table_privilege('authenticated', 'public.learning_product_events', 'select'),
  true,
  'learner may inspect owned measurement rows'
);
select is(
  has_table_privilege('authenticated', 'public.learning_product_events', 'insert'),
  false,
  'browser cannot forge product measurement rows'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.record_lesson_v2_product_event(uuid,uuid,text,uuid,text,text)',
    'execute'
  ),
  false,
  'browser cannot call authoritative product event RPC'
);
select is(
  has_function_privilege(
    'service_role',
    'public.record_lesson_v2_product_event(uuid,uuid,text,uuid,text,text)',
    'execute'
  ),
  true,
  'service role may call authoritative product event RPC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  'b1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'measurement-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'b2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'measurement-other@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  'b3333333-3333-4333-8333-333333333333',
  'measureEvt1', 'Measurement fixture', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  'b4444444-4444-4444-8444-444444444444',
  'b1111111-1111-4111-8111-111111111111',
  'b3333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  'b5555555-5555-4555-8555-555555555555',
  'b1111111-1111-4111-8111-111111111111',
  'b4444444-4444-4444-8444-444444444444',
  'b3333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('c', 64), 'transcript-normalization:v1', 40000, 1
);

update public.lesson_jobs
set canonical_transcript_id = 'b5555555-5555-4555-8555-555555555555'
where id = 'b4444444-4444-4444-8444-444444444444';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  'b6666666-6666-4666-8666-666666666666',
  'b1111111-1111-4111-8111-111111111111',
  'b4444444-4444-4444-8444-444444444444',
  'b5555555-5555-4555-8555-555555555555',
  'b3333333-3333-4333-8333-333333333333',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-lesson-model', repeat('c', 64), 1, 1,
  '{"titleVi":"Measurement parent"}'::jsonb,
  '[{"segmentId":"seg_cccccccccccccccccccccccccccccccc","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

insert into public.lesson_versions (
  id, lesson_id, owner_user_id, schema_version, blueprint
) values (
  'b7777777-7777-4777-8777-777777777777',
  'b6666666-6666-4666-8666-666666666666',
  'b1111111-1111-4111-8111-111111111111',
  'lesson:v2',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[
      {
        "id":"activity_gist",
        "phase":"gist",
        "evidence":[{
          "sourceSegmentIds":["seg_cccccccccccccccccccccccccccccccc"],
          "startMs":0,
          "endMs":1000,
          "captionPolicy":"hidden_first",
          "replayAllowed":true
        }]
      },
      {"id":"activity_transfer","phase":"transfer","evidence":[]}
    ]
  }'::jsonb
);

create temporary table measurement_session on commit drop as
select * from public.start_lesson_v2_session(
  'b1111111-1111-4111-8111-111111111111',
  'b7777777-7777-4777-8777-777777777777',
  'gist',
  'activity_gist'
);

create temporary table first_completion on commit drop as
select * from public.record_lesson_v2_product_event(
  'b1111111-1111-4111-8111-111111111111',
  (select session_id from measurement_session),
  'activity_gist',
  'b8111111-1111-4111-8111-111111111111',
  'source_play_completed',
  null
);

select is((select created from first_completion), true, 'confirmed source completion creates measurement');

create temporary table repeated_completion on commit drop as
select * from public.record_lesson_v2_product_event(
  'b1111111-1111-4111-8111-111111111111',
  (select session_id from measurement_session),
  'activity_gist',
  'b8111111-1111-4111-8111-111111111111',
  'source_play_completed',
  null
);

select is((select created from repeated_completion), false, 'same product event key is idempotent');
select is(
  (select event_id from repeated_completion),
  (select event_id from first_completion),
  'idempotent retry returns the original product event'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_product_event(
      'b1111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_gist',
      'b8222222-2222-4222-8222-222222222222',
      'runtime_error',
      'raw provider message'
    )$$,
    (select session_id from measurement_session)
  ),
  'invalid learning runtime error kind',
  'free-form runtime error detail is rejected'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_product_event(
      'b1111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_gist',
      'b8333333-3333-4333-8333-333333333333',
      'correction_shown',
      null
    )$$,
    (select session_id from measurement_session)
  ),
  'correction display requires a persisted attempt',
  'correction cannot be claimed before an attempt exists'
);

insert into public.activity_attempts (
  session_id,
  owner_user_id,
  activity_id,
  attempt_number,
  idempotency_key,
  response,
  evaluation
) values (
  (select session_id from measurement_session),
  'b1111111-1111-4111-8111-111111111111',
  'activity_gist',
  1,
  'b8444444-4444-4444-8444-444444444444',
  '{"kind":"choice","optionId":"option_wrong"}'::jsonb,
  '{"verdict":"incorrect"}'::jsonb
);

create temporary table correction on commit drop as
select * from public.record_lesson_v2_product_event(
  'b1111111-1111-4111-8111-111111111111',
  (select session_id from measurement_session),
  'activity_gist',
  'b8555555-5555-4555-8555-555555555555',
  'correction_shown',
  null
);
select is((select created from correction), true, 'correction display is recorded after durable attempt');

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_product_event(
      'b1111111-1111-4111-8111-111111111111',
      %L::uuid,
      'activity_transfer',
      'b8666666-6666-4666-8666-666666666666',
      'source_play_completed',
      null
    )$$,
    (select session_id from measurement_session)
  ),
  'source completion requires bounded source evidence',
  'source completion cannot be forged for an activity without source evidence'
);

select throws_ok(
  format(
    $$select * from public.record_lesson_v2_product_event(
      'b2222222-2222-4222-8222-222222222222',
      %L::uuid,
      'activity_gist',
      'b8777777-7777-4777-8777-777777777777',
      'runtime_error',
      'youtube_player'
    )$$,
    (select session_id from measurement_session)
  ),
  'owned learning session not found',
  'another learner cannot write product measurement into this session'
);

set local role authenticated;
set local "request.jwt.claim.sub" = 'b1111111-1111-4111-8111-111111111111';
select is(
  (select count(*)::integer from public.learning_product_events),
  2,
  'owner reads only the persisted bounded product events'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = 'b2222222-2222-4222-8222-222222222222';
select is(
  (select count(*)::integer from public.learning_product_events),
  0,
  'other learner reads no product measurement events'
);
reset role;

select * from finish();
rollback;
