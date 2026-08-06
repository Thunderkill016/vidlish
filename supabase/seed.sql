-- Local/preview-only seed data. This file is not a production migration.

insert into public.beta_access (email_normalized, is_active)
values
  ('invited@example.com', true),
  ('learning-preview@example.com', true)
on conflict (email_normalized)
do update set is_active = excluded.is_active, updated_at = now();

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '133f314f-4bfd-46aa-8fc6-b6a33252232b',
  'authenticated', 'authenticated', 'learning-preview@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
)
on conflict (id) do nothing;

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  '70000000-0000-4000-8000-000000000001',
  'M7lc1UVf-VE',
  'YouTube Embedded Players and Player Parameters',
  'Google for Developers',
  'learning-lab-fixture:v1'
)
on conflict (id) do nothing;

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  '70000000-0000-4000-8000-000000000002',
  '133f314f-4bfd-46aa-8fc6-b6a33252232b',
  '70000000-0000-4000-8000-000000000001',
  'B1', 'learning-lab-fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
)
on conflict (id) do nothing;

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  '70000000-0000-4000-8000-000000000003',
  '133f314f-4bfd-46aa-8fc6-b6a33252232b',
  '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000001',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('e', 64), 'transcript-normalization:v1',
  24000, 1
)
on conflict (id) do nothing;

update public.lesson_jobs
set canonical_transcript_id = '70000000-0000-4000-8000-000000000003'
where id = '70000000-0000-4000-8000-000000000002';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  '70000000-0000-4000-8000-000000000004',
  '133f314f-4bfd-46aa-8fc6-b6a33252232b',
  '70000000-0000-4000-8000-000000000002',
  '70000000-0000-4000-8000-000000000003',
  '70000000-0000-4000-8000-000000000001',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-lesson-model', repeat('e', 64), 1, 1,
  '{"titleVi":"Golden learning lab fixture"}'::jsonb,
  '[{"segmentId":"seg_eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","startMs":16000,"endMs":24000,"text":"My name is Jeff Posnick, and I am a member of the Developer Relations team at Google."}]'::jsonb
)
on conflict (id) do nothing;

insert into public.lesson_versions (
  id, lesson_id, owner_user_id, schema_version, blueprint
) values (
  '77777777-7777-4777-8777-777777777777',
  '70000000-0000-4000-8000-000000000004',
  '133f314f-4bfd-46aa-8fc6-b6a33252232b',
  'lesson:v2',
  '{
    "schemaVersion":"lesson:v2",
    "fixtureId":"golden-session-v1",
    "activities":[
      {"id":"activity_gist"},
      {"id":"activity_meaning"},
      {"id":"activity_recall"},
      {"id":"activity_transfer"},
      {"id":"activity_exit"}
    ]
  }'::jsonb
)
on conflict (id) do nothing;
