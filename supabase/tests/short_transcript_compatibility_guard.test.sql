begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

select has_trigger(
  'public',
  'lesson_jobs',
  'guard_weak_transcript_job_terminal_state',
  'weak transcript compatibility guard exists'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'b1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'guard-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, duration_ms, metadata_version
) values (
  'b2222222-2222-4222-8222-222222222222',
  'short123abc', 'Short guard fixture', 'Fixture channel', 41000, 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values
(
  'b3333333-3333-4333-8333-333333333333',
  'b1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'checking_language', 'checking_language', 'sent'
),
(
  'b4444444-4444-4444-8444-444444444444',
  'b1111111-1111-4111-8111-111111111111',
  'b2222222-2222-4222-8222-222222222222',
  'A2', 'fixture:v1', 'generation-pipeline:v1',
  'checking_language', 'checking_language', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  'b5555555-5555-4555-8555-555555555555',
  'b1111111-1111-4111-8111-111111111111',
  'b3333333-3333-4333-8333-333333333333',
  'b2222222-2222-4222-8222-222222222222',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('d', 64), 'transcript-normalization:v1', 40000, 1
);

insert into public.transcript_segments (
  id, transcript_id, owner_user_id, position, start_ms, end_ms, text
) values (
  'seg_dddddddddddddddddddddddddddddddd',
  'b5555555-5555-4555-8555-555555555555',
  'b1111111-1111-4111-8111-111111111111',
  0, 0, 40000, 'A short but valid English transcript fixture.'
);

update public.lesson_jobs
set canonical_transcript_id = 'b5555555-5555-4555-8555-555555555555'
where id = 'b3333333-3333-4333-8333-333333333333';

insert into public.language_eligibility_reports (
  id, owner_user_id, job_id, transcript_id, transcript_hash,
  detector_id, detector_version, policy_version, status, reason_code,
  english_share, reliable_coverage, coherent_english_duration_ms,
  reliable_english_word_count, reliable_analyzed_word_count,
  confidence_band, detected_languages, window_evidence,
  english_segment_ids, permitted_segment_ids, excluded_segment_ids
) values (
  'b6666666-6666-4666-8666-666666666666',
  'b1111111-1111-4111-8111-111111111111',
  'b3333333-3333-4333-8333-333333333333',
  'b5555555-5555-4555-8555-555555555555',
  repeat('d', 64),
  'franc-min', 'franc-min:6.2.0', 'original-english:v1',
  'insufficient_evidence', 'TRANSCRIPT_EVIDENCE_TOO_WEAK',
  1.0, 1.0, 40000, 90, 90, 'high', array['en'],
  '[{
    "windowId":"win_dddddddddddddddddddddddd",
    "segmentIds":["seg_dddddddddddddddddddddddddddddddd"],
    "startMs":0,
    "endMs":40000,
    "wordCount":90,
    "characterCount":500,
    "detectorCode":"eng",
    "detectedLanguage":"en",
    "reliability":"high",
    "rawBestScore":1.0,
    "rawSecondScore":0.5
  }]'::jsonb,
  array['seg_dddddddddddddddddddddddddddddddd'],
  array[]::text[],
  array['seg_dddddddddddddddddddddddddddddddd']
);

update public.lesson_jobs
set language_eligibility_report_id = 'b6666666-6666-4666-8666-666666666666',
    status = 'acquiring_transcript',
    current_stage = 'acquiring_transcript',
    safe_error_code = null
where id = 'b3333333-3333-4333-8333-333333333333';

select is(
  (select status::text from public.lesson_jobs where id = 'b3333333-3333-4333-8333-333333333333'),
  'failed',
  'insufficient evidence cannot return a job to an active status'
);
select is(
  (select current_stage from public.lesson_jobs where id = 'b3333333-3333-4333-8333-333333333333'),
  'transcript_unavailable',
  'compatibility guard uses the stage understood by the deployed UI'
);
select is(
  (select safe_error_code from public.lesson_jobs where id = 'b3333333-3333-4333-8333-333333333333'),
  'TRANSCRIPT_UNAVAILABLE',
  'compatibility guard uses the code understood by the deployed contract'
);

update public.lesson_jobs
set status = 'acquiring_transcript',
    current_stage = 'acquiring_transcript'
where id = 'b4444444-4444-4444-8444-444444444444';

select is(
  (select status::text from public.lesson_jobs where id = 'b4444444-4444-4444-8444-444444444444'),
  'acquiring_transcript',
  'ordinary transcript acquisition remains active without a weak report'
);
select is(
  (select count(*)::integer from public.language_eligibility_reports where job_id = 'b3333333-3333-4333-8333-333333333333'),
  1,
  'guard does not alter the evidence report'
);

select * from finish();
rollback;
