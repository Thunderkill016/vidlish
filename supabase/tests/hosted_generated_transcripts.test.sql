begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

select has_table('public', 'transcript_provider_jobs', 'provider job metadata exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.transcript_provider_jobs'::regclass),
  true,
  'provider jobs RLS enabled'
);
select is(
  has_table_privilege('authenticated', 'public.transcript_provider_jobs', 'select'),
  false,
  'provider job IDs are not browser-readable'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.record_transcript_provider_job(uuid,uuid,text,text,text,text,text)',
    'execute'
  ),
  false,
  'browser cannot record provider jobs'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.persist_canonical_transcript_v2(text,uuid,uuid,text,text,text,text,text,text,text,text,text[],text,text,text,text,bigint,integer,jsonb)',
    'execute'
  ),
  false,
  'browser cannot persist generated transcripts'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  '33333333-3333-4333-8333-333333333333',
  'nocaption01', 'No caption fixture', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'acquiring_transcript', 'trying_transcript_fallback', 'sent'
);

select lives_ok(
  $$select public.record_transcript_provider_job(
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444',
    'supadata-generated-transcript',
    'supadata',
    'provider_job_1',
    'provider_request_start',
    'metered_medium'
  )$$,
  'pending provider job metadata is recorded server-side'
);
select is(
  (select count(*)::integer from public.transcript_provider_jobs),
  1,
  'one provider job row exists'
);
select is(
  (select status from public.transcript_provider_jobs),
  'pending',
  'provider job starts pending'
);

create temporary table generated_first as
select * from public.persist_canonical_transcript_v2(
  'attempt:generated:success',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'nocaption01',
  'supadata-generated-transcript',
  'supadata',
  'hosted_generated_transcript',
  'provider_request_complete',
  'provider_job_1',
  'metered_medium',
  'en',
  array['en'],
  'unknown',
  'original',
  repeat('d', 64),
  'transcript-normalization:v1',
  60000,
  120,
  '[
    {"id":"seg_11111111111111111111111111111111","position":0,"startMs":0,"endMs":30000,"text":"Generated original source speech one","detectedLanguage":"en"},
    {"id":"seg_22222222222222222222222222222222","position":1,"startMs":30000,"endMs":60000,"text":"Generated original source speech two","detectedLanguage":"en"}
  ]'::jsonb
);

select is((select created from generated_first), true, 'first generated persistence creates transcript');
select is((select strategy_id from public.transcripts), 'supadata-generated-transcript', 'generated strategy provenance stored');
select is((select source_type from public.transcripts), 'hosted_generated_transcript', 'generated source provenance stored');
select is((select provider_request_id from public.transcripts), 'provider_request_complete', 'request ID stored without response body');
select is((select count(*)::integer from public.transcript_segments), 2, 'timestamp segments committed');
select is((select status from public.transcript_provider_jobs), 'completed', 'provider job marked completed atomically');
select is((select cost_band from public.transcript_acquisition_attempts where result_kind = 'success'), 'metered_medium', 'success attempt records cost band');
select is((select status::text from public.lesson_jobs), 'checking_language', 'generated transcript still enters language gate');

create temporary table generated_retry as
select * from public.persist_canonical_transcript_v2(
  'attempt:generated:success',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'nocaption01',
  'supadata-generated-transcript',
  'supadata',
  'hosted_generated_transcript',
  'provider_request_complete',
  'provider_job_1',
  'metered_medium',
  'en',
  array['en'],
  'unknown',
  'original',
  repeat('d', 64),
  'transcript-normalization:v1',
  60000,
  120,
  '[
    {"id":"seg_11111111111111111111111111111111","position":0,"startMs":0,"endMs":30000,"text":"Generated original source speech one","detectedLanguage":"en"},
    {"id":"seg_22222222222222222222222222222222","position":1,"startMs":30000,"endMs":60000,"text":"Generated original source speech two","detectedLanguage":"en"}
  ]'::jsonb
);

select is((select created from generated_retry), false, 'retry reuses canonical transcript');
select is((select count(*)::integer from public.transcripts), 1, 'retry does not duplicate transcript');
select is((select count(*)::integer from public.transcript_provider_jobs), 1, 'retry does not duplicate provider job metadata');

select * from finish();
rollback;
