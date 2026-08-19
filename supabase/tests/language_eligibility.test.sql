begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

select has_table('public', 'language_eligibility_reports', 'language reports exist');
select has_table('public', 'language_eligible_segments', 'eligible segment allowlist exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.language_eligibility_reports'::regclass),
  true,
  'language reports RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.language_eligible_segments'::regclass),
  true,
  'eligible segments RLS enabled'
);
select is(
  has_table_privilege('authenticated', 'public.language_eligibility_reports', 'insert'),
  false,
  'browser cannot insert language reports'
);
select is(
  has_table_privilege('authenticated', 'public.language_eligible_segments', 'insert'),
  false,
  'browser cannot write the downstream allowlist'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.persist_language_eligibility(uuid,uuid,text,text,text,text,text,text,double precision,double precision,bigint,integer,integer,text,text[],jsonb,text[],text[],text[])',
    'execute'
  ),
  false,
  'browser cannot execute the language decision RPC'
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
) values
(
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'checking_language', 'checking_language', 'sent'
),
(
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'A2', 'fixture:v1', 'generation-pipeline:v1',
  'checking_language', 'checking_language', 'sent'
),
(
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B2', 'fixture:v1', 'generation-pipeline:v1',
  'checking_language', 'checking_language', 'sent'
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
  'unknown', 'unknown', repeat('a', 64), 'transcript-normalization:v1', 90000, 3
),
(
  '75555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('b', 64), 'transcript-normalization:v1', 90000, 3
),
(
  '76666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  '33333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('c', 64), 'transcript-normalization:v1', 30000, 3
);

insert into public.transcript_segments (
  id, transcript_id, owner_user_id, position, start_ms, end_ms, text
)
select segment_id, transcript_id, '11111111-1111-4111-8111-111111111111', position, start_ms, end_ms, text
from (values
  ('seg_11111111111111111111111111111111', '74444444-4444-4444-8444-444444444444'::uuid, 0, 0, 30000, 'English source segment one'),
  ('seg_22222222222222222222222222222222', '74444444-4444-4444-8444-444444444444'::uuid, 1, 30000, 60000, 'English source segment two'),
  ('seg_33333333333333333333333333333333', '74444444-4444-4444-8444-444444444444'::uuid, 2, 60000, 90000, 'English source segment three'),
  ('seg_11111111111111111111111111111111', '75555555-5555-4555-8555-555555555555'::uuid, 0, 0, 30000, 'Vietnamese source segment one'),
  ('seg_22222222222222222222222222222222', '75555555-5555-4555-8555-555555555555'::uuid, 1, 30000, 60000, 'Vietnamese source segment two'),
  ('seg_33333333333333333333333333333333', '75555555-5555-4555-8555-555555555555'::uuid, 2, 60000, 90000, 'Vietnamese source segment three'),
  ('seg_11111111111111111111111111111111', '76666666-6666-4666-8666-666666666666'::uuid, 0, 0, 10000, 'Short segment one'),
  ('seg_22222222222222222222222222222222', '76666666-6666-4666-8666-666666666666'::uuid, 1, 10000, 20000, 'Short segment two'),
  ('seg_33333333333333333333333333333333', '76666666-6666-4666-8666-666666666666'::uuid, 2, 20000, 30000, 'Short segment three')
) as source(segment_id, transcript_id, position, start_ms, end_ms, text);

update public.lesson_jobs set canonical_transcript_id = case id
  when '44444444-4444-4444-8444-444444444444' then '74444444-4444-4444-8444-444444444444'::uuid
  when '55555555-5555-4555-8555-555555555555' then '75555555-5555-4555-8555-555555555555'::uuid
  when '66666666-6666-4666-8666-666666666666' then '76666666-6666-4666-8666-666666666666'::uuid
end;

create temporary table eligible_first as
select * from public.persist_language_eligibility(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  repeat('a', 64), 'franc-min', 'franc-min:6.2.0', 'original-english:v1',
  'eligible', 'SUFFICIENT_ORIGINAL_ENGLISH',
  1.0, 1.0, 90000, 150, 150, 'high', array['en'],
  '[{
    "windowId":"win_111111111111111111111111",
    "segmentIds":[
      "seg_11111111111111111111111111111111",
      "seg_22222222222222222222222222222222",
      "seg_33333333333333333333333333333333"
    ],
    "startMs":0,
    "endMs":90000,
    "wordCount":150,
    "characterCount":900,
    "detectorCode":"eng",
    "detectedLanguage":"en",
    "reliability":"high",
    "rawBestScore":1.0,
    "rawSecondScore":0.5
  }]'::jsonb,
  array[
    'seg_11111111111111111111111111111111',
    'seg_22222222222222222222222222222222',
    'seg_33333333333333333333333333333333'
  ],
  array[
    'seg_11111111111111111111111111111111',
    'seg_22222222222222222222222222222222',
    'seg_33333333333333333333333333333333'
  ],
  array[]::text[]
);

