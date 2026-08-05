begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- ---------------------------------------------------------------------------
-- Shape and privileges
-- ---------------------------------------------------------------------------

select has_table('public', 'lessons', 'lessons table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.lessons'::regclass),
  true,
  'lessons RLS enabled'
);
select is(
  has_table_privilege('authenticated', 'public.lessons', 'select'),
  true,
  'browser may read its own lessons'
);
select is(
  has_table_privilege('authenticated', 'public.lessons', 'insert'),
  false,
  'browser cannot write a lesson'
);
select is(
  has_table_privilege('authenticated', 'public.lessons', 'update'),
  false,
  'browser cannot edit a published lesson'
);
select is(
  has_table_privilege('authenticated', 'public.lessons', 'delete'),
  false,
  'browser cannot delete a lesson'
);
select is(
  has_table_privilege('anon', 'public.lessons', 'select'),
  false,
  'signed-out visitors see no lessons'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.publish_lesson(uuid,uuid,text,text,text,text,text,text,integer,integer,jsonb,jsonb)',
    'execute'
  ),
  false,
  'browser cannot publish a lesson directly'
);

-- ---------------------------------------------------------------------------
-- Fixtures: two owners, one job each, one canonical transcript each
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'other@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  '33333333-3333-4333-8333-333333333333',
  'dQw4w9WgXcQ', 'Fixture video', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values
(
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'analyzing_video', 'analyzing_video', 'sent'
),
(
  '55555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'analyzing_video', 'analyzing_video', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values
(
  '74444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('a', 64), 'transcript-normalization:v1', 90000, 1
),
(
  '75555555-5555-4555-8555-555555555555',
  '22222222-2222-4222-8222-222222222222',
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('b', 64), 'transcript-normalization:v1', 90000, 1
);

update public.lesson_jobs set canonical_transcript_id = case id
  when '44444444-4444-4444-8444-444444444444' then '74444444-4444-4444-8444-444444444444'::uuid
  when '55555555-5555-4555-8555-555555555555' then '75555555-5555-4555-8555-555555555555'::uuid
end;

-- ---------------------------------------------------------------------------
-- publish_lesson: one commit for the lesson and the job's completion
-- ---------------------------------------------------------------------------

create temporary table first_publish on commit drop as
select * from public.publish_lesson(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'gemini-3.5-flash-lite', repeat('a', 64), 1200, 900,
  '{"titleVi":"Bài học"}'::jsonb,
  '[{"segmentId":"seg_11111111111111111111111111111111","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

select is((select created from first_publish), true, 'first publish creates the lesson');
select is(
  (select count(*)::integer from public.lessons where job_id = '44444444-4444-4444-8444-444444444444'),
  1,
  'exactly one lesson row is written'
);
select is(
  (select status::text from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'),
  'completed',
  'publishing completes the job in the same commit'
);
select is(
  (select lesson_id = (select lesson_id from first_publish) from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'),
  true,
  'the job points at the lesson it published'
);
select is(
  (select transcript_id from public.lessons where job_id = '44444444-4444-4444-8444-444444444444'),
  '74444444-4444-4444-8444-444444444444'::uuid,
  'the lesson records the canonical transcript it was built from'
);

-- A retry must reuse the committed lesson rather than pay for a second one.
create temporary table second_publish on commit drop as
select * from public.publish_lesson(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'gemini-3.5-flash-lite', repeat('a', 64), 1200, 900,
  '{"titleVi":"Bài học lần hai"}'::jsonb,
  '[{"segmentId":"seg_11111111111111111111111111111111","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

select is((select created from second_publish), false, 'a retry does not create a second lesson');
select is(
  (select lesson_id from second_publish),
  (select lesson_id from first_publish),
  'a retry returns the lesson already committed'
);
select is(
  (select count(*)::integer from public.lessons where job_id = '44444444-4444-4444-8444-444444444444'),
  1,
  'the retry left the row count unchanged'
);

-- A hash that does not match the job's canonical transcript must not publish.
select throws_ok(
  $$select * from public.publish_lesson(
    '22222222-2222-4222-8222-222222222222',
    '55555555-5555-4555-8555-555555555555',
    'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
    'gemini-3.5-flash-lite', repeat('f', 64), 10, 10,
    '{"titleVi":"x"}'::jsonb,
    '[{"segmentId":"seg_11111111111111111111111111111111","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
  )$$,
  'canonical transcript not found for lesson publish',
  'a transcript hash that does not match the job is refused'
);

-- One owner cannot publish onto another owner's job.
select throws_ok(
  $$select * from public.publish_lesson(
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555555',
    'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
    'gemini-3.5-flash-lite', repeat('b', 64), 10, 10,
    '{"titleVi":"x"}'::jsonb,
    '[{"segmentId":"seg_11111111111111111111111111111111","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
  )$$,
  'canonical transcript not found for lesson publish',
  'a lesson cannot be published onto someone else''s job'
);

-- ---------------------------------------------------------------------------
-- Constraints that keep an ungrounded lesson unrepresentable
-- ---------------------------------------------------------------------------

select throws_ok(
  $$insert into public.lessons (
      owner_user_id, job_id, transcript_id, video_id, cefr_level,
      schema_version, pipeline_version, prompt_version, model_id,
      transcript_hash, input_tokens, output_tokens, draft, citations
    ) values (
      '22222222-2222-4222-8222-222222222222',
      '55555555-5555-4555-8555-555555555555',
      '75555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333',
      'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
      'gemini-3.5-flash-lite', repeat('b', 64), 1, 1,
      '{"titleVi":"x"}'::jsonb, '[]'::jsonb
    )$$,
  '23514',
  'a lesson with no citations is rejected by the database'
);

select throws_ok(
  $$insert into public.lessons (
      owner_user_id, job_id, transcript_id, video_id, cefr_level,
      schema_version, pipeline_version, prompt_version, model_id,
      transcript_hash, input_tokens, output_tokens, draft, citations
    ) values (
      '22222222-2222-4222-8222-222222222222',
      '55555555-5555-4555-8555-555555555555',
      '75555555-5555-4555-8555-555555555555',
      '33333333-3333-4333-8333-333333333333',
      'B1', 'lesson:v2', 'lesson-pipeline:v1', 'lesson-prompt:v1',
      'gemini-3.5-flash-lite', repeat('b', 64), 1, 1,
      '{"titleVi":"x"}'::jsonb,
      '[{"segmentId":"seg_11111111111111111111111111111111","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
    )$$,
  '23514',
  'a lesson claiming an unknown schema version is rejected'
);

-- ---------------------------------------------------------------------------
-- Row-level security: a lesson is visible to its owner and to nobody else
-- ---------------------------------------------------------------------------

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
select is(
  (select count(*)::integer from public.lessons),
  1,
  'the owner reads their own lesson'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select is(
  (select count(*)::integer from public.lessons),
  0,
  'another signed-in learner reads none of it'
);
reset role;

select * from finish();
rollback;
