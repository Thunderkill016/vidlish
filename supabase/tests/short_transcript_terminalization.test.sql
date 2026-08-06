begin;

create extension if not exists pgtap with schema extensions;

select plan(7);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'short-owner@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, duration_ms, metadata_version
) values
(
  'a2222222-2222-4222-8222-222222222222',
  'xbse7sM341o', 'Short fixture', 'Fixture channel', 41000, 'fixture:v1'
),
(
  'a3333333-3333-4333-8333-333333333333',
  'abcdefghijk', 'No transcript fixture', 'Fixture channel', 120000, 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values
(
  'a4444444-4444-4444-8444-444444444444',
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'acquiring_transcript', 'acquiring_transcript', 'sent'
),
(
  'a5555555-5555-4555-8555-555555555555',
  'a1111111-1111-4111-8111-111111111111',
  'a3333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'acquiring_transcript', 'acquiring_transcript', 'sent'
);

create temporary table weak_result as
select * from public.mark_transcript_exhausted(
  'a4444444-4444-4444-8444-444444444444',
  'a1111111-1111-4111-8111-111111111111',
  'TRANSCRIPT_EVIDENCE_TOO_WEAK'
);

select is(
  (select job_status from weak_result),
  'failed',
  'weak transcript evidence terminalizes the job'
);
select is(
  (select safe_error_code from weak_result),
  'TRANSCRIPT_EVIDENCE_TOO_WEAK',
  'RPC returns the learner-safe weak evidence code'
);
select is(
  (select current_stage from public.lesson_jobs where id = 'a4444444-4444-4444-8444-444444444444'),
  'transcript_evidence_too_weak',
  'job records the weak evidence terminal stage'
);
select is(
  (select safe_error_code from public.lesson_jobs where id = 'a4444444-4444-4444-8444-444444444444'),
  'TRANSCRIPT_EVIDENCE_TOO_WEAK',
  'job persists the weak evidence code'
);

select is(
  (
    select safe_error_code
    from public.mark_transcript_exhausted(
      'a4444444-4444-4444-8444-444444444444',
      'a1111111-1111-4111-8111-111111111111',
      'NO_USABLE_TRANSCRIPT'
    )
  ),
  'TRANSCRIPT_EVIDENCE_TOO_WEAK',
  'a later retry does not overwrite the original terminal outcome'
);

create temporary table unavailable_result as
select * from public.mark_transcript_exhausted(
  'a5555555-5555-4555-8555-555555555555',
  'a1111111-1111-4111-8111-111111111111',
  'NO_USABLE_TRANSCRIPT'
);

select is(
  (select safe_error_code from unavailable_result),
  'TRANSCRIPT_UNAVAILABLE',
  'missing transcript keeps the existing generic code'
);
select is(
  (select current_stage from public.lesson_jobs where id = 'a5555555-5555-4555-8555-555555555555'),
  'transcript_unavailable',
  'missing transcript keeps the existing terminal stage'
);

select * from finish();
rollback;
