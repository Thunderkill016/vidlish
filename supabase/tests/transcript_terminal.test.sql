begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_function(
  'public', 'mark_transcript_exhausted', array['uuid', 'uuid', 'text'],
  'terminal transition function exists'
);
select has_function(
  'public', 'list_exhausted_transcript_strategies', array['uuid', 'uuid'],
  'exhausted-strategy lookup exists'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.mark_transcript_exhausted(uuid, uuid, text)',
    'execute'
  ),
  false,
  'browser roles cannot terminate jobs'
);
select is(
  has_function_privilege(
    'authenticated',
    'public.list_exhausted_transcript_strategies(uuid, uuid)',
    'execute'
  ),
  false,
  'browser roles cannot read strategy exhaustion'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
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
  'acquiring_transcript', 'acquiring_transcript', 'sent'
),
(
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'A2', 'fixture:v1', 'generation-pipeline:v1',
  'failed', 'checking_language', 'sent'
);

update public.lesson_jobs
set safe_error_code = 'VIDEO_LANGUAGE_UNSUPPORTED'
where id = '55555555-5555-4555-8555-555555555555';

-- A job whose only strategy gave up terminates with the transcript reason.
create temporary table first_exhaustion as
select * from public.mark_transcript_exhausted(
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'NO_USABLE_CAPTIONS'
);

select is(
  (select job_status from first_exhaustion), 'failed',
  'exhaustion terminates the job'
);
select is(
  (select safe_error_code from first_exhaustion), 'TRANSCRIPT_UNAVAILABLE',
  'exhaustion uses the transcript reason, not a language reason'
);
select is(
  (select changed from first_exhaustion), true,
  'first call reports a real transition'
);
select is(
  (select current_stage from public.lesson_jobs
   where id = '44444444-4444-4444-8444-444444444444'),
  'transcript_unavailable',
  'stage matches the terminal status'
);

-- Calling again must not double-write or change the outcome.
create temporary table second_exhaustion as
select * from public.mark_transcript_exhausted(
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  'NO_USABLE_CAPTIONS'
);

select is(
  (select changed from second_exhaustion), false,
  'repeat call is idempotent'
);
select is(
  (select job_status from second_exhaustion), 'failed',
  'repeat call still reports the committed status'
);

-- A job that already failed for language reasons keeps that reason.
create temporary table language_job as
select * from public.mark_transcript_exhausted(
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  'NO_USABLE_CAPTIONS'
);

select is(
  (select safe_error_code from language_job), 'VIDEO_LANGUAGE_UNSUPPORTED',
  'transcript exhaustion cannot overwrite a confirmed language verdict'
);
select is(
  (select changed from language_job), false,
  'already-terminal job reports no transition'
);

-- Ownership is enforced inside the function, not only by RLS.
select throws_ok(
  $$select * from public.mark_transcript_exhausted(
      '44444444-4444-4444-8444-444444444444',
      '22222222-2222-4222-8222-222222222222',
      'NO_USABLE_CAPTIONS'
    )$$,
  'generation job not found',
  'cross-owner termination is rejected'
);

-- Only non-retryable attempts count as an exhausted strategy.
insert into public.transcript_acquisition_attempts (
  attempt_key, owner_user_id, job_id, strategy_id, provider,
  result_kind, reason_code, latency_ms
) values
(
  'attempt:not-applicable',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'supadata-native-caption', 'supadata',
  'not_applicable', 'NO_USABLE_CAPTIONS', 120
),
(
  'attempt:retryable',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  'supadata-native-caption', 'supadata',
  'retryable_failure', 'PROVIDER_TIMEOUT', 8000
);

select is(
  (select count(*)::integer
   from public.list_exhausted_transcript_strategies(
     '44444444-4444-4444-8444-444444444444',
     '11111111-1111-4111-8111-111111111111'
   )),
  1,
  'a strategy is listed once regardless of attempt count'
);
select is(
  (select strategy_id
   from public.list_exhausted_transcript_strategies(
     '44444444-4444-4444-8444-444444444444',
     '11111111-1111-4111-8111-111111111111'
   )),
  'supadata-native-caption',
  'the non-retryable attempt marks the strategy exhausted'
);
select is(
  (select count(*)::integer
   from public.list_exhausted_transcript_strategies(
     '44444444-4444-4444-8444-444444444444',
     '22222222-2222-4222-8222-222222222222'
   )),
  0,
  'cross-owner strategy history is hidden'
);

-- A failed job must not hold an active-quota slot.
select is(
  (select count(*)::integer
   from public.lesson_jobs
   where owner_user_id = '11111111-1111-4111-8111-111111111111'
     and status not in ('completed', 'failed', 'cancelled')),
  0,
  'terminated jobs release the active-job slot'
);

select * from finish();
rollback;
