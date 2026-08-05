begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_function('public', 'expire_stalled_lesson_jobs', 'watchdog cho giai đoạn soạn bài tồn tại');
select is(
  has_function_privilege('authenticated', 'public.expire_stalled_lesson_jobs(interval)', 'execute'),
  false,
  'trình duyệt không gọi được watchdog'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000','11111111-1111-4111-8111-111111111111',
  'authenticated','authenticated','owner@example.com','',now(),
  '{"provider":"email","providers":["email"]}','{}',now(),now()
);

insert into public.videos (id, youtube_video_id, title, channel_name, metadata_version)
values ('33333333-3333-4333-8333-333333333333','dQw4w9WgXcQ','V','C','fixture:v1');

insert into public.lesson_jobs (
  id, owner_user_id, video_id, cefr_level, metadata_version,
  pipeline_version, status, current_stage, dispatch_status, updated_at
) values
  ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111',
   '33333333-3333-4333-8333-333333333333','B1','fixture:v1','generation-pipeline:v1',
   'analyzing_video','analyzing_video','sent', now() - interval '2 hours'),
  ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111',
   '33333333-3333-4333-8333-333333333333','B1','fixture:v1','generation-pipeline:v1',
   'analyzing_video','analyzing_video','sent', now()),
  ('66666666-6666-4666-8666-666666666666','11111111-1111-4111-8111-111111111111',
   '33333333-3333-4333-8333-333333333333','B1','fixture:v1','generation-pipeline:v1',
   'completed','completed','sent', now() - interval '2 hours');

create temporary table expired on commit drop as
select * from public.expire_stalled_lesson_jobs(interval '15 minutes');

select is((select count(*)::int from expired), 1, 'đúng một job bị hết hạn');
select is(
  (select status::text from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'),
  'failed',
  'job kẹt lâu ở analyzing_video trở thành terminal'
);
select is(
  (select safe_error_code from public.lesson_jobs where id = '44444444-4444-4444-8444-444444444444'),
  'LESSON_GENERATION_FAILED',
  'lý do nêu đúng giai đoạn, không đổ cho transcript'
);
select is(
  (select status::text from public.lesson_jobs where id = '55555555-5555-4555-8555-555555555555'),
  'analyzing_video',
  'job vừa chạy không bị đụng tới'
);

select * from finish();
rollback;
