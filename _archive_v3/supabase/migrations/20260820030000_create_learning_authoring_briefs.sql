-- Chỗ nghỉ giữa hai lời gọi model của chuỗi soạn bài v2.
--
-- Chuỗi này gọi Gemini hai lượt, mỗi lượt khoảng 25 giây. Chạy cả hai trong một
-- step thì bị nền tảng cắt ở mốc ~30 giây: production ghi "started" rồi im hoàn
-- toàn, không kịp cả khối catch. Tách làm hai step thì mỗi bên vừa vặn.
--
-- Nhưng kết quả bước một mang lời thoại tiếng Anh của video, mà hợp đồng kiến
-- trúc cấm đưa nội dung video qua ranh giới durable giữa các step — có test canh
-- điều đó. Nên nó đi xuống đây, và bước hai đọc lại.

create table public.learning_authoring_briefs (
  job_id uuid primary key references public.lesson_jobs(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  brief jsonb not null,
  video_profile jsonb not null,
  created_at timestamptz not null default now(),
  -- `is not distinct from`, không phải `=`. Thiếu khoá thì `->>` trả NULL, và
  -- `NULL = '...'` là NULL — thứ mà CHECK chấp nhận. Dạng bằng nhau sẽ cho lọt
  -- đúng những payload nó sinh ra để chặn.
  constraint learning_authoring_briefs_version
    check ((brief ->> 'briefVersion') is not distinct from 'learning-authoring-brief:v2'),
  constraint learning_authoring_briefs_objects check (
    jsonb_typeof(brief) = 'object' and jsonb_typeof(video_profile) = 'object'
  )
);

alter table public.learning_authoring_briefs enable row level security;

-- Không cấp quyền cho trình duyệt, kể cả chủ sở hữu. Brief chứa `surfaceForm`
-- của các mục ngôn ngữ — chính là đáp án của hoạt động nhớ lại. Đọc được nó là
-- đọc được đáp án trước khi làm bài.
revoke all privileges on table public.learning_authoring_briefs
  from public, anon, authenticated;
grant select, insert, update, delete on table public.learning_authoring_briefs
  to service_role;

create or replace function public.save_learning_authoring_brief(
  p_owner_user_id uuid,
  p_job_id uuid,
  p_brief jsonb,
  p_video_profile jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.lesson_jobs
    where id = p_job_id and owner_user_id = p_owner_user_id
  ) then
    raise exception 'owned lesson job not found';
  end if;

  insert into public.learning_authoring_briefs (
    job_id, owner_user_id, brief, video_profile
  )
  values (p_job_id, p_owner_user_id, p_brief, p_video_profile)
  -- Nhắm theo tên ràng buộc chứ không liệt kê cột: một tên cột trần trong
  -- `on conflict` bị đọc theo scope của hàm trước, và chính lỗi đó đã làm hỏng
  -- mọi lần gọi save_lesson_progress lần trước.
  on conflict on constraint learning_authoring_briefs_pkey do update
  set brief = excluded.brief,
      video_profile = excluded.video_profile,
      created_at = now();
end;
$$;

revoke all privileges on function public.save_learning_authoring_brief(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_learning_authoring_brief(uuid, uuid, jsonb, jsonb)
  to service_role;