select is((select created from eligible_first), true, 'eligible decision creates one report');
select is((select report_status from eligible_first), 'eligible', 'eligible status returned');
select is((select count(*)::integer from public.language_eligibility_reports), 1, 'one report persisted');
select is((select count(*)::integer from public.language_eligible_segments), 3, 'English allowlist committed');
select is((select status::text from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'), 'analyzing_video', 'eligible job unlocks analysis');
select is((select safe_error_code is null from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'), true, 'eligible job has no safe error');
select is(
  (select jsonb_array_length(window_evidence) from public.language_eligibility_reports where job_id = '44444444-4444-4444-8444-444444444444'),
  1,
  'raw detector window evidence is retained'
);
select is(
  (
    select count(*)::integer
    from public.language_eligibility_reports
    cross join lateral jsonb_array_elements(window_evidence) as evidence
    where evidence ? 'text'
  ),
  0,
  'window evidence never stores transcript text'
);

create temporary table eligible_retry as
select * from public.persist_language_eligibility(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  repeat('a', 64), 'franc-min', 'franc-min:6.2.0', 'original-english:v1',
  'ineligible', 'INSUFFICIENT_ORIGINAL_ENGLISH',
  0.0, 1.0, 0, 0, 150, 'high', array['vie'],
  '[{
    "windowId":"win_111111111111111111111111",
    "segmentIds":[
      "seg_11111111111111111111111111111111",
      "seg_22222222222222222222222222222222",
      "seg_33333333333333333333333333333333"
    ],
    "startMs":0,
    "endMs":90000,
    "wordCount":150,
    "characterCount":900,
    "detectorCode":"vie",
    "detectedLanguage":"vie",
    "reliability":"high",
    "rawBestScore":1.0,
    "rawSecondScore":0.5
  }]'::jsonb,
  array[]::text[], array[]::text[],
  array[
    'seg_11111111111111111111111111111111',
    'seg_22222222222222222222222222222222',
    'seg_33333333333333333333333333333333'
  ]
);

select is((select created from eligible_retry), false, 'retry reuses committed decision');
select is((select report_status from eligible_retry), 'eligible', 'database returns the committed status');
select is((select count(*)::integer from public.language_eligibility_reports), 1, 'retry does not duplicate report');
select is((select status::text from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'), 'analyzing_video', 'contradictory retry cannot reverse eligibility');

create temporary table ineligible_result as
select * from public.persist_language_eligibility(
  '11111111-1111-4111-8111-111111111111',
  '55555555-5555-4555-8555-555555555555',
  repeat('b', 64), 'franc-min', 'franc-min:6.2.0', 'original-english:v1',
  'ineligible', 'INSUFFICIENT_ORIGINAL_ENGLISH',
  0.0, 1.0, 0, 0, 180, 'high', array['vie'],
  '[{
    "windowId":"win_222222222222222222222222",
    "segmentIds":[
      "seg_11111111111111111111111111111111",
      "seg_22222222222222222222222222222222",
      "seg_33333333333333333333333333333333"
    ],
    "startMs":0,
    "endMs":90000,
    "wordCount":180,
    "characterCount":1000,
    "detectorCode":"vie",
    "detectedLanguage":"vie",
    "reliability":"high",
    "rawBestScore":1.0,
    "rawSecondScore":0.4
  }]'::jsonb,
  array[]::text[], array[]::text[],
  array[
    'seg_11111111111111111111111111111111',
    'seg_22222222222222222222222222222222',
    'seg_33333333333333333333333333333333'
  ]
);

select is((select report_status from ineligible_result), 'ineligible', 'ineligible decision returned');
select is((select status::text from public.lesson_jobs where id = '55555555-5555-4555-8555-555555555555'), 'failed', 'confirmed non-English fails closed');
select is((select safe_error_code from public.lesson_jobs where id = '55555555-5555-4555-8555-555555555555'), 'VIDEO_LANGUAGE_UNSUPPORTED', 'canonical language error persisted');
select is((select count(*)::integer from public.language_eligible_segments where report_id = (select report_id from ineligible_result)), 0, 'ineligible report permits no evidence');

create temporary table weak_result as
select * from public.persist_language_eligibility(
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  repeat('c', 64), 'franc-min', 'franc-min:6.2.0', 'original-english:v1',
  'insufficient_evidence', 'TRANSCRIPT_EVIDENCE_TOO_WEAK',
  1.0, 0.25, 30000, 40, 40, 'low', array['en'],
  '[{
    "windowId":"win_333333333333333333333333",
    "segmentIds":[
      "seg_11111111111111111111111111111111",
      "seg_22222222222222222222222222222222",
      "seg_33333333333333333333333333333333"
    ],
    "startMs":0,
    "endMs":30000,
    "wordCount":40,
    "characterCount":200,
    "detectorCode":"eng",
    "detectedLanguage":"en",
    "reliability":"low",
    "rawBestScore":0.7,
    "rawSecondScore":0.68
  }]'::jsonb,
  array[
    'seg_11111111111111111111111111111111',
    'seg_22222222222222222222222222222222',
    'seg_33333333333333333333333333333333'
  ],
  array[]::text[],
  array[
    'seg_11111111111111111111111111111111',
    'seg_22222222222222222222222222222222',
    'seg_33333333333333333333333333333333'
  ]
);

select is((select report_status from weak_result), 'insufficient_evidence', 'weak evidence stays distinct from unsupported language');
select is((select status::text from public.lesson_jobs where id = '66666666-6666-4666-8666-666666666666'), 'failed', 'weak evidence cannot return to an active polling state');
select is((select safe_error_code from public.lesson_jobs where id = '66666666-6666-4666-8666-666666666666'), 'TRANSCRIPT_UNAVAILABLE', 'weak evidence uses the error code understood by the deployed runtime');

set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-4222-8222-222222222222';
select is((select count(*)::integer from public.language_eligibility_reports), 0, 'cross-owner reports are hidden');
select is((select count(*)::integer from public.language_eligible_segments), 0, 'cross-owner allowlist is hidden');
reset role;

select * from finish();
rollback;