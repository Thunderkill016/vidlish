begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

select has_table('public', 'transcripts', 'transcripts exists');
select has_table('public', 'transcript_segments', 'transcript_segments exists');
select has_table('public', 'transcript_acquisition_attempts', 'attempts exists');
select is((select relrowsecurity from pg_class where oid = 'public.transcripts'::regclass), true, 'transcripts RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.transcript_segments'::regclass), true, 'segments RLS enabled');
select is((select relrowsecurity from pg_class where oid = 'public.transcript_acquisition_attempts'::regclass), true, 'attempts RLS enabled');
select hasnt_column('public', 'transcripts', 'language', 'transcript is not labeled English before the language gate');
select is(has_table_privilege('authenticated', 'public.transcripts', 'insert'), false, 'browser cannot insert transcripts');
select is(has_table_privilege('authenticated', 'public.transcript_segments', 'update'), false, 'browser cannot mutate segments');
select is(
  has_function_privilege(
    'authenticated',
    'public.persist_canonical_transcript(text,uuid,uuid,text,text,text,text,text,text[],text,text,text,text,bigint,integer,jsonb)',
    'execute'
  ),
  false,
  'browser cannot execute canonical persistence RPC'
);

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
) values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'normalizing_transcript', 'normalizing_transcript', 'sent'
);

create temporary table first_persist as
select * from public.persist_canonical_transcript(
  'attempt:success:one',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'dQw4w9WgXcQ',
  'supadata-native-caption',
  'supadata',
  'native_caption',
  'en',
  array['en'],
  'unknown',
  'unknown',
  repeat('a', 64),
  'transcript-normalization:v1',
  3000,
  42,
  '[
    {"id":"seg_11111111111111111111111111111111","position":0,"startMs":0,"endMs":1200,"text":"First source line","detectedLanguage":"en"},
    {"id":"seg_22222222222222222222222222222222","position":1,"startMs":1500,"endMs":3000,"text":"Second source line","detectedLanguage":"en"}
  ]'::jsonb
);

select is((select created from first_persist), true, 'first atomic persistence creates transcript');
select is((select count(*)::integer from public.transcripts), 1, 'one transcript persisted');
select is((select count(*)::integer from public.transcript_segments), 2, 'segments committed with transcript');
select is((select count(*)::integer from public.transcript_acquisition_attempts), 1, 'success attempt committed');
select is((select status::text from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'), 'checking_language', 'job advances only after commit');
select ok((select canonical_transcript_id is not null from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'), 'job points to canonical transcript');

create temporary table second_persist as
select * from public.persist_canonical_transcript(
  'attempt:success:one',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'dQw4w9WgXcQ',
  'supadata-native-caption',
  'supadata',
  'native_caption',
  'en',
  array['en'],
  'unknown',
  'unknown',
  repeat('a', 64),
  'transcript-normalization:v1',
  3000,
  42,
  '[
    {"id":"seg_11111111111111111111111111111111","position":0,"startMs":0,"endMs":1200,"text":"First source line","detectedLanguage":"en"},
    {"id":"seg_22222222222222222222222222222222","position":1,"startMs":1500,"endMs":3000,"text":"Second source line","detectedLanguage":"en"}
  ]'::jsonb
);

select is((select created from second_persist), false, 'retry reuses canonical artifact');
select is((select count(*)::integer from public.transcripts), 1, 'retry does not duplicate transcript');

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is((select count(*)::integer from public.transcripts), 0, 'cross-owner transcript read is hidden');
reset role;

select * from finish();
rollback;
