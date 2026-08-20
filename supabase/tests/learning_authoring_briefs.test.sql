begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

-- Chỗ nghỉ giữa hai lời gọi model. Brief chứa đáp án của hoạt động nhớ lại nên
-- trình duyệt không được đọc, kể cả chủ sở hữu.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'owner-v2@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

insert into public.videos (
  id, youtube_video_id, title, channel_name, metadata_version
) values (
  '33333333-3333-4333-8333-333333333333',
  'dQw4w9WgXcQ', 'Fixture learning video', 'Fixture channel', 'fixture:v1'
);

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status
) values (
  '44444444-4444-4444-8444-444444444444',
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'fixture:v1', 'generation-pipeline:v1',
  'completed', 'completed', 'sent'
);

insert into public.transcripts (
  id, owner_user_id, job_id, video_id, strategy_id, provider,
  source_type, declared_language, available_languages, track_kind,
  translation_status, normalized_hash, normalization_version,
  duration_ms, segment_count
) values (
  '55555555-5555-4555-8555-555555555555',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '33333333-3333-4333-8333-333333333333',
  'supadata-native-caption', 'supadata', 'native_caption', 'en', array['en'],
  'unknown', 'unknown', repeat('a', 64), 'transcript-normalization:v1', 40000, 2
);

update public.lesson_jobs
set canonical_transcript_id = '55555555-5555-4555-8555-555555555555'
where id = '44444444-4444-4444-8444-444444444444';

insert into public.lessons (
  id, owner_user_id, job_id, transcript_id, video_id, cefr_level,
  schema_version, pipeline_version, prompt_version, model_id,
  transcript_hash, input_tokens, output_tokens, draft, citations
) values (
  '66666666-6666-4666-8666-666666666666',
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '33333333-3333-4333-8333-333333333333',
  'B1', 'lesson:v1', 'lesson-pipeline:v1', 'lesson-prompt:v1',
  'fixture-lesson-model', repeat('a', 64), 1, 1,
  '{"titleVi":"Legacy parent"}'::jsonb,
  '[{"segmentId":"seg_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","startMs":0,"endMs":1000,"text":"one"}]'::jsonb
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'stranger-brief@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

select lives_ok(
  $$select public.save_learning_authoring_brief(
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444',
    '{"briefVersion":"learning-authoring-brief:v2","targetItems":[{"surfaceForm":"a member of"}]}'::jsonb,
    '{"durationMs":60000}'::jsonb
  )$$,
  'brief của job mình lưu được'
);

-- Chạy lại phải ghi đè, không được nhân đôi: workflow thử lại một bước là
-- chuyện bình thường.
select lives_ok(
  $$select public.save_learning_authoring_brief(
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444',
    '{"briefVersion":"learning-authoring-brief:v2","targetItems":[{"surfaceForm":"explore"}]}'::jsonb,
    '{"durationMs":60000}'::jsonb
  )$$,
  'lưu lại lần nữa cho cùng job không lỗi'
);

select is(
  (select count(*)::integer from public.learning_authoring_briefs
   where job_id = '44444444-4444-4444-8444-444444444444'),
  1,
  'mỗi job đúng một brief'
);

select throws_ok(
  $$select public.save_learning_authoring_brief(
    '22222222-2222-4222-8222-222222222222',
    '44444444-4444-4444-8444-444444444444',
    '{"briefVersion":"learning-authoring-brief:v2"}'::jsonb,
    '{}'::jsonb
  )$$,
  'owned lesson job not found',
  'không gắn brief vào job của người khác'
);

-- Thiếu khoá phiên bản phải bị chặn. `NULL = '...'` là NULL mà CHECK chấp nhận,
-- nên ràng buộc dùng `is not distinct from`.
select throws_ok(
  $$select public.save_learning_authoring_brief(
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444',
    '{"targetItems":[]}'::jsonb,
    '{}'::jsonb
  )$$,
  '23514',
  null,
  'brief không có briefVersion bị từ chối'
);

select * from finish();
rollback;
