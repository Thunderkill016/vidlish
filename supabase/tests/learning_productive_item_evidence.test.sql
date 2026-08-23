begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'e1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'productive-evidence@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  'e2222222-2222-4222-8222-222222222222',
  'M7lc1UVf-VE', 'Productive evidence fixture', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  'e3333333-3333-4333-8333-333333333333',
  'e1111111-1111-4111-8111-111111111111',
  'e2222222-2222-4222-8222-222222222222',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  'e4444444-4444-4444-8444-444444444444',
  'e1111111-1111-4111-8111-111111111111',
  'e3333333-3333-4333-8333-333333333333',
  'e2222222-2222-4222-8222-222222222222',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('e', 64), 'transcript-normalization:v1', 40000, 4
);

update public.lesson_jobs
set canonical_transcript_id = 'e4444444-4444-4444-8444-444444444444'
where id = 'e3333333-3333-4333-8333-333333333333';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  'e5555555-5555-4555-8555-555555555555',
  'e1111111-1111-4111-8111-111111111111',
  'e3333333-3333-4333-8333-333333333333',
  'e4444444-4444-4444-8444-444444444444',
  'e2222222-2222-4222-8222-222222222222',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-productivity-model', repeat('e', 64), 1, 1,
  '{"titleVi":"Productive evidence parent"}'::jsonb,
  '[{"segmentId":"seg_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","startMs":0,"endMs":1000,"text":"fixture"}]'::jsonb
);

insert into public.lesson_versions (
  id, lesson_id, owner_user_id, schema_version, blueprint
) values (
  'e6666666-6666-4666-8666-666666666666',
  'e5555555-5555-4555-8555-555555555555',
  'e1111111-1111-4111-8111-111111111111',
  'lesson:v2',
  '{
    "schemaVersion":"lesson:v2",
    "targetItems":[
      {"id":"item_recognition","itemKey":"recognition-only"},
      {"id":"item_hint","itemKey":"recall-with-hint"},
      {"id":"item_support","itemKey":"recall-with-support"},
      {"id":"item_independent","itemKey":"recall-independent"}
    ],
    "activities":[
      {
        "id":"activity_recognition",
        "phase":"notice",
        "activityType":"meaning_in_context",
        "targetItemId":"item_recognition"
      },
      {
        "id":"activity_hint",
        "phase":"practice",
        "activityType":"chunk_recall",
        "targetItemId":"item_hint",
        "hintVi":"Gợi ý bất biến"
      },
      {
        "id":"activity_support",
        "phase":"practice",
        "activityType":"chunk_recall",
        "targetItemId":"item_support",
        "hintVi":null
      },
      {
        "id":"activity_independent",
        "phase":"practice",
        "activityType":"chunk_recall",
        "targetItemId":"item_independent",
        "hintVi":null
      }
    ]
  }'::jsonb
);

create temporary table evidence_session on commit drop as
select * from public.start_lesson_v2_session(
  'e1111111-1111-4111-8111-111111111111',
  'e6666666-6666-4666-8666-666666666666',
  'notice',
  'activity_recognition'
);

select * from public.record_lesson_v2_attempt(
  'e1111111-1111-4111-8111-111111111111',
  (select session_id from evidence_session),
  'activity_recognition',
  'e7111111-1111-4111-8111-111111111111',
  '{"kind":"choice","optionId":"correct_option"}'::jsonb,
  '{"verdict":"correct"}'::jsonb,
  'practice',
  'activity_hint',
  false
);

select * from public.record_lesson_v2_attempt(
  'e1111111-1111-4111-8111-111111111111',
  (select session_id from evidence_session),
  'activity_hint',
  'e7222222-2222-4222-8222-222222222222',
  '{"kind":"text","submitted":true,"characterCount":12}'::jsonb,
  '{"verdict":"correct"}'::jsonb,
  'practice',
  'activity_support',
  false
);

select * from public.record_lesson_v2_support_event(
  'e1111111-1111-4111-8111-111111111111',
  (select session_id from evidence_session),
  'activity_support',
  'e7333333-3333-4333-8333-333333333333',
  'support_opened',
  'context_hint'
);

select * from public.record_lesson_v2_attempt(
  'e1111111-1111-4111-8111-111111111111',
  (select session_id from evidence_session),
  'activity_support',
  'e7444444-4444-4444-8444-444444444444',
  '{"kind":"text","submitted":true,"characterCount":15}'::jsonb,
  '{"verdict":"correct"}'::jsonb,
  'practice',
  'activity_independent',
  false
);

select * from public.record_lesson_v2_attempt(
  'e1111111-1111-4111-8111-111111111111',
  (select session_id from evidence_session),
  'activity_independent',
  'e7555555-5555-4555-8555-555555555555',
  '{"kind":"text","submitted":true,"characterCount":18}'::jsonb,
  '{"verdict":"correct"}'::jsonb,
  'completed',
  'activity_independent',
  true
);

select is(
  (select count(*)::integer from public.learning_item_states
   where owner_user_id = 'e1111111-1111-4111-8111-111111111111'),
  4,
  'completion schedules all four immutable target items'
);

select is(
  (select attempt_count from public.learning_item_states where item_key = 'recognition-only'),
  1,
  'recognition remains generic item interaction history'
);
select is(
  (select successful_retrievals from public.learning_item_states where item_key = 'recognition-only'),
  0,
  'correct recognition does not become productive retrieval'
);
select is(
  (select last_independent_at is null from public.learning_item_states where item_key = 'recognition-only'),
  true,
  'correct recognition does not become independent production'
);

select is(
  (select successful_retrievals from public.learning_item_states where item_key = 'recall-with-hint'),
  1,
  'correct chunk recall with an immutable hint is still successful retrieval'
);
select is(
  (select last_independent_at is null from public.learning_item_states where item_key = 'recall-with-hint'),
  true,
  'immutable hint prevents an independent-production claim'
);

select is(
  (select successful_retrievals from public.learning_item_states where item_key = 'recall-with-support'),
  1,
  'correct supported chunk recall remains successful retrieval'
);
select is(
  (select last_independent_at is null from public.learning_item_states where item_key = 'recall-with-support'),
  true,
  'support opened before recall prevents an independent-production claim'
);

select is(
  (select successful_retrievals from public.learning_item_states where item_key = 'recall-independent'),
  1,
  'correct unsupported chunk recall is productive retrieval'
);
select is(
  (select last_independent_at is not null from public.learning_item_states where item_key = 'recall-independent'),
  true,
  'correct unsupported hint-free chunk recall records independent production'
);

select is(
  (select count(*)::integer from public.learner_known_words('e1111111-1111-4111-8111-111111111111')),
  1,
  'productive known-word gate admits only independently produced evidence'
);
select is(
  (select word from public.learner_known_words('e1111111-1111-4111-8111-111111111111')),
  'recall-independent',
  'known-word gate returns the independent chunk-recall item only'
);

select * from finish();
rollback;
