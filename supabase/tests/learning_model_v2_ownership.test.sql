begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
(
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner-v2-fk@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
),
(
  '00000000-0000-0000-0000-000000000000',
  'a2222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'other-v2-fk@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  'a3333333-3333-4333-8333-333333333333',
  'dQw4w9WgXcQ', 'Ownership fixture', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  'a4444444-4444-4444-8444-444444444444',
  'a1111111-1111-4111-8111-111111111111',
  'a3333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  'a5555555-5555-4555-8555-555555555555',
  'a1111111-1111-4111-8111-111111111111',
  'a4444444-4444-4444-8444-444444444444',
  'a3333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('c', 64), 'transcript-normalization:v1', 1000, 1
);

update public.lesson_jobs
set canonical_transcript_id = 'a5555555-5555-4555-8555-555555555555'
where id = 'a4444444-4444-4444-8444-444444444444';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  'a6666666-6666-4666-8666-666666666666',
  'a1111111-1111-4111-8111-111111111111',
  'a4444444-4444-4444-8444-444444444444',
  'a5555555-5555-4555-8555-555555555555',
  'a3333333-3333-4333-8333-333333333333',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-lesson-model', repeat('c', 64), 1, 1,
  '{"titleVi":"Ownership parent"}'::jsonb,
  '[{"segmentId":"seg_cccccccccccccccccccccccccccccccc","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

select throws_ok(
  $$insert into public.lesson_versions (
      id, lesson_id, owner_user_id, schema_version, blueprint
    ) values (
      'a7777777-7777-4777-8777-777777777777',
      'a6666666-6666-4666-8666-666666666666',
      'a2222222-2222-4222-8222-222222222222',
      'lesson:v2',
      '{
        "schemaVersion":"lesson:v2",
        "activities":[{"id":"activity_gist","phase":"gist"}]
      }'::jsonb
    )$$,
  '23503',
  null,
  'lesson version owner must match the parent lesson owner'
);

insert into public.lesson_versions (
  id, lesson_id, owner_user_id, schema_version, blueprint
) values (
  'a7777777-7777-4777-8777-777777777777',
  'a6666666-6666-4666-8666-666666666666',
  'a1111111-1111-4111-8111-111111111111',
  'lesson:v2',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[{"id":"activity_gist","phase":"gist"}]
  }'::jsonb
);

select throws_ok(
  $$insert into public.lesson_sessions (
      id, lesson_version_id, owner_user_id, status,
      current_phase, current_activity_id, started_at
    ) values (
      'a8888888-8888-4888-8888-888888888888',
      'a7777777-7777-4777-8777-777777777777',
      'a2222222-2222-4222-8222-222222222222',
      'in_progress', 'gist', 'activity_gist', now()
    )$$,
  '23503',
  null,
  'session owner must match the lesson version owner'
);

insert into public.lesson_sessions (
  id, lesson_version_id, owner_user_id, status,
  current_phase, current_activity_id, started_at
) values (
  'a8888888-8888-4888-8888-888888888888',
  'a7777777-7777-4777-8777-777777777777',
  'a1111111-1111-4111-8111-111111111111',
  'in_progress', 'gist', 'activity_gist', now()
);

select throws_ok(
  $$insert into public.activity_attempts (
      session_id, owner_user_id, activity_id, attempt_number,
      idempotency_key, response, evaluation
    ) values (
      'a8888888-8888-4888-8888-888888888888',
      'a2222222-2222-4222-8222-222222222222',
      'activity_gist', 1,
      'a9999999-9999-4999-8999-999999999999',
      '{"kind":"choice","optionId":"option_embedded_player"}'::jsonb,
      '{"verdict":"correct"}'::jsonb
    )$$,
  '23503',
  null,
  'attempt owner must match the session owner'
);

select throws_ok(
  $$insert into public.activity_attempts (
      session_id, owner_user_id, activity_id, attempt_number,
      idempotency_key, response, evaluation
    ) values (
      'a8888888-8888-4888-8888-888888888888',
      'a1111111-1111-4111-8111-111111111111',
      'activity_gist', 1,
      'ab999999-9999-4999-8999-999999999999',
      '{"kind":"text","text":"raw learner answer"}'::jsonb,
      '{"verdict":"incorrect"}'::jsonb
    )$$,
  '23514',
  null,
  'database rejects unrestricted learner text in attempt response'
);

select throws_ok(
  $$insert into public.learning_item_states (
      owner_user_id, item_key, source_lesson_version_id
    ) values (
      'a2222222-2222-4222-8222-222222222222',
      'pay-attention-to',
      'a7777777-7777-4777-8777-777777777777'
    )$$,
  '23503',
  null,
  'review-state owner must match the source lesson version owner'
);

select * from finish();
rollback;
