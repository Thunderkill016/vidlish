begin;

create extension if not exists pgtap with schema extensions;
select plan(16);

-- Không gì tạo ra một hàng `lesson_versions` ngoài fixture CI cho tới khi có
-- hàm này. Đây là những khẳng định cho đường ghi đầu tiên của nội dung v2.

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

-- Người thứ hai, để chứng minh chốt sở hữu từ chối bài học mượn.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '22222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'stranger-publish@example.com', '', now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now()
);

create temporary table published on commit drop as
select * from public.publish_lesson_version(
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[
      {"id":"activity_gist","phase":"gist"},
      {"id":"activity_transfer","phase":"transfer"}
    ]
  }'::jsonb
);

select is((select created from published), true, 'lần publish đầu tạo bản v2');
select is(
  (select count(*)::integer from public.lesson_versions
   where lesson_id = '66666666-6666-4666-8666-666666666666'),
  1,
  'đúng một bản v2 cho mỗi bài học'
);
select is(
  (select schema_version from public.lesson_versions
   where lesson_id = '66666666-6666-4666-8666-666666666666'),
  'lesson:v2',
  'nhãn schema do hàm tự viết, không nhận từ người gọi'
);

-- Gọi lại với blueprint khác: phải trả về bản đã có, không ghi đè. Blueprint đã
-- publish là thứ phiên học đang chạy trên đó.
create temporary table republished on commit drop as
select * from public.publish_lesson_version(
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[
      {"id":"activity_gist","phase":"gist"},
      {"id":"activity_notice","phase":"notice"}
    ]
  }'::jsonb
);

select is((select created from republished), false, 'gọi lại không tạo bản mới');
select is(
  (select lesson_version_id from republished),
  (select lesson_version_id from published),
  'gọi lại trả về đúng bản đã publish'
);
select is(
  (select blueprint -> 'activities' -> 1 ->> 'id' from public.lesson_versions
   where lesson_id = '66666666-6666-4666-8666-666666666666'),
  'activity_transfer',
  'blueprint đã publish không bị ghi đè'
);

select throws_ok(
  $$select * from public.publish_lesson_version(
    '22222222-2222-4222-8222-222222222222',
    '66666666-6666-4666-8666-666666666666',
    '{"schemaVersion":"lesson:v2","activities":[{"id":"activity_gist","phase":"gist"}]}'::jsonb
  )$$,
  'owned lesson not found',
  'database từ chối gắn blueprint vào bài học của người khác'
);

-- Blueprint thiếu khoá schemaVersion phải bị từ chối — kể cả khi bài học này đã
-- publish rồi. Đây chính là ca mà ràng buộc bảng không che được: luật
-- publish-một-lần trả về sớm nên không có insert nào để CHECK chạy.
select throws_ok(
  $$select * from public.publish_lesson_version(
    '11111111-1111-4111-8111-111111111111',
    '66666666-6666-4666-8666-666666666666',
    '{"activities":[{"id":"activity_gist","phase":"gist"}]}'::jsonb
  )$$,
  'blueprint schema version must be lesson:v2',
  'blueprint hỏng bị từ chối kể cả khi bài học đã publish'
);

-- ---------------------------------------------------------------------------
-- publish_lesson_version_for_job: v2 without a v1 lesson
-- ---------------------------------------------------------------------------

select has_column('public', 'lesson_versions', 'job_id', 'lesson_versions gắn được vào job');
select is(
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'lesson_versions' and column_name = 'lesson_id'),
  'YES',
  'lesson_id không còn bắt buộc, nên v2 tồn tại được khi v1 hỏng'
);

create temporary table job_published on commit drop as
select * from public.publish_lesson_version_for_job(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[{"id":"activity_gist","phase":"gist"}]
  }'::jsonb
);

select is((select created from job_published), true, 'publish theo job tạo bản mới');
select is(
  (select lesson_id is null from public.lesson_versions
    where id = (select lesson_version_id from job_published)),
  true,
  'blueprint publish theo job không cần bài học v1 làm cha'
);

-- Publish-once, đúng như bản theo lesson: người học có thể đang chạy phiên trên
-- blueprint này, và thay nó là đổi bài dưới chân họ.
create temporary table job_republished on commit drop as
select * from public.publish_lesson_version_for_job(
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444',
  '{
    "schemaVersion":"lesson:v2",
    "activities":[{"id":"activity_other","phase":"gist"}]
  }'::jsonb
);

select is((select created from job_republished), false, 'gọi lại trả về bản đã có');
select is(
  (select lesson_version_id from job_republished),
  (select lesson_version_id from job_published),
  'gọi lại không ghi đè blueprint đang được học'
);

select throws_ok(
  $$select * from public.publish_lesson_version_for_job(
    '22222222-2222-4222-8222-222222222222',
    '44444444-4444-4444-8444-444444444444',
    '{"schemaVersion":"lesson:v2","activities":[]}'::jsonb
  )$$,
  'owned job not found',
  'người khác không gắn được blueprint vào job của mình'
);

select throws_ok(
  $$select * from public.publish_lesson_version_for_job(
    '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444',
    '{"schemaVersion":"lesson:v1","activities":[]}'::jsonb
  )$$,
  'blueprint schema version must be lesson:v2',
  'blueprint sai schema bị từ chối kể cả khi job đã publish'
);


select * from finish();
rollback;
