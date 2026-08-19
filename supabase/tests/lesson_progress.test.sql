begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- ---------------------------------------------------------------------------
-- Shape and privileges
-- ---------------------------------------------------------------------------

select has_table('public', 'lesson_progress', 'lesson_progress table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.lesson_progress'::regclass),
  true,
  'lesson_progress RLS enabled'
);
select is(
  has_table_privilege('authenticated', 'public.lesson_progress', 'select'),
  true,
  'browser may read its own study progress'
);
select is(
  has_table_privilege('authenticated', 'public.lesson_progress', 'insert'),
  false,
  'browser cannot write progress directly'
);
select is(
  has_table_privilege('authenticated', 'public.lesson_progress', 'update'),
  false,
  'browser cannot edit progress directly'
);
select is(
  has_table_privilege('authenticated', 'public.lesson_progress', 'delete'),
  false,
  'browser cannot delete progress directly'
);
select is(
  has_table_privilege('anon', 'public.lesson_progress', 'select'),
  false,
  'signed-out visitors see no study progress'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.save_lesson_progress(uuid,uuid,jsonb,boolean)',
    'execute'
  ),
  false,
  'browser cannot call the progress writer directly'
);

-- ---------------------------------------------------------------------------
-- Fixtures: two owners with a published lesson each, plus a job that has none
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
),
(
  -- Terminal on purpose. This job shares owner, video, CEFR and pipeline
  -- version with job 4444, and `lesson_jobs_one_active_generation` allows only
  -- one *active* generation per that tuple. A job that never published a lesson
  -- is a failed one in production too, so this is the honest fixture rather
  -- than a second active job the product would refuse to create.
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'failed', 'failed', 'sent'
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
end
where id in (
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);

select * from public.publish_lesson(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'gemini-3.5-flash-lite', repeat('a', 64), 10, 10,
  '{"titleVi":"Bài học"}'::jsonb,
  '[{"segmentId":"seg_11111111111111111111111111111111","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

select * from public.publish_lesson(
  '22222222-2222-4222-8222-222222222222',
  '55555555-5555-4555-8555-555555555555',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'gemini-3.5-flash-lite', repeat('b', 64), 10, 10,
  '{"titleVi":"Bài học khác"}'::jsonb,
  '[{"segmentId":"seg_22222222222222222222222222222222","startMs":0,"endMs":1000,"text":"two"}]'::jsonb
);

-- ---------------------------------------------------------------------------
-- save_lesson_progress: one row per lesson, owner resolved from the lesson
-- ---------------------------------------------------------------------------

select * from public.save_lesson_progress(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '{"version":"study-progress:v1","comprehensionAnswers":[{"index":0,"selectedIndex":1}],"clozeAttempts":[],"masteredVocabulary":[2]}'::jsonb,
  false
);

select is(
  (select count(*)::integer from public.lesson_progress),
  1,
  'the first save creates exactly one progress row'
);
select is(
  (select state -> 'masteredVocabulary' from public.lesson_progress
   where job_id = '44444444-4444-4444-8444-444444444444'),
  '[2]'::jsonb,
  'the saved answers are stored as given'
);
select is(
  (select completed_at is null from public.lesson_progress
   where job_id = '44444444-4444-4444-8444-444444444444'),
  true,
  'an unfinished lesson has no completion mark'
);

create temporary table first_completion on commit drop as
select * from public.save_lesson_progress(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '{"version":"study-progress:v1","comprehensionAnswers":[{"index":0,"selectedIndex":1}],"clozeAttempts":[],"masteredVocabulary":[2,3]}'::jsonb,
  true
);

select isnt(
  (select completed_at from first_completion),
  null,
  'finishing a lesson records when it was finished'
);

create temporary table second_completion on commit drop as
select * from public.save_lesson_progress(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '{"version":"study-progress:v1","comprehensionAnswers":[],"clozeAttempts":[],"masteredVocabulary":[]}'::jsonb,
  true
);

select is(
  (select completed_at from second_completion),
  (select completed_at from first_completion),
  'a later save keeps the moment the lesson was first finished'
);

create temporary table reopened on commit drop as
select * from public.save_lesson_progress(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '{"version":"study-progress:v1","comprehensionAnswers":[],"clozeAttempts":[],"masteredVocabulary":[]}'::jsonb,
  false
);

select is(
  (select completed_at from reopened),
  null,
  'unfinishing a lesson clears the completion mark'
);
select is(
  (select count(*)::integer from public.lesson_progress),
  1,
  'four saves left exactly one row'
);

-- Progress can only be written for a lesson the caller owns.
select throws_ok(
  $$select * from public.save_lesson_progress(
    '11111111-1111-4111-8111-111111111111',
    '55555555-5555-4555-8555-555555555555',
    '{"version":"study-progress:v1","comprehensionAnswers":[],"clozeAttempts":[],"masteredVocabulary":[]}'::jsonb,
    false
  )$$,
  'lesson not found for study progress',
  'progress cannot be written onto someone else''s lesson'
);

-- A job that never published a lesson has nothing to record progress against.
select throws_ok(
  $$select * from public.save_lesson_progress(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666',
    '{"version":"study-progress:v1","comprehensionAnswers":[],"clozeAttempts":[],"masteredVocabulary":[]}'::jsonb,
    false
  )$$,
  'lesson not found for study progress',
  'a job without a published lesson cannot hold progress'
);

-- The database refuses a payload that does not claim the schema it is read as.
select throws_ok(
  $$insert into public.lesson_progress (owner_user_id, lesson_id, job_id, state)
    select
      '11111111-1111-4111-8111-111111111111',
      lessons.id,
      '44444444-4444-4444-8444-444444444444',
      '{"comprehensionAnswers":[]}'::jsonb
    from public.lessons
    where lessons.job_id = '44444444-4444-4444-8444-444444444444'$$,
  '23514',
  null,
  'progress claiming an unknown schema version is rejected'
);

-- ---------------------------------------------------------------------------
-- Row-level security: progress is visible to its owner and to nobody else
-- ---------------------------------------------------------------------------

set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
select is(
  (select count(*)::integer from public.lesson_progress),
  1,
  'the owner reads their own progress'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select is(
  (select count(*)::integer from public.lesson_progress),
  0,
  'another signed-in learner reads none of it'
);
reset role;

select * from finish();
rollback;
